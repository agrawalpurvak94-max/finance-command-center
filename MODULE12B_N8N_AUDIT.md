# MODULE12B_N8N_AUDIT.md

Read-only, node-by-node audit of the two **current** n8n workflow files, verified fresh against the actual JSON — not assumed from any prior session's documentation, per instruction. No n8n workflow, database, or repository changes were made to produce this report.

**Source files** (both at repo root, both untracked/never committed — contain live secrets):

- `19th Aug Workflow C Parser - Experimentation.json` — 47 nodes
- `Workflow D CC_Parser_Gemini Fallback_Expense_Processing_Production.json` — 56 nodes

**Method**: every node's parameters were extracted programmatically with secrets redacted, then read individually. The workflow's `connections` graph was analyzed for reachability from each trigger node — this surfaced that **large portions of both files are dead/orphaned nodes not connected to any trigger**, which earlier documentation (written before this session) did not account for. All findings below distinguish **live** (reachable, currently executing) from **dead** (present in the file, not reachable, not executing).

---

## ⚠️ Security note (read first)

Two real credentials were briefly displayed in my own tool output while building the extraction tooling, before the redaction script was hardened mid-task: a **bank PDF password** (`Extract Password for Bank` node, Workflow D) and a **Google/Gemini API key** (`AI Categorize1` node's query parameter, Workflow D). Neither is repeated anywhere in this report or in my summary to you. All further extraction in this session used a corrected redaction pass verified to catch both patterns (JWTs/bearer tokens **and** secrets embedded as `key: "value"` pairs inside code strings or n8n's `{name, value}` parameter idiom — a category the first-pass script missed). You may want to rotate that PDF password and Gemini key out of caution, since they existed in a workflow-diff-formatted transcript at least momentarily; that decision is yours, not something I've acted on.

---

## 1. Workflow C architecture (Transactions / banking email processing)

**Trigger**: `1. Gmail Trigger` (Gmail push trigger, live).

**Live path (27 of 47 nodes reachable)**:

```
1. Gmail Trigger → Build Context → Normalize Email → Bank Detection → Fast Parser → IF Parsed
  ├─ [parsed=true]  → Prepare Dedupe
  └─ [parsed=false] → Build Gemini Request → Gemini Extraction → Normalize Gemini Output → Prepare Dedupe

Prepare Dedupe → Dedupe check → Restore Dedupe Context → IF Duplicate
  └─ [not duplicate] → Normalize Merchant → Lookup Merchant Memory ↘
                                                                     Preserve Merchant Context → IF Merchant Known
       ├─ [known]   → Merge Categorized Transaction.
       └─ [unknown] → AI Categorize → Normalize AI Category Output → Save Merchant Memory
                                                                    ↘ Preserve Saved Merchant Context → Merge Categorized Transaction.

Merge Categorized Transaction. → Build Final Transaction Row → Confidence & Status → Save Transactions
  → Remove label from message → Add label to thread
```

(`[duplicate]` branch of `IF Duplicate` has no outgoing edge — a detected duplicate simply stops, which is correct/intentional.)

**Dead/unreachable nodes (20 of 47)**: `Parse HDFC (regex)`, `IF parsed`, `IF new (not duplicate)`, `Load categories`, `Claude Haiku categorize`, `Build row (from AI)`, `Supabase Insert (transactions)`, `Code in JavaScript`, `Merchanet Rules`, `If1`, `Merge` (also explicitly `disabled: true`), `HTTP Request`, `Get many messages`, `Get a message`, `Validate Message Input`, `Fetch Gmail RAW`, `Parse Gmail MIME`, `Clean Email Text`, `Restore Gmail Context`.

**This is a significant correction to prior documentation**, which described Workflow C as having _three_ live categorization mechanisms (keyword rules via "Merchanet Rules", dynamic-category lookup via "Claude Haiku categorize", and hardcoded-Gemini via "AI Categorize"). **Only one is actually live today**: the hardcoded-enum "AI Categorize" Gemini node. The keyword-rules fast path and the dynamic-category-lookup fast path are both dead code, along with an entirely separate old insert mechanism (`Build row (from AI)` → `Supabase Insert (transactions)`) that duplicated what `Save Transactions` now does.

