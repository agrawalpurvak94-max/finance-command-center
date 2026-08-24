# MODULE12B_PHASE2_WORKFLOW_D_NODE_PLAN.md

Detailed node-by-node implementation plan for Phase 2, reflecting your two decisions. **You are implementing these changes manually in the self-hosted n8n editor — no n8n JSON file is modified by this document, and none will be, per your instruction.** This supersedes `MODULE12B_PHASE1_WORKFLOW_D_PLAN.md`'s node-insertion sketch where the two differ (the idempotency lookup now runs earlier than originally sketched — see item 1).

Once you've made these changes in the editor, tell me and I'll treat the live workflow as authoritative for Phase 3 testing — I will not attempt to reconcile it against the old JSON export.

---

## SQL migration (Decision 1) — exact SQL, NOT executed

```sql
-- ============================================================================
-- Module 12B — statements.source_message_id (Decision 1, Option B)
-- STATUS: NOT EXECUTED. Provided for review only — stop for separate
-- explicit approval before this is run against the live database.
-- ============================================================================

BEGIN;

ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS source_message_id text;

COMMENT ON COLUMN public.statements.source_message_id IS
  'Gmail message id of the statement email that created this row. Nullable — manually-created statements (future Statements-module UI) have no Gmail origin. Authoritative statement-level idempotency key for Workflow D: looked up as (user_id, source_message_id) before creating a new row, per Module 12B Decision 1.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_statements_user_source_message
  ON public.statements (user_id, source_message_id);

COMMIT;

-- ============================================================================
-- Notes (not part of the executable migration):
-- - Postgres treats NULL as distinct from every other NULL in a UNIQUE index,
--   so multiple manually-created statements with no source_message_id will
--   never collide with each other or with Gmail-sourced ones — only two rows
--   that both have the SAME non-null (user_id, source_message_id) pair are
--   rejected, which is exactly the intended protection.
-- - No backfill needed/attempted: 0 live `statements` rows exist post-reset
--   (see DEV_DATA_RESET_VERIFICATION.md), so this ADD COLUMN has nothing to
--   backfill.
-- - Reversible: `DROP INDEX IF EXISTS uq_statements_user_source_message;
--   ALTER TABLE public.statements DROP COLUMN IF EXISTS source_message_id;`
-- ============================================================================
```

**Not executed.** Tell me explicitly when you want this run — it will not be run as a side effect of anything else in this plan.

---

## Node-by-node plan

### 1. Idempotency lookup

**Node name**: _(new)_ `Check Statement Processed`
**Current behaviour**: does not exist.
**New behaviour**: queries `public.statements` for an existing row matching this email's Gmail message id, for this user. Runs as early as possible — immediately after `Extract Email Metadata`, before `Extract Password for Bank` — so an already-processed message never even reaches password lookup or the `CC Parser API` call (cheaper, not just correct).
**Exact fields/expressions**: Supabase node (same node type as `Create a row`), operation "Get rows" (or equivalent list/select operation), table `statements`, filters:

- `user_id` = `{{ $env.APP_OWNER_USER_ID }}` (see item 11 — same config source used everywhere else)
- `source_message_id` = `{{ $json.message_id }}`
- limit 1

If your n8n version's native Supabase node doesn't expose a clean compound-filter UI for this, the equivalent as an `httpRequest` GET is: `GET /rest/v1/statements?select=id&user_id=eq.{{...}}&source_message_id=eq.{{$json.message_id}}&limit=1`, same header/credential pattern as every other Supabase `httpRequest` node in this workflow.
**Where output must connect**: → _(new)_ `IF Statement Already Processed` (item below).
**Dependencies on earlier nodes**: `Extract Email Metadata` (needs `$json.message_id`).
**Expected output shape**: either an empty result set (not processed yet) or one row `{ id: <uuid>, ... }` (already processed).

**Node name**: _(new)_ `IF Statement Already Processed`
**Current behaviour**: does not exist.
**New behaviour**: branches on whether `Check Statement Processed` returned a row.
**Exact fields/expressions**: `IF` node, condition: array/response length `> 0` (exact expression depends on whether you used the native node or `httpRequest` — for `httpRequest` with `neverError`/`fullResponse` off, `{{ $json.length > 0 }}` against the returned array; for the native Supabase node, check its own "no rows found" output shape in your editor).
**Where output must connect**:

- **[true, already processed]** → skip straight to the Gmail label-transition nodes (item 13) using the _existing_ message id/thread id already in context — mark it processed the same way a fresh success would be marked, then stop. Do **not** re-run password extraction, parsing, or any insert.
- **[false, not yet processed]** → `Extract Password for Bank` (continues the existing flow unchanged).
  **Dependencies**: `Check Statement Processed`.
  **Expected output shape**: passthrough of whatever was on `$json` before the branch (no data transformation, pure routing).

---

### 2. Parent `statements` creation

**Node name**: _(new)_ `Create Statement Row`
**Current behaviour**: does not exist — no node in the live workflow writes to `statements` (§2 of `MODULE12B_N8N_AUDIT.md`).
**New behaviour**: inserts exactly one `statements` row per email, only on the "not yet processed" branch, positioned after `Extract Password for Bank` (where bank/card metadata is first fully assembled).
**Exact fields/expressions**: Supabase node, operation "Create row", table `statements`:

| Column                                                                                                                                                                                                                        | Expression                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                                                                                                                                                                                                                     | `{{ $env.APP_OWNER_USER_ID }}`                                                                                                                                                                                                                                                                                                          |
| `source_message_id`                                                                                                                                                                                                           | `{{ $json.message_id }}`                                                                                                                                                                                                                                                                                                                |
| `account_id`, `client_id`                                                                                                                                                                                                     | _(omit — leave column default/NULL; no deterministic resolution exists)_                                                                                                                                                                                                                                                                |
| `pdf_filename`                                                                                                                                                                                                                | `{{ $binary.attachment_0.fileName }}` (same binary reference `CC Parser API` already uses)                                                                                                                                                                                                                                              |
| `statement_date`                                                                                                                                                                                                              | `{{ $json.statement_month_derived }}` — see item 4, this must run _before_ this node so the value exists here; if sequencing makes that awkward, use `{{ $json.timestamp.slice(0,10) }}` (email receipt date) as the simpler interim value and let `statement_month` (item 4, computed later per-transaction) be the more precise field |
| `processing_status`                                                                                                                                                                                                           | `'Processed'` (literal)                                                                                                                                                                                                                                                                                                                 |
| **Where output must connect**: → `Prepare Parser Request` / `Code in JavaScript1` (i.e., exactly where `Extract Password for Bank`'s output already goes today — this node is inserted _between_ them, not replacing either). |
| **Dependencies**: `Extract Password for Bank` (needs `bank_name`, binary attachment); `IF Statement Already Processed`'s false branch.                                                                                        |
| **Expected output shape**: the created row, including the real `id` (uuid) — this is what item 3 reads.                                                                                                                       |

---

### 3. Real statement UUID capture

**Node name**: _(no new node — a reference pattern used in several existing nodes)_
**Current behaviour**: `Structured Transactions` computes `statementId = messageId && statementMonth ? ... : null` (synthetic string). `Canonical AI Transactions` never sets `statement_id` at all.
**New behaviour**: both nodes read the real UUID from `Create Statement Row` by name, regardless of how many items are flowing through their own branch:

```js
statement_id: $('Create Statement Row').first().json.id,
```

**Exact fields/expressions**: replace the `statementId` local variable/computation in `Structured Transactions` with the line above; add the same line to `Canonical AI Transactions`'s per-transaction object (see item 5, since that node's whole shape is being corrected anyway).
**Where output must connect**: no connection change — this is a field-value change inside nodes whose wiring is untouched.
**Dependencies**: `Create Statement Row` must have already executed earlier in the same run (guaranteed by the linear flow — it runs once per email, before the per-transaction fan-out).
**Expected output shape**: every transaction item, from either path, now carries the same real `statement_id` uuid.

---

### 4. `statement_month` fallback chain

**Node name**: `Structured Transactions` (existing — modify only the `statementMonth` line)
**Current behaviour**: `const statementMonth = data.statement_month || null;` — always null in practice (confirmed live, `DEV_DATA_RESET_PLAN.md` §0).
**New behaviour**: fallback chain instead of a single field read:

```js
const statementMonth =
  data.statement_month ||
  (data.statement_period_start ? data.statement_period_start.slice(0, 7) + '-01' : null) ||
  (passwordMeta.timestamp
    ? new Date(passwordMeta.timestamp).toISOString().slice(0, 7) + '-01'
    : null)
```

