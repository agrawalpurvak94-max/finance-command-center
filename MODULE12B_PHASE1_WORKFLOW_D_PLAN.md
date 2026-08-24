# MODULE12B_PHASE1_WORKFLOW_D_PLAN.md

Planning only. **No n8n workflow file was modified to produce this document.** Sources used: `Workflow D CC_Parser_Gemini Fallback_Expense_Processing_Production.json` (current, re-verified against the live file for this plan), `MODULE12B_N8N_AUDIT.md` (this session, verified against the same current file), `N8N_DATABASE_MAPPING.md` / `N8N_NODE_DEPENDENCY_MAP.md` (earlier session, written against an older Workflow D export — used for cross-confirmation of the underlying database-level findings, not for node architecture, which has changed substantially since they were written).

Scope: Workflow D (Statements) only, matching Phase 1's boundary. Every item below is scoped to the smallest change that satisfies its requirement — nothing here touches Workflow C, the dead/unreachable nodes (left in place, not cleaned up, per the phase rules), or the parser/routing/merchant-memory/dedupe logic that already works.

---

## 1. Statement idempotency

**Current state**: no idempotency check exists anywhere in the live path. `Get many messages` re-queries the same Gmail label on every `Schedule Trigger` firing with no processed-marker to exclude already-handled messages (§6 of the audit — this is the confirmed likely cause of the 33K→89K row growth observed mid-session).

**Two options, needs your decision** (this is the one item in this plan that touches a schema question, flagged explicitly per the phase rule):