---

## 2. Workflow D architecture (Statements / credit-card statement processing)

**Triggers**: `Gmail - Watch Banking Label` (present, **zero outgoing connections — orphaned, not actually driving anything**) and `Schedule Trigger` (live, the actual entry point). Statement processing is polling-based, not push-based, despite the Gmail-trigger node's name suggesting otherwise.

**Live path (39 of 56 nodes reachable)**:

```
Schedule Trigger → Get many messages (Gmail label search, limit:1/run, downloads attachments)
  → Extract Email Metadata (bank detection via weighted sender/subject/snippet regex registry, 12 banks known)
  → Extract Password for Bank (bank-specific PDF password + card metadata; only 2 of the 12 detectable banks have a password configured — every other bank throws and the item fails)
  ├─ Code in JavaScript1 → Merge Statement + PDF → Split Out   [DEAD END — see §6, writes nothing]
  └─ Prepare Parser Request → CC Parser API (external microservice, http://cc-parser-api:8000/parse)
       ├─ [HTTP 200]           → Classify Parser Response ↘
       └─ [connection failure] → Classify Connection Failure ↘
                                                              Evaluate Parse Quality → Route Native / Fallback / Error
            ├─ [native]   → Structured Transactions ────────────────────┐
            ├─ [fallback] → Gemini Statement Normalization              │
            │                 → Parse Gemini JSON → Validate AI Output  │
            │                 → AI Validation Gate                     │
            │                    ├─ [valid]   → Canonical AI Transactions ┤ (shape mismatch — see §6)
            │                    └─ [invalid] → Flag For Review           │
            └─ [error]    → Flag For Review                               │
                                                                            ▼
                                                                    Attach Metadata
                                                                            ↓
                                                        Normalize Merchant → Merchant Lookup RPC (lookup_merchant, hardcoded p_user_id)
                                                                            ↓
                                                                     Enrich Transaction → IF Merchant Known
            ├─ [known]    → Build Final Transaction Row
            └─ [unknown]  → Category Hint Check
                 ├─ [has parser category_hint] → Apply Category Hint → Build Final Transaction Row
                 └─ [no hint]                  → AI Categorize1 (Gemini, 32-value soft-prompt)
                                                    → Normalize AI Category Output
                                                    → Save Merchant Memory (upsert_merchant_memory RPC, hardcoded p_user_id)
                                                    → Preserve Saved Merchant Context → Build Final Transaction Row

Build Final Transaction Row (hardcodes user_id) → Validate Final Transaction → Validate Final Transaction Gate
  ├─ [pass] → Test Mode Config → TEST_MODE Check
  │              ├─ [test mode on]  → Test Mode - Row Preview  [no DB write]
  │              └─ [test mode off] → Create a row  (n8n-nodes-base.supabase → statement_transactions)
  └─ [fail] → Flag For Review
```

**Dead/unreachable nodes (17 of 56)**: `AI Categorize` (the OLD hardcoded 19-value Gemini enum — same one Workflow C still uses live — now dead here), `Anthropic Chat Model`, `Append to Transactions`, `Build Merchant Cache`, `Build Statement Metadata`, `Build Statement Row`, `Load Merchant Memory`, `Log to ProcessedLog`, `Lookup Merchant Cache`, `Loop Over Items`, `Merge`, `Merge Categorized Transaction.`, `Merge1`, `Preserving Transactions`, `Success - Complete`, `Wait`, `Write ProcessedLog` (also explicitly `disabled: true`).

This is a **major correction to prior documentation**: the earlier described architecture (PDF.co, Google Sheets output, a merchant-caching subsystem, statement-metadata-row construction) is now entirely dead code, replaced by a self-hosted `cc-parser-api` microservice, a three-way native/fallback/error router, and a direct native Supabase-node write. None of this matches what was documented before this session.

---

## 3. Node-by-node database mapping

### Workflow C → `transactions` (via `Save Transactions`, `POST /rest/v1/transactions`)