**Exact fields/expressions**: as above, replacing the single-line assignment. `passwordMeta` is already an in-scope local (`$('Extract Password for Bank').first().json`).
**Where output must connect**: no wiring change.
**Dependencies**: none beyond what `Structured Transactions` already reads.
**Expected output shape**: `statement_month` should be non-null whenever _either_ the parser returns `statement_month` directly, `statement_period_start`, or (worst case) the email's own timestamp is available — verify which branch actually fires against a real statement in Phase 3 (TEST D3), since I cannot confirm `cc-parser-api`'s exact response shape from the workflow JSON alone.

---

### 5. Gemini fallback: one item per transaction

**Node name**: `Canonical AI Transactions` (existing — full rewrite of the return statement, per §6/§11.10 of the audit and Phase 1 plan)
**Current behaviour**: returns a single item `{ json: { statement_total, statement_txn_count, transactions: [...] } }` — incompatible with `Attach Metadata`, which expects one flat item per transaction (confirmed structural bug).
**New behaviour**: mirrors `Structured Transactions`'s contract exactly — build the same `statementMetadata` object (now including the real `statement_id`, item 3) and return one item per transaction.
**Exact fields/expressions**:

```js
const messageId = $('Extract Password for Bank').item.json.message_id;
const passwordMeta = $('Extract Password for Bank').item.json;
const txns = $json.transactions || [];
const fallbackReason = ($('Evaluate Parse Quality').item.json.fallback_reason) || null;

const statementMetadata = {
  statement_id: $('Create Statement Row').first().json.id,
  statement_month: /* same fallback chain as item 4, reading from $json / passwordMeta as available on this path */,
  bank_name: passwordMeta.bank_name || null,
  card_last4: passwordMeta.card_last4 || null,
  account_last4: passwordMeta.account_last4 || null,
  card_type: passwordMeta.card_type || null,
  account_type: passwordMeta.account_type || 'Credit Card',
  source_file: passwordMeta.subject || null,
};

const mapped = txns.map(t => ({
  json: {
    ...statementMetadata,
    transaction_date: t.transaction_date,
    message_id: messageId,
    merchant: t.merchant || t.description || '',
    description: t.description || t.merchant || '',
    amount: t.amount,
    debit_credit: t.debit_credit,
    transaction_type: t.transaction_type || (t.row_type === 'payment_refund' ? 'payment_refund' : null),
    reference_number: t.reference_number || null,
    reward_points: t.reward_points ?? null,
    person: t.person ?? null,
    credit_reasons: t.credit_reasons ?? null,
    time: t.time ?? null,
    card_number: t.card_last4 ?? null,
    category_hint: null,
    extraction_method: 'ai_fallback',
    parse_quality_status: $json.ai_validation_status || 'pass',
    fallback_reason: fallbackReason,
  },
}));

return mapped;
```

**Where output must connect**: unchanged — still `Canonical AI Transactions → Attach Metadata`. The fix is entirely in what shape reaches that existing connection, not the wiring.
**Dependencies**: `Create Statement Row` (real UUID), `Evaluate Parse Quality` (fallback_reason), `Extract Password for Bank` (statement-level metadata) — all already-available upstream nodes, same referencing pattern `Structured Transactions` already uses.
**Expected output shape**: N flat items, each identical in shape to what `Structured Transactions` produces — verify field-for-field parity once both paths can be compared against real data (TEST D4).

---

### 6. `statement_transactions.statement_id` propagation

Covered by items 3 and 5 above — by the time items reach `Attach Metadata`, both paths carry a real `statement_id`. **No change needed in `Attach Metadata` itself** — it already does `statement_id: txn.statement_id ?? null`, which now receives a real value from both upstream paths instead of only the (previously broken) native path.

---

### 7. `status` vs. `category_source` correction

**Node name**: `Create a row` (existing — one field mapping change)
**Current behaviour**: `"fieldId": "status", "fieldValue": "={{ $json.category_source }}"`.
**New behaviour**: reads the real status value `Build Final Transaction Row` already computes.
**Exact fields/expressions**:

```
"fieldId": "status", "fieldValue": "={{ $json.status }}"
```