- **Option A — no schema change.** Before creating anything, query `statement_transactions` for an existing row whose `metadata->>'message_id'` matches the current Gmail message id. If found, skip (this message was already processed). Works today, zero schema risk. Weakness: a statement that failed before any transaction was ever inserted (e.g. `CC Parser API` errored) wouldn't be caught by this check and would be retried — which is actually the _correct_ behavior for a genuine failure, but means this check alone can't distinguish "fully processed" from "attempted and errored partway."
- **Option B — small schema addition (needs separate approval).** Add `statements.source_message_id text` (nullable, mirrors `transactions.source_message_id`'s existing pattern) with a unique index on `(user_id, source_message_id)`. Check this directly before creating the parent `statements` row (§2) — a duplicate insert attempt fails fast on the unique constraint instead of relying on an indirect signal. This is the architecturally cleaner fix and reuses a pattern already proven in Workflow C.

**Recommendation**: Option B, but only with your explicit sign-off separately from this workflow plan, since it's a schema change and this phase's rule is "do not modify the Supabase schema unless explicitly approved." If you'd rather avoid any schema change this cycle, Option A is a real, working fallback — say which you want before Phase 2.

**Either way**: this is the _primary, database-level_ check. A Gmail label/marker (§10) is added as a secondary signal, not the sole mechanism, per your explicit instruction.

## 2. Parent `statements` row creation

**New node** (native `n8n-nodes-base.supabase`, same node type as the existing `Create a row`), inserted **once per email**, positioned right after `Extract Password for Bank` — the first point at which statement-level metadata (bank, card, message id) is fully assembled and before the per-transaction fan-out happens later in `Structured Transactions` / `Canonical AI Transactions`.

Proposed field mapping:

| `statements` column       | Source                                                                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                 | Config-driven, not hardcoded — see §9                                                                                                                                              |
| `account_id`, `client_id` | Left `NULL` — no deterministic resolution mechanism exists (matches the "leave ambiguous FKs NULL" principle already used elsewhere; not invented here)                            |
| `pdf_filename`            | From email attachment metadata                                                                                                                                                     |
| `statement_date`          | See §4 — same extraction/fallback chain used for `statement_month`                                                                                                                 |
| `processing_status`       | `'Processed'` (matches `vw_statement_summary`'s expected vocabulary)                                                                                                               |
| `notes`                   | If Option A (§1) is chosen, store the Gmail message id here so the idempotency check has something to query; if Option B, this stays empty and `source_message_id` is used instead |

The idempotency check (§1) runs immediately before this insert; if a match is found, this node — and everything downstream of it for this email — is skipped entirely.

## 3. Real UUID propagation into `statement_transactions.statement_id`

The new node from §2 runs once and returns its created row (including the real `id`) before the per-transaction fan-out. Every downstream node that currently builds `statementMetadata` (`Structured Transactions`, and the corrected `Canonical AI Transactions` from §5) is changed to read:

```js
statement_id: $('Create Statement Row').first().json.id
```

in place of the current synthetic construction. Since n8n lets any downstream node reference a specific earlier node by name regardless of how many items are flowing through the branch it's in, this works identically for both the native and (once fixed) Gemini-fallback paths — every transaction from one statement gets the exact same real UUID, satisfying "all N rows reference the same UUID."

## 4. Correct `statement_month` extraction

**Current state**: `statement_month` is `NULL` on all 89,308 live rows. Code trace shows `data.statement_month` (from the `cc-parser-api` response) is the only source ever read, with no fallback — if the API doesn't return that exact field/shape, the result is silently `null` forever (see `DEV_DATA_RESET_PLAN.md` §0 for the full reconciliation).

**Proposed fix**: a fallback chain, not a single field read:

```js
const statementMonth =
  data.statement_month ||
  (data.statement_period_start ? data.statement_period_start.slice(0, 7) + '-01' : null) ||
  (passwordMeta.timestamp
    ? new Date(passwordMeta.timestamp).toISOString().slice(0, 7) + '-01'
    : null)
```

This needs to be verified against a real `cc-parser-api` response in Phase 3 (TEST D3) before being treated as final — I cannot confirm the API's exact response shape from the workflow JSON alone, and won't guess further than what the code already references (`data.statement_period_start` is read elsewhere in `Structured Transactions`, so it's a reasonable first fallback, not invented).

## 5. Gemini fallback item-shape correction

**Current state** (confirmed structural bug, §6 of the audit): `Canonical AI Transactions` returns one wrapped item — `{ json: { statement_total, statement_txn_count, transactions: [...] } }` — while `Structured Transactions` returns one flat item per transaction. Both feed directly into `Attach Metadata`, which expects the flat shape. Fallback-path statements likely produce malformed output today.

**Proposed fix**: rewrite `Canonical AI Transactions`'s return statement to match `Structured Transactions`'s contract exactly — one item per transaction, each carrying the same statement-level metadata object (bank, card/account last4, account_type, and the real `statement_id` from §3):

```js
const statementMetadata = {
  statement_id: $('Create Statement Row').first().json.id,
  statement_month,
  bank_name,
  card_last4,
  account_last4,
  card_type,
  account_type /* ...same fields Structured Transactions already assembles */,
}

return mapped.map((t) => ({ json: { ...statementMetadata, ...t } }))
```

This is a same-shape mirror of the fix already proven correct in `Structured Transactions` — not a new design, just bringing the fallback path in line with the native path's existing, working contract.

## 6. Correct `statement_transactions.status` mapping

**Current state** (confirmed live, §3/§6/§7 of the audit): `Create a row`'s `status` field reads `{{ $json.category_source }}` instead of `{{ $json.status }}`. Live data shows `status` only ever contains `'merchant_memory'`/`'ai'` — the real `"processed"` value `Build Final Transaction Row` computes is silently discarded.

**Proposed fix**: one-line field mapping change in `Create a row`:

```
- "fieldValue": "={{ $json.category_source }}"
+ "fieldValue": "={{ $json.status }}"
```

`category_source` itself is untouched — it already has its own field slot in `metadata`/elsewhere and continues to mean what it means; this only stops it from _also_ overwriting `status`.

## 7. `business_personal` → correct owner/type destination

**Current state**: `Extract Password for Bank` computes `business_personal` ('Personal'/'Business' depending on the bank) and it's threaded through several nodes, but never reaches `Create a row`'s field list — silently dropped.

**Constraint check**: `statement_transactions` has **no `type`/`owner_type` column at all** (unlike `transactions`, which has `type` per Decision 1). There is no existing first-class column to map this into, and you've explicitly ruled out adding one.

**Proposed fix**: preserve the value inside the existing `metadata` jsonb column (already storing `message_id`, `parser`, etc.) — add `business_personal: j.business_personal` to the object `Build Final Transaction Row` already builds for `metadata`. This satisfies "preserve it" without adding a column: the value is captured and queryable (`metadata->>'business_personal'`), just not a first-class filterable column the way `transactions.type` is. Flagging this tradeoff explicitly rather than presenting it as full parity with Workflow C.

## 8. Canonical category lookup + validation

Two parts — one mandatory for Phase 2, one recommended but separable given the 4-day timeline:

**Mandatory: a validation gate.** After both `Normalize AI Category Output` (AI path) and `Apply Category Hint` (parser-hint path) — the two places a category value is decided before reaching `Build Final Transaction Row` — add a check against the live `categories` table (a lightweight `SELECT name FROM categories` lookup, or an n8n `Code` node fed by one such query cached earlier in the run) that substitutes `'Other'` (an existing canonical category — confirmed in the live 24) whenever the returned value doesn't match. This directly satisfies TEST D5 ("invalid category cannot reach the database") and closes the gap for _both_ categorization sources, not just the AI one — the parser-supplied `category_hint` path has never been validated either and is an equally plausible source of an off-vocabulary value.

**Recommended, separable: dynamic sourcing.** Point `AI Categorize1`'s prompt at the live `categories` table at runtime (mirroring the dead-but-correct `Load categories` → `Claude Haiku categorize` pattern already present, unused, in Workflow C) instead of its current static 32-value list — this is the structural fix that prevents the vocabulary from drifting again, rather than just catching drift after the fact. Given the 4-day priority note explicitly deprioritizes "speculative architecture," I'm marking this as recommended-but-deferrable: the validation gate alone already satisfies the hard requirement (no invalid category reaches the database); dynamic sourcing is the more durable fix but can follow after handover if time is tight. Your call on whether to include it in Phase 2's scope.

## 9. Removal of hardcoded development user UUID

**Current state**: the same dev UUID is hardcoded live in three places — `Build Final Transaction Row`, `Merchant Lookup RPC`, `Save Merchant Memory`.

**Proposed fix**: replace all three with an n8n environment-variable reference, e.g. `{{ $env.APP_OWNER_USER_ID }}`, set once in the n8n instance's environment configuration (outside the workflow JSON — exactly the "swap without touching workflow logic" property Phase 7 needs to formalize for handover). No workflow-logic change beyond the literal substitution in these three places.

## 10. Processed-message / Gmail completion marker

**Proposed addition**: two new nodes at the end of the success path (after `Create a row`, mirroring Workflow C's existing `Remove label from message` → `Add label to thread` pattern) that mark the Gmail message as handled. This is explicitly the **secondary** signal — §1's database-level check is primary and authoritative; the label is a visual/operational aid and a second line of defense, matching your instruction not to rely on the label alone.

## 11. Preservation — explicitly not touched

None of the following are modified by this plan: `CC Parser API`, `Classify Parser Response`, `Classify Connection Failure`, `Evaluate Parse Quality`, `Route Native / Fallback / Error`, `Normalize Merchant`, `Merchant Lookup RPC`, `Enrich Transaction`, `IF Merchant Known`, `Category Hint Check`, `Apply Category Hint`, `Save Merchant Memory` (RPC mechanism itself — only the hardcoded UUID inside it changes, per §9), `Validate Final Transaction`, `Validate Final Transaction Gate`, `Test Mode Config` / `TEST_MODE Check`. The 17 dead/unreachable nodes identified in the audit are left exactly as they are — no cleanup, per the phase rules.

---

## Summary of nodes touched in Phase 2 (if approved)

| Node                                                  | Change                                                                                   |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| _(new)_ `Create Statement Row`                        | Added — parent `statements` insert, §2                                                   |
| _(new)_ idempotency check node(s)                     | Added — §1                                                                               |
| `Structured Transactions`                             | `statement_id`/`statement_month` sourcing changed, §3/§4                                 |
| `Canonical AI Transactions`                           | Rewritten to flat-item-per-transaction shape + statement metadata, §5                    |
| `Create a row`                                        | `status` field mapping fixed (§6); `statement_id` now real UUID (§3)                     |
| `Build Final Transaction Row`                         | `user_id` de-hardcoded (§9); `metadata.business_personal` added (§7)                     |
| `Merchant Lookup RPC`, `Save Merchant Memory`         | `p_user_id` de-hardcoded, §9                                                             |
| `Normalize AI Category Output`, `Apply Category Hint` | Category validation gate added, §8                                                       |
| `AI Categorize1`                                      | Unchanged unless you approve the recommended (not mandatory) dynamic-sourcing option, §8 |
| _(new)_ Gmail label nodes                             | Added — §10                                                                              |

Every other node in Workflow D's 56 — including all 17 dead ones — is unchanged.

## Decisions needed from you before Phase 2 can begin

1. **§1**: Option A (no schema change, `metadata`-based check) or Option B (add `statements.source_message_id` + unique index)?
2. **§8**: mandatory validation gate only, or also include dynamic category-vocabulary sourcing in Phase 2's scope?

---

**Stopping here, per instruction.** No n8n workflow was modified. No database change was made. Waiting for your explicit approval — and answers to the two decisions above — before Phase 2 begins.