| Column written                           | Source                                                                                                                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                                | **Hardcoded** to the dev UUID, in `Build Final Transaction Row`                                                                                                                         |
| `source_message_id`                      | Gmail message id, threaded through from `Build Context`                                                                                                                                 |
| `transaction_date`, `amount`, `currency` | Parsed (Fast Parser or Gemini Extraction)                                                                                                                                               |
| `merchant`, `merchant_raw`               | Parsed + normalized                                                                                                                                                                     |
| `category`                               | From merchant_memory (known) or `AI Categorize` (unknown), defaults to `'Other'` at insert time if somehow still empty                                                                  |
| `card_last4`, `account_last4`            | Parsed                                                                                                                                                                                  |
| `bank_name`                              | From `Bank Detection`                                                                                                                                                                   |
| `transaction_type`                       | Parsed **direction** (DEBIT/CREDIT) — regex/keyword-derived, not AI                                                                                                                     |
| `confidence`                             | From merchant memory or AI categorizer                                                                                                                                                  |
| `category_source`                        | `'merchant_memory'` or `'ai'`                                                                                                                                                           |
| `raw_email_subject`                      | Email subject                                                                                                                                                                           |
| `is_manually_entered`                    | `false` (always, this is the automated path)                                                                                                                                            |
| `status`                                 | Computed by `Confidence & Status` (`auto`/`pending_review`/`needs_review`) — **not** the `'auto'` literal `Build Final Transaction Row` sets; that gets correctly overridden downstream |
| `processed_at`                           | `now()` at insert time                                                                                                                                                                  |