`category_source`'s own field mapping is untouched — it's a separate `fieldId` in the same node and continues unchanged.
**Where output must connect**: no wiring change.
**Dependencies**: `Build Final Transaction Row` already sets `status: "processed"` on every item reaching this node.
**Expected output shape**: `statement_transactions.status` will read `'processed'` for every new row (vs. `'merchant_memory'`/`'ai'` today).

---

### 8. `business_personal` preservation

**Node name**: `Build Final Transaction Row` (existing — add one field inside the `metadata` object it already builds)
**Current behaviour**: `business_personal` is computed in `Extract Password for Bank` and threaded through `Attach Metadata`, but never appears in `Build Final Transaction Row`'s output or `Create a row`'s field list — silently dropped.
**New behaviour**: added to the existing `metadata` jsonb object (no new top-level column, per your explicit "do not add an owner_type column" rule).
**Exact fields/expressions**: inside the existing `metadata: { message_id: ..., email_subject: ..., merchant_id: ..., parser: ..., extraction_method: ..., parse_quality_status: ..., fallback_reason: ..., parser_version: "v3" }` object, add:

```js
business_personal: j.business_personal || null,
```

**Where output must connect**: no wiring change.
**Dependencies**: `j.business_personal` must survive from `Extract Password for Bank` through to this node — confirmed it already does (threaded through `Attach Metadata`'s explicit preservation block).
**Expected output shape**: `statement_transactions.metadata->>'business_personal'` becomes queryable (`'Personal'`/`'Business'`) going forward; not a first-class column, disclosed tradeoff per Phase 1's plan.

---

### 9. Canonical category loading

**Node name**: _(new)_ `Load Categories`
**Current behaviour**: does not exist on the live path (a dead node of the same _concept_, `Load categories`, exists in Workflow C but is unreachable there too).
**New behaviour**: queries the live `categories` table once per statement run (not once per transaction — cache it), returning the canonical name list for use by both the AI categorizer prompt and the validation gate (item 10).
**Exact fields/expressions**: Supabase node or `httpRequest` GET, mirroring the dead `Load categories` node's own working query: `GET /rest/v1/categories?select=name&status=eq.active&or=(user_id.is.null,user_id.eq.{{$env.APP_OWNER_USER_ID}})`.
**Where output must connect**: positioned early (e.g. in parallel with `Extract Password for Bank`, or right before `Category Hint Check`/`AI Categorize1` — whichever is simpler to wire without disturbing the existing merchant-lookup branch order). Its output must be reachable by name (`$('Load Categories')...`) from both `AI Categorize1`'s prompt-building step and the new validation gate (item 10).
**Dependencies**: none beyond the workflow's existing Supabase credential.
**Expected output shape**: an array of `{ name: string }` rows — the current 24 canonical categories.

---

### 10. Category validation gate

**Node name**: modify `Normalize AI Category Output` (AI path) and `Apply Category Hint` (parser-hint path) — both need the same check added, per Phase 1's plan (mandatory regardless of the dynamic-sourcing decision, and now doubly necessary since Decision 2 also wants dynamic sourcing feeding the same prompt).
**Current behaviour**: both write whatever category string they produced straight through, unvalidated.
**New behaviour**: after computing `category`, check it against `Load Categories`'s output; if not found, substitute `'Other'`.
**Exact fields/expressions** (added to both nodes, same snippet):

```js
const canonical = new Set(
  $('Load Categories')
    .first()
    .json.map((c) => c.name) /* adjust path if the native node wraps rows differently */,
)
const resolvedCategory = canonical.has(category) ? category : 'Other'
```

then use `resolvedCategory` in place of the previously-unvalidated `category` in each node's existing return object.
**Where output must connect**: no wiring change in either node.
**Dependencies**: `Load Categories` (item 9) must have already run.
**Expected output shape**: `category` on every item reaching `Build Final Transaction Row` is guaranteed to be one of the live canonical names — directly satisfies TEST D5.

---

### Decision 2 — dynamic `AI Categorize1` prompt (included per your instruction, not deferred)

**Node name**: `AI Categorize1` (existing — prompt body changed from a static enum to a dynamically-built one)
**Current behaviour**: hardcoded 32-value list embedded as prompt text (confirmed in the audit, still present and unchanged as of this session).
**New behaviour**: the category list sentence is built from `Load Categories`'s live output instead of a literal string.
**Exact fields/expressions**: replace the static line

```
"Choose ONLY one of these categories:\nGroceries, Dining, Food Delivery, ... Other."
```

with an n8n expression that joins the live list, e.g.:

```
"Choose ONLY one of these categories:\n{{ $('Load Categories').first().json.map(c => c.name).join(', ') }}."
```

(exact expression syntax to confirm in the editor depends on how the native/httpRequest node in item 9 shapes its output — a `Code` node between `Load Categories` and `AI Categorize1` to pre-format the joined string is a reasonable, simpler alternative if inline expression mapping over an array proves awkward in the HTTP node's JSON body field).
**Where output must connect**: no wiring change.
**Dependencies**: `Load Categories` (item 9).
**Expected output shape**: same Gemini JSON response shape as today (`display_name`, `category`, `confidence`) — only the _set of values the model is told to choose from_ changes, and item 10's validation gate remains as the hard backstop regardless (an LLM given a list in a text prompt can still hallucinate outside it, unlike Workflow C's schema-enforced enum — this is exactly why item 10 is mandatory even with dynamic sourcing).

---

### 11. Development UUID removal

**Node names**: `Create Statement Row` (item 2, already specified with `$env.APP_OWNER_USER_ID`), `Build Final Transaction Row`, `Merchant Lookup RPC`, `Save Merchant Memory`, and the new `Check Statement Processed` (item 1) / `Load Categories` (item 9) nodes.
**Current behaviour**: `Build Final Transaction Row`, `Merchant Lookup RPC`, and `Save Merchant Memory` each hardcode the same literal dev UUID.
**New behaviour**: every one of these reads from a single n8n environment variable instead.
**Exact fields/expressions**: replace every literal `"2f324f4d-1dc3-4ec5-8c23-93da480842c7"` (as a bare string) or `user_id: '...'` (in JS) with:

- In JSON body/query-parameter fields: `={{ $env.APP_OWNER_USER_ID }}`
- In JS code nodes: `$env.APP_OWNER_USER_ID` (no `={{ }}` wrapper needed inside a `jsCode` block — it's already JS)

You'll need to set `APP_OWNER_USER_ID` once in your n8n instance's environment variables (Settings → Environment, or however your self-hosted instance exposes it) to the same dev UUID for now — the value doesn't change today, only _where it lives_ changes, which is what makes it swappable for a client deployment later without touching workflow logic.
**Where output must connect**: no wiring changes anywhere in this item.
**Dependencies**: none.
**Expected output shape**: unchanged behavior today (same UUID, same value) — the difference only matters when this workflow is pointed at a different Supabase project/user later.

---

### 12. Bank password / API credential removal from code

**Node name**: `Extract Password for Bank` (existing — remove the hardcoded `bankData` object's `password` values; `AI Categorize1` — remove the hardcoded query-parameter API key).
**Current behaviour**: plaintext bank PDF passwords hardcoded in the `bankData` JS object; a raw Gemini API key hardcoded as `AI Categorize1`'s `key` query parameter, redundant with its own unused `googlePalmApi` credential binding.
**New behaviour**:

- `Extract Password for Bank`: replace each bank's hardcoded `password: '...'` with a reference to an n8n credential holding that bank's password (e.g. one n8n "HTTP Header Auth"-style or generic credential per bank, or a single structured credential holding a bank→password map, referenced via `$credentials` rather than a literal in `jsCode`). Exact mechanism depends on what credential types your self-hosted n8n instance has available — a simple, safe minimum is one n8n **credential** per configured bank (`YES_Bank_PDF_Password`, `AU_Small_Finance_PDF_Password`), each holding just the password string, referenced in this node instead of the literal.
- `AI Categorize1`: remove the `key` query parameter entirely and rely on the node's existing `nodeCredentialType: "googlePalmApi"` binding, which n8n will use automatically once the query-string override is gone — this is a **deletion**, not a replacement, since the correct mechanism is already configured and just being bypassed today.
  **Where output must connect**: no wiring changes.
  **Dependencies**: you'll need to create the bank-password credential(s) in the n8n editor before removing the literals, so the node doesn't break mid-edit.
  **Expected output shape**: unchanged functional behavior; the passwords/key are simply no longer visible in the workflow JSON export.

---

### 13. Successful Gmail label transition

**Node names**: _(new)_ `Remove Input Label`, _(new)_ `Add Processed Label` — mirroring Workflow C's existing `Remove label from message` / `Add label to thread` nodes exactly (same node type `n8n-nodes-base.gmail`, same `removeLabels`/`addLabels` operations, same `gmailOAuth2` credential).
**Current behaviour**: no label transition exists anywhere in Workflow D's live path; `Get many messages` filters on a single label with no removal step, so the same message stays eligible for reprocessing on every scheduled run (§6/§11.9 of the audit — the likely root cause of the 33K→89K growth).
**New behaviour**: on successful completion (after `Create a row` for a freshly-processed statement, or immediately on the `IF Statement Already Processed` "true" branch for one that's merely being re-marked), remove the input label and add a processed label.
**Exact fields/expressions**, mirroring Workflow C's nodes precisely:

```
Remove Input Label:  operation "removeLabels", messageId: {{ $json.message_id }}, labelIds: [<your input label id>]
Add Processed Label: resource "thread", operation "addLabels", threadId: {{ $json.threadId }}, labelIds: [<your processed label id>]
```

You'll need the input label's id (the same one `Get many messages` already filters on) and a new "processed" label's id from your Gmail label configuration — create the processed label in Gmail first if it doesn't already exist.
**Where output must connect**: both branches of `IF Statement Already Processed` converge here (success path and already-processed path both end by confirming the label state is correct); this is the final step of the run for a given message.
**Dependencies**: `Check Statement Processed` / `Create a row`, depending on which branch.
**Expected output shape**: no data transformation — pure Gmail side-effect, matching Workflow C's existing terminal nodes exactly.

---

### 14. Processed-message handling as an additional secondary guard

**Assessment: not required as a separate mechanism.** Item 1 (database-level, authoritative per Decision 1) and item 13 (Gmail label, explicitly secondary per your instruction) already form the two-layer guard you specified. The dead `Log to ProcessedLog`/`Write ProcessedLog` (Google Sheets) nodes are a _third_, redundant mechanism from an earlier iteration — per the phase rule against unrelated cleanup, I'm not proposing to revive, modify, or remove them; they simply stay dead and unused, which is already their current state. If you want a third guard specifically, say so and I'll scope it separately — my recommendation is that two layers (DB unique constraint + Gmail label) is sufficient and matches exactly what you asked for.

---

## Summary — every node touched, in one place

| #   | Node                                                                                                                                                 | New / Modified                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | `Check Statement Processed`                                                                                                                          | New                                         |
| 1   | `IF Statement Already Processed`                                                                                                                     | New                                         |
| 2   | `Create Statement Row`                                                                                                                               | New                                         |
| 3   | `Structured Transactions`                                                                                                                            | Modified (statement_id line)                |
| 3   | `Canonical AI Transactions`                                                                                                                          | Modified (full rewrite, also covers item 5) |
| 4   | `Structured Transactions`                                                                                                                            | Modified (statement_month fallback chain)   |
| 7   | `Create a row`                                                                                                                                       | Modified (one field mapping)                |
| 8   | `Build Final Transaction Row`                                                                                                                        | Modified (metadata.business_personal)       |
| 9   | `Load Categories`                                                                                                                                    | New                                         |
| 10  | `Normalize AI Category Output`                                                                                                                       | Modified (validation gate)                  |
| 10  | `Apply Category Hint`                                                                                                                                | Modified (validation gate)                  |
| D2  | `AI Categorize1`                                                                                                                                     | Modified (dynamic prompt)                   |
| 11  | `Build Final Transaction Row`, `Merchant Lookup RPC`, `Save Merchant Memory`, `Create Statement Row`, `Check Statement Processed`, `Load Categories` | Modified/new (env var instead of literal)   |
| 12  | `Extract Password for Bank`, `AI Categorize1`                                                                                                        | Modified (credentials instead of literals)  |
| 13  | `Remove Input Label`, `Add Processed Label`                                                                                                          | New                                         |

Every other node in Workflow D — all 39 currently-live ones not listed above, and all 17 dead ones — is unchanged, per the phase rules.

---

**Stopping here, per instruction.** No n8n JSON was modified. No SQL was executed. Waiting for your approval before you begin making these changes manually in the n8n editor, and for a separate explicit go-ahead before the `statements.source_message_id` migration is run.