**Never written by Workflow C**: `account_id`, `client_id`, `merchant_id`, `category_id`, `type` (OwnerType/business-personal), `payment_mode`, `email_source`, `raw_email` (computed in `Build Final Transaction Row` as a field but **silently dropped** — `Save Transactions`'s JSON body never includes it, despite `transactions.raw_email` existing as a column... _actually not confirmed as a live column — see note below_), `review_status`, `ai_confidence`, `is_recurring`, `is_duplicate`, `tags`, `duplicate_of_id`.

Note: `transactions.type` is confirmed **not null but always `'uncategorized'`** on all 14 live rows (verified live) — this is a **column-level default**, not a workflow-computed value; Workflow C's live path has no business/personal signal anywhere.

### Workflow D → `statement_transactions` (via `Create a row`, native Supabase node)

| Column written                                                           | Source                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `user_id`                                                                | **Hardcoded** to the same dev UUID, sourced from `Build Final Transaction Row`                                                                                                                                                                                                                                                     |
| `bank_name`, `card_last4`, `card_type`                                   | From bank detection / password config                                                                                                                                                                                                                                                                                              |
| `transaction_date`, `merchant`, `normalized_merchant`, `raw_description` | Parsed                                                                                                                                                                                                                                                                                                                             |
| `amount`, `currency`                                                     | Parsed                                                                                                                                                                                                                                                                                                                             |
| `category`                                                               | From merchant memory / parser hint / `AI Categorize1`                                                                                                                                                                                                                                                                              |
| `statement_month`, `source_file`                                         | Constructed (see §6 for `statement_id`'s construction, which `statement_month` feeds)                                                                                                                                                                                                                                              |
| `transaction_type`                                                       | Parsed direction (debit/credit/payment_refund)                                                                                                                                                                                                                                                                                     |
| `confidence`                                                             | From merchant memory or AI categorizer                                                                                                                                                                                                                                                                                             |
| `account_last4`, `account_type`                                          | Parsed (Savings/Current/Credit Card inference)                                                                                                                                                                                                                                                                                     |
| `payment_mode`                                                           | **Not populated** — no field of this name is ever set anywhere in the live path; `Create a row` maps it from `$json.payment_mode`, which is never defined, so this column receives `undefined` → n8n typically omits it, meaning it is simply never written (stays at whatever default/NULL the column already has)                |
| `reference_number`                                                       | Parsed transaction reference                                                                                                                                                                                                                                                                                                       |
| **`status`**                                                             | **BUG (confirmed live, see §7): mapped from `{{$json.category_source}}`, not from the real `status` value `Build Final Transaction Row` computes (`"processed"`).** Verified against live data: `statement_transactions.status` currently holds only `'merchant_memory'` (89,286 rows) and `'ai'` (22 rows) — never `'processed'`. |
| `note`                                                                   | Always `null` (`Build Final Transaction Row` hardcodes it)                                                                                                                                                                                                                                                                         |
| `metadata`                                                               | JSON blob: message_id, email_subject, merchant_id, parser label, extraction_method, parse_quality_status, fallback_reason, parser_version                                                                                                                                                                                          |
| `parser_version`, `extraction_method`                                    | From the parser response / fallback path                                                                                                                                                                                                                                                                                           |
| **`statement_id`**                                                       | **Synthetic string, not a UUID — see §6, the critical finding**                                                                                                                                                                                                                                                                    |
| `page_number`                                                            | Never set anywhere in the live path (same "undefined field" situation as `payment_mode`)                                                                                                                                                                                                                                           |

**Never written by Workflow D**: `client_id`/no equivalent FK column exists on `statement_transactions` for account/client at all (confirmed from schema — this table has no `account_id`/`client_id` columns, only `user_id`). `business_personal` is captured and threaded through nearly every node (`Extract Password for Bank` → `Attach Metadata`) but **never appears in `Create a row`'s field list at all** — silently dropped, same pattern as Workflow C's `raw_email`.

---

## 4. Current schema mismatches

- `statement_transactions.status` receiving `category_source` values instead of a real status vocabulary (§3, §7) — a genuine node-wiring bug, not a design gap.
- `statement_transactions.payment_mode` and `.page_number` are read from fields that are never populated anywhere upstream — effectively dead columns from this pipeline's perspective.
- `business_personal` (owner/type signal) is computed and carried through both workflows' intermediate nodes but reaches neither final insert (§7).
- Workflow C's `Save Transactions` omits `raw_email` despite an equivalent-looking field being computed one node earlier — confirmed dropped at the final write, not written anywhere.

## 5. Current category mismatches

Per the live `categories` table (24 canonical categories, reconciled in the prior Database Foundation phase) and the two live AI categorizer nodes:

- **Workflow C's `AI Categorize`**: still the same hard-schema 19-value Gemini enum from before this session (`Food, Groceries, Shopping, Travel, Transport, Fuel, Entertainment, Utilities, Medical, Education, Insurance, Rent, Subscriptions, Personal Care, Business, Fees & Charges, Transfer, Investment, Uncategorized`) — unchanged, confirmed fresh. Every value already exists in the canonical 24.
- **Workflow D's `AI Categorize1`**: still the same soft-prompt (non-schema-enforced) 32-value list from before (`Groceries, Dining, Food Delivery, Fuel, Travel, Airlines, Hotels, Taxi, Shopping, Electronics, Healthcare, Medical, Insurance, Utilities, Internet, Mobile, Entertainment, Subscriptions, Education, Government, Investment, Bank Charges, Cash Withdrawal, Transfer, Income, EMI, Rent, Business Expense, Office Supplies, Software, Taxes, Other`) — unchanged, confirmed fresh. This list still contains the 8 values normalized away in the Database Foundation phase (`Dining, Food Delivery, Airlines, Taxi, Bank Charges, EMI, Software`, plus `Income`, which became `Loans & EMI`/`Income`/merges into `Food`/`Transport`/`Travel`/`Fees & Charges`). **Nothing in either live workflow was changed by the category normalization work — the DB was fixed, the source that caused the drift was not.** New merchant-memory rows or newly-categorized statement transactions from this node will keep reintroducing exactly the same 8 stale values.
- Neither live categorizer node validates its own output against the live `categories` table before it's written — an AI hallucinating a category outside its own enum (soft-prompt case, Workflow D) or the enum itself falling further out of sync (either workflow) both currently flow straight to the database with no gate.
- The dead `Merchanet Rules`/`Claude Haiku categorize` nodes (Workflow C) and the dead old `AI Categorize` (Workflow D) are moot for category-vocabulary purposes since they don't execute — no drift risk from dead code, only from the two nodes above.

## 6. Statement lifecycle problem — the critical finding, verified

**Finding 1 verified TRUE, exactly as flagged**: `statement_id` is constructed in the live `Structured Transactions` node (native parser path) as:

```js
const statementId = statementMonth && messageId ? `${messageId}_${statementMonth}` : null
```

This is a synthetic string (Gmail message id + a computed YYYY-MM month), **not a real PostgreSQL UUID**, and it is written directly into `statement_transactions.statement_id` by `Create a row`. It cannot and does not reference any row in `statements`.

**Finding 2 verified TRUE**: Workflow D does **not** create a parent row in `statements`. The two nodes that would (`Build Statement Row`, `Build Statement Metadata`) are both dead/unreachable. `statements` has **0 live rows**, confirmed directly against the database this session. `Create a row` (the only live Supabase write in this workflow) targets `statement_transactions` exclusively.

**A newly-discovered structural bug, found while verifying the above**: the Gemini-fallback path is likely broken independent of the `statement_id` issue. `Canonical AI Transactions` (the fallback-path equivalent of `Structured Transactions`) returns a single wrapped item — `{ json: { statement_total, statement_txn_count, transactions: [...] } }` — rather than one flat item per transaction the way `Structured Transactions` does (`allTransactions.map(t => ({ json: t }))`). Both feed directly into `Attach Metadata`, which runs `runOnceForEachItem` and reads flat fields (`txn.message_id`, `txn.statement_id`, `txn.card_last4`, etc.) directly off `$json`. For a fallback-path item, `$json` is the wrapper object — none of those flat fields exist on it, and the real transaction data sits one level deeper inside `.transactions[]`, never unwrapped. **This means statements that fail native parsing and fall back to Gemini likely produce malformed/empty rows, not correctly parsed ones** — a second, independent lifecycle problem on top of the missing-parent-row issue. Flagged for your review; not fixed here, and not confirmed against a real fallback-path execution (would require a controlled test, see §12).

**A third, newly-discovered and likely active problem**: Workflow D has **no mechanism to mark a Gmail message as processed** after a successful run. Workflow C ends with `Remove label from message → Add label to thread`; Workflow D's only equivalent (`Log to ProcessedLog`/`Write ProcessedLog`) is dead code. Combined with `Get many messages` re-querying the same label on every `Schedule Trigger` firing, this means **the same statement email is very likely being reprocessed and reinserted repeatedly**. This is not theoretical: `statement_transactions` grew from ~33,826 rows (last measured during Module 12A, this same session) to **89,308 rows** by the time of this audit — roughly 2.6x growth in one working session — and the category distribution shows suspiciously exact ratios that scaled in lockstep (`Medical = Fuel = 12,744`; `Loans & EMI = Fees & Charges = 6,372` — exactly half of 12,744) — consistent with the same statement(s) being inserted multiple times rather than organic new data. **This needs your attention regardless of the rest of Module 12B** — recommend deciding whether to pause the Schedule Trigger while this is investigated, though that decision and action are yours; nothing was changed here.

## 7. Transaction FK population problem

Confirmed via both source code and live data:

- `transactions.account_id`, `.client_id`, `.merchant_id`, `.category_id` — never populated by Workflow C. Same conclusion as Module 12A's findings; unchanged by anything in this workflow file.
- `transactions.type` (OwnerType/business-personal) — confirmed always `'uncategorized'` (column default), never computed or written by Workflow C. **No business/personal signal exists anywhere in Workflow C's live path.**
- Workflow D **does** compute a `business_personal` value (from the hardcoded per-bank config in `Extract Password for Bank` — `'Personal'` / `'Business'` depending on which of the two configured banks) and threads it through several nodes, but it is **never included in `Create a row`'s field list** — computed, then silently discarded before the actual write. This is the one place a real, deterministic owner/type signal already exists in either workflow, and it's currently thrown away.

## 8. Account/client resolution

Neither workflow attempts to resolve `accounts.id` or `clients.id`. Bank/card identification stays at the free-text level (`bank_name`, `card_last4`, `account_last4`) in both workflows' live paths. No fuzzy-matching against the `accounts` table exists anywhere (consistent with the Database Foundation migration's own guidance that a wrong FK is worse than a null one — neither workflow violates that principle, they just don't attempt resolution at all).

## 9. Payment mode / type / status mapping

- Workflow C: `transaction_type` = direction (DEBIT/CREDIT), correctly distinct from the never-written `type` (OwnerType). `status` is correctly computed by `Confidence & Status` and correctly reaches the database (no bug here, despite an intermediate hardcoded default that gets overridden). No `payment_mode` written at all.
- Workflow D: `transaction_type` = direction (debit/credit/payment_refund). `status` is **bugged** — see §3/§6, receives `category_source`'s value instead. `payment_mode` is never populated by anything upstream despite being in `Create a row`'s field list.

## 10. Security / configuration issues found

1. **Hardcoded dev-owner UUID**, live, in at least 5 places across both workflows: Workflow C's `Build Final Transaction Row` and `Lookup Merchant Memory`; Workflow D's `Build Final Transaction Row`, `Merchant Lookup RPC`, and `Save Merchant Memory`. (Also present in dead code: Workflow D's `Append to Transactions`.) This is exactly the "architectural constant" risk flagged in your instructions — a client deployment with a different Supabase project/user cannot function without manually editing JS code in multiple nodes.
2. **Hardcoded plaintext bank PDF passwords** in Workflow D's `Extract Password for Bank` code node (2 banks configured; see the security note at the top of this report — one value was inadvertently displayed in this session's tooling before the redaction was fixed, not repeated here).
3. **A raw Gemini API key hardcoded as a query parameter** on `AI Categorize1`, redundant with (and inconsistent with) the node's own `nodeCredentialType: "googlePalmApi"` credential binding, which is the correct mechanism already available and unused for this purpose.
4. Workflow C's live `AI Categorize` node is bound to an `anthropicApi` n8n credential while actually calling the Gemini endpoint — the credential binding is misleading/unused (auth happens via the query-string key instead); not a security hole, but a configuration inconsistency worth cleaning up.
5. Both workflows' Supabase REST calls carry `apikey`/`Authorization: Bearer` headers holding what is presumably the service-role key (consistent with the RLS `service_role_bypass` policy design already confirmed in the Database Foundation phase) — appropriate for a backend workflow, just noting it's the same credential pattern throughout, not per-call variation.
6. `Extract Password for Bank` only has credentials for 2 of the 12 banks `Extract Email Metadata`'s registry can detect — every other bank throws an unhandled error. Not a secret-handling issue, but a production-readiness gap worth surfacing here since it's config-shaped (more banks will need passwords added the same hardcoded way unless this is redesigned).

**Recommended mechanism for all of the above** (not implemented, proposed only): n8n's built-in **credential** system already exists and is already used for `gmailOAuth2`, `httpHeaderAuth`, `googlePalmApi`, `anthropicApi`, `supabaseApi` — the same pattern should hold the Supabase owner UUID (as an n8n environment variable or a small "tenant config" credential, injected via `{{$env.SUPABASE_OWNER_USER_ID}}` or similar) and bank passwords (per-bank credential entries, or a single structured credential holding the bank→password map) rather than literal strings in `jsCode`. This lets a client deployment swap every one of these without touching workflow logic, per your explicit requirement.

## 11. Exact proposed node changes (not implemented — proposal only)

In priority order, matching your stated implementation order:

1. **Workflow D — create the parent `statements` row.** Add a Supabase-node write (mirroring `Create a row`'s pattern) that runs once per statement (before `Split Out`/per email, not per transaction), inserts into `statements`, and captures the real returned UUID. Candidate insertion point: right after `Extract Password for Bank`, since that's where statement-level metadata (bank, card, message_id) is already assembled once per email — before the per-transaction fan-out happens in `Structured Transactions`/`Canonical AI Transactions`.
2. **Fix `statement_transactions.statement_id`.** Once the parent row exists, thread its real UUID through `Attach Metadata` (replacing the synthetic `${messageId}_${statementMonth}` string) so `Create a row` writes a real FK. Existing rows are **not** touched (per instruction — no backfill, no fabricated linkage for the 89,308 rows already written with synthetic ids).
3. **Fix `Create a row`'s `status` field mapping** — bind it to the real computed `status` (`"processed"` today, or richer values if you want to extend `Build Final Transaction Row`'s status logic to match Workflow C's confidence-based `Confidence & Status` pattern) instead of `category_source`.
4. **Add `business_personal` (→ `type`) to `Create a row`'s field list** — the value already exists (`Attach Metadata` carries it), it's just never included in the write. For Workflow C, no equivalent signal exists yet; this needs a real decision from you (a per-account default? a manual-review-required default?) before anything is wired, not invented here.
5. **Validate AI/hint category output against the live `categories` table** before either `Save Merchant Memory` call or either final insert — reject/fallback (e.g. to `Other`) rather than insert an unrecognized string, closing the drift-recreation risk identified in §5. Both workflows' `Normalize AI Category Output` nodes are the natural insertion point.
6. **Point both AI categorizer nodes at the live category list dynamically**, mirroring the one already-correct pattern (Workflow C's dead `Load categories` → `Claude Haiku categorize` pair, which queried the table at runtime) rather than the two static hardcoded enums — this is the structural fix that prevents recurrence, not just today's cleanup.
7. **Move the hardcoded owner UUID into n8n credentials/environment configuration**, referenced by every node currently hardcoding it (5 live locations).
8. **Move hardcoded bank passwords into n8n credentials.**
9. **Add a Gmail processed-marker to Workflow D** (label removal, matching Workflow C's pattern, or the dead `ProcessedLog` mechanism revived and made live) — this is now higher priority than originally scoped, given the likely-active reprocessing found in §6.
10. **Investigate and fix the Gemini-fallback shape mismatch** (`Canonical AI Transactions` → `Attach Metadata`) found in §6 — needs a `Split Out`-equivalent step for the fallback path before `Attach Metadata`, or `Canonical AI Transactions` should return one item per transaction like `Structured Transactions` does.

None of the above has been implemented. Existing dedupe (Workflow C's `Dedupe check`/`IF Duplicate`) and existing merchant-memory architecture (both workflows' lookup→AI-fallback→save pattern) are preserved as-is in every proposal above — no rebuild.

## 12. Controlled test plan

Matches your specified TEST 1–9, mapped to what each will actually exercise given the findings above:

- **TEST 1/2** (one transaction email → one row, then dedupe on reprocess): exercises Workflow C's already-working `Dedupe check`/`IF Duplicate` — expected to already pass; establishes a baseline before any change.
- **TEST 3/4** (new merchant vs. known merchant): exercises `Lookup Merchant Memory`/`AI Categorize` (Workflow C) — expected to already work; use as regression coverage once category-validation (§11.5) is added.
- **TEST 5** (one statement → one parent `statements` row + correctly linked `statement_transactions`): this is the primary test for §11.1/§11.2 — cannot pass today (no parent-row creation exists at all). Must be run against a **native-parser-path** statement first (simpler, confirmed-working transaction-shape) before attempting a fallback-path statement, given the §6 shape-mismatch finding.
- **TEST 6** (same statement twice → dedupe prevents duplication): **currently has no contract to test against** — Workflow D has no statement-level dedupe at all (§6, §11.9). This test will fail today by design; it should be re-run after §11.9 (processed-marker) is implemented, and its very first run (before any fix) is valuable as direct confirmation of the reprocessing hypothesis in §6.
- **TEST 7** (invalid/unknown category → canonical fallback): has no gate to test today (§5) — will only pass after §11.5 is implemented.
- **TEST 8** (ambiguous account/client → no fabricated FK, flagged): already true today for both workflows (neither attempts resolution) — confirm no regression once other changes land.
- **TEST 9** (RLS/ownership → no cross-user leakage): straightforward to test now, independent of other fixes — insert as the dev user, confirm invisible to a second test user (or confirm RLS denies without the right `auth.uid()`), matching the same pattern already verified in Module 12A.

Real development test data should be used where available (per instruction) rather than fabricated financial data — e.g., trigger Workflow C/D against one real, already-received bank/statement email rather than constructing a synthetic one, where practical.

---

**Stopping here, per instruction.** No n8n workflow was modified. No database change was made. No mass processing, backfill, or reprocessing was performed or triggered. Waiting for your review and explicit approval before implementing any of §11 or running the §12 controlled tests.
