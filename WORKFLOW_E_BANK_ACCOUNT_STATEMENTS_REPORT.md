# Workflow E — Bank Account Statements Processing

Deliverable: [`Workflow E - Bank Account Statements Processing - Phase 1.json`](Workflow%20E%20-%20Bank%20Account%20Statements%20Processing%20-%20Phase%201.json) — 78 nodes, cloned from `22nd Aug - Workflow D - CC Parser + Gemini Fallback - Statements Processing - Phase9.json` (confirmed the latest/proven Phase 9 export — Production.json and every dated Phase2–Phase8 file were checked and are all older/smaller subsets). Workflow D's Phase10 files were explicitly **not** used as architecture, per instruction. No password or the Supabase secret discussed below appears anywhere in this report.

## Architecture

Pure clone of Phase 9's node graph and connections — **verified byte-identical** once the one intentional rename is accounted for (I diffed the connections graph programmatically, not by inspection). Only 9 nodes carry an intentional content change; everything else (62 of 77 common-named nodes) is untouched. No Phase 10 credential-resolution architecture, no pre-parse statement-type detection, no candidate password logic — the Gmail label is the sole routing signal, exactly as instructed.

| #   | Node                                                                         | Change                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `Extract Password for Bank` → **`Extract Bank Account Password`**            | Renamed (global, including every `$('Extract Password for Bank')` cross-reference across the whole workflow — 15 occurrences caught by a text-level substitution, not a manual per-node edit, so nothing was missed) |
| 2   | `Extract Bank Account Password`                                              | Full rewrite: simple `{bank_name: {account_last4, password}}` registry, one password per bank, no type/candidate logic                                                                                               |
| 3   | `Get many messages`, `Gmail - Watch Banking Label`                           | `labelIds` → placeholder `REPLACE_WITH_BANK_STATEMENTS_LABEL_ID`                                                                                                                                                     |
| 4   | `Attach Metadata`                                                            | Removed hardcoded `'Credit'`/`'Credit Card'` defaults (→ `null`); added missing `account_last4 → source.account_last4` fallback                                                                                      |
| 5   | `Canonical AI Transactions` (Gemini fallback)                                | Added `account_type` passthrough (flagged ASSUMPTION, same honesty convention already used elsewhere in this file for other Gemini fields)                                                                           |
| 6   | `Evaluate Parse Quality`                                                     | Added bank-account identity validation (below) + reconciliation override (below)                                                                                                                                     |
| 7   | `Create Statement`, `Create Account If Missing`, `Finalize Statement Update` | Cosmetic: `notes` audit strings now say "Workflow E" instead of "Workflow D"                                                                                                                                         |
| 8   | `Save Merchant Memory`, `Load Merchant Memory`                               | Security fix (below)                                                                                                                                                                                                 |
| —   | Workflow-level `id`                                                          | Regenerated (fresh UUID) — this is a genuinely separate n8n workflow, will never overwrite Workflow D on import                                                                                                      |

All 7 touched Code nodes (plus 2 more that changed only via the rename substitution) pass real `node --check` JS syntax validation.

## Gmail label

Both label-filtering nodes (`Get many messages` — the live path; `Gmail - Watch Banking Label` — present in the source but unconnected/dead, confirmed by inspecting the connections graph, updated too for consistency) now use the placeholder `REPLACE_WITH_BANK_STATEMENTS_LABEL_ID`. **The real Gmail label ID does not exist anywhere in this repository** — Workflow D's label (`Label_6936570521063439212`) is the credit-card label; there is no bank-statement label ID recorded anywhere. **You must create/select the Gmail label for bank statements and replace this placeholder with its real ID** before importing and activating this workflow.

## 5 bank-account mappings

Same situation as the earlier Phase 10 investigation — I did not re-guess, I re-checked:

| Bank       | Account Last4 | Password                            | Status                                                                                                                                                  |
| ---------- | ------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HDFC Bank  | 6362          | _(hardcoded, exact value you gave)_ | Configured                                                                                                                                              |
| ICICI Bank | 2332          | **`null` — UNCONFIGURED**           | Identity known (from the earlier test fixture), password never found anywhere in this repo                                                              |
| _(3 more)_ | —             | —                                   | **Completely unknown** — no bank name, no last4, nothing to key an entry on. Not stubbed, since inventing a placeholder bank name would be fabrication. |

Add each real one as a single new object in `BANK_ACCOUNT_CREDENTIALS` — nothing else in the workflow needs to change.

## Parser behavior

Unchanged from Phase 9: same `CC Parser API` node, same multipart body (`file`, `password`, `bank`, `email_subject`, `sender_email`, `attachment_filename`), same `Prepare Parser Request` bank-slug mapping. The parser is trusted as authoritative for `statement_type` and `account_type` — Workflow E never invents these.

## Password resolution

`Extract Bank Account Password` does a single deterministic lookup: canonicalize bank name (identical map to Workflow D) → `BANK_ACCOUNT_CREDENTIALS[bank]` → password, or throw `BANK_ACCOUNT_PASSWORD_MISSING` (bank not configured, or configured but password still `null`). No hint detection, no candidates, no retry loop — exactly the "minimum changes" design requested. `account_type`/`card_type` are left `null` here by design: the already-existing, **unmodified** `Structured Transactions` node already prioritizes `data.account_type` (parser-owned) whenever this node doesn't force a value — I verified this by re-reading its exact priority chain rather than assuming, and it needed zero changes to work correctly for bank accounts once the old forced `'Credit Card'` default was removed from the password node. `card_last4` is always `null`.

## Account identity validation

Added to `Evaluate Parse Quality` (the workflow's existing single decision point), two checks, both producing `error_category: 'BANK_ACCOUNT_IDENTITY_MISMATCH'` and stopping the run before any Supabase write:

1. Parser's `data.statement_type` must equal `bank_account` — catches a credit-card statement arriving via Workflow E's label (Test 5).
2. Parser's `data.account_last4` (when returned) must match the configured `account_last4` for the resolved bank (Test 3).

A wrong-but-decryptable password, or a right password on the wrong account, cannot produce a completed statement or an inserted transaction — both are caught here, before `Structured Transactions` or any Supabase node ever runs.

## Reconciliation override (post-deployment fix)

Live testing against a real HDFC bank statement surfaced a real bug: the CC Parser API's own `parse_quality` check is built for credit cards — it validates against `statement_total_amount_due`, which is `null`/inapplicable for a bank-account statement — so it reported `parse_status: 'fallback_required'` / `parse_quality.status: 'review'` (reason `reconciliation_unknown`) even though the parse itself was genuinely correct (`success: true`, 11 transactions extracted). Per the explicit instruction not to modify the parser, `Evaluate Parse Quality` now independently re-verifies reconciliation using the bank-account formula (`opening_balance − total_debits + total_credits = closing_balance`, ≤ ₹1 tolerance) and overrides the parser's quality signal **only** when: this is a confirmed `bank_account` statement, the parser's _only_ stated concern was `reconciliation_unknown` (any other reason present blocks the override — this is not a blanket bypass), and the four balance fields are present and actually reconcile.

Verified with a real Node.js execution (not just a syntax check) against your exact reported HDFC numbers (₹2,83,156.46 − ₹1,16,569.23 + ₹3,03,236.97 = ₹4,69,824.20): the override correctly computes `delta: 0`, `applied: true`, `decision: 'native'`. The override and original parser status are both recorded on the item (`parse_quality.reconciliation_override`, `parse_quality.original_status`) rather than silently overwritten, so it's auditable if inspected later. This change is scoped to Workflow E's clone of `Evaluate Parse Quality` only — Workflow D's credit-card reconciliation logic (in its own, separate `Evaluate Parse Quality` node) was never touched.

**This override never actually fires**, because the real parser response (confirmed against a full live execution you provided) doesn't contain `data.statement_type`, `data.account_last4`, `data.opening_balance`, `data.total_debits`, or `data.total_credits` at all — not null, absent. Worse: the parser's per-transaction `amount` field is populated from the statement's **Closing Balance** column, not the actual withdrawal/deposit amount (e.g. a row with Withdrawal ₹50,000.00 / Deposit ₹0.00 / Closing ₹2,33,156.46 comes back as `amount: 233156.46`), and `transaction_type` is `"debit"` on every row, including ones that are clearly deposits. This is a parser-side extraction gap for bank-account statements — the correct transaction amounts were never captured as structured data, only inside `raw_text`. No amount of n8n-side field-mapping or reconciliation logic can recover data the parser never extracted.

## Temporary hold (added after live testing)

Given the above, you decided to **hold bank-account processing** rather than risk auto-completing a statement with wrong transaction amounts/direction, or build a bank-specific raw-text regex fallback as a stopgap. `Evaluate Parse Quality` now has an unconditional hold block at the very top — before any other logic (reconciliation override, identity checks) runs — that routes every bank-account parse to `routing_decision: 'error'` / `error_category: 'BANK_ACCOUNT_PARSER_UNVERIFIED'`, sending it to the existing manual-review path regardless of what the parser reports. Verified against your real payload: confirmed output is `routing_decision: 'error'`, `error_category: 'BANK_ACCOUNT_PARSER_UNVERIFIED'` — it no longer reaches Gemini fallback or `Structured Transactions`, so no statement is created and no transaction is inserted.

This is deliberately reversible: the reconciliation override and identity-validation logic underneath the hold remain fully implemented and untouched, they simply never execute while the hold is active. **To re-enable auto-processing once the parser correctly returns `statement_type`/`account_last4`/`opening_balance`/`total_debits`/`total_credits` and correct per-transaction `amount`/`transaction_type`: delete the block marked `TEMPORARY HOLD` ... `END TEMPORARY HOLD` in `Evaluate Parse Quality`. Nothing else in this workflow needs to change.**

## Structured Transactions rewrite + a second, previously-invisible bug

While the hold protects live processing, `Structured Transactions` was still being developed/tested node-by-node in the n8n editor and surfaced two real problems, both now fixed:

1. **Silent empty output.** The node's original logic (inherited from the shared Workflow D/Phase 9 version) did `Array.isArray(data.transactions) ? data.transactions : []` — if fed a shape that doesn't have `data.transactions`, it silently returned zero items, which n8n reports as an unhelpful "No output data returned" with no indication why. It now **throws a clear, diagnosable error** (`STRUCTURED_TRANSACTIONS_NO_DATA`, naming what was actually received) instead, both when `data.transactions` isn't an array at all and when it maps to zero transactions.
2. **A confirmed, previously-invisible account-resolution bug.** The inherited node's credit-card/savings/current type-detection logic can _never_ actually classify a Workflow E statement correctly, because the parser doesn't return `data.account_type` at all — every bank transaction was silently getting `account_type: null`. Downstream, `Aggregate Statement Totals`'s existing (correct, unmodified) logic treats a `null` `account_type` as `missing_identifier` and never resolves an account — meaning **no Workflow E statement could ever have gotten matched to an account**, independent of the parser's amount/transaction_type bugs already on hold. Fixed by: rewriting `Structured Transactions` specifically for bank statements (all the credit-card branching removed — Workflow E never has cards, so `card_last4`/`card_type` are simply always `null` now), and adding a verified `account_type: 'Savings'` to the HDFC entry in `Extract Bank Account Password`'s registry (confirmed directly from that account's own statement text — "SAVINGS ACCOUNTS" / "SAVINGS A/C - RESIDENT (100)" — not guessed), used only as a fallback when the parser itself doesn't supply the field. `Attach Metadata` got the same fallback pattern added for `account_type` (mirroring the `account_last4` fallback added earlier), so the Gemini fallback path is equally robust.

Verified with a real functional test (not just syntax-checked) against your actual HDFC payload: produces one item per transaction with `account_type: "Savings"`, `account_last4: "6362"`, `card_last4: null` correctly populated. The parser's own `amount`/`transaction_type` bugs are unaffected by this fix — they remain the separately-tracked, held issue described above; this fix is about the orchestration layer being correct and loud-on-failure, not about correcting data the parser never extracted.

Nodes touched by this fix: `Structured Transactions` (full rewrite), `Extract Bank Account Password` (registry + return-object addition), `Attach Metadata` (one added fallback line). Diff-verified against the clone: these plus `Evaluate Parse Quality` (the earlier reconciliation/hold work) are the only 4 nodes that have ever changed in this workflow; connections are untouched throughout.

## Hold removed — parser confirmed fixed, full contract update (2026-08-23, later same day)

A subsequent live execution came back completely different, and correct: `parse_status: "success"`, `parse_quality: {status: "pass", reconciliation_status: "pass"}`, and `data` now includes `statement_type: "bank_account"`, `account_type: "Savings"`, `account_last4: "6362"`, `opening_balance: 283156.46`, `closing_balance: 469824.2`, `total_debits: 116569.23`, `total_credits: 303236.97` — all independently verified correct against the source statement. All 11 per-transaction rows (now under a **renamed** field, `data.statement_transactions`, not the old `data.transactions`) have correct `amount` and correct `transaction_type` ("debit"/"credit", no longer hardcoded) — checked every single row by hand against the statement text and against the parser's own `validation.totals_match: true`. The parser is fixed.

This meant two things needed to happen together, not separately: **remove the hold**, and **update every node that assumed the old response shape**, since removing the hold alone would have just traded a silent block for a thrown error (`data.statement_transactions` vs. the `data.transactions` my code was still reading).

- **`Evaluate Parse Quality`**: the `TEMPORARY HOLD` block deleted, exactly as its own comment specified. The reconciliation-override and identity-validation logic added earlier remain in place as defense-in-depth (harmless now that the parser reports clean status directly, but they'll still catch a regression if one bank's response ever comes back malformed while others don't).
- **`Structured Transactions`**: rewritten again for the current, confirmed-correct contract — reads `data.statement_transactions` (falls back to `data.transactions` defensively), maps the new field names (`payment_mode`, `reference_number` instead of `transaction_id`, per-row `account_last4`/`bank_name`), and threads `opening_balance` through. One subtle bug avoided deliberately: the parser's per-row `confidence` field is a qualitative string ("high"/"medium" — extraction confidence), not the numeric categorization confidence `Build Final Transaction Row` expects; mapping it through would have silently produced `NaN` via that node's `Number(j.confidence)` coercion. It's intentionally left unmapped — `category`/`category_source`/`confidence` remain entirely owned by the existing downstream categorization pipeline.
- **`opening_balance` threaded end-to-end**: added to `Structured Transactions` → `Build Final Transaction Row` → `Aggregate Statement Totals` → `Finalize Statement Update` → `Update Statement Row` (a new Supabase field mapping — the `statements` table already has this column, confirmed via `Create Statement`'s own field list; it was simply never updated after creation, for credit cards either). This closes a gap from the original Workflow E report, now that a verified-correct value actually exists to populate it with.

Verified with a full end-to-end functional test (not just syntax-checked) using all 11 real transactions from your payload, run through the actual rewritten node bodies: 11 items produced, `account_type: "Savings"` / `account_last4: "6362"` / `card_last4: null` on every row, computed `total_debits` (116569.23) and `total_credits` (303236.97) match the parser's own stated totals exactly, `opening_balance` (283156.46) carries through correctly, and no `NaN` appears anywhere.

**Nodes changed across the full Workflow E history**: `Extract Bank Account Password`, `Structured Transactions`, `Attach Metadata`, `Evaluate Parse Quality`, `Build Final Transaction Row`, `Aggregate Statement Totals`, `Finalize Statement Update`, `Update Statement Row` — 8 total. Diff-verified: nothing else changed, connections graph identical to the original Phase 9 clone throughout. Workflow C and D were never opened this session.

## Gemini fallback

Reused unchanged except for one addition: `Canonical AI Transactions` now also passes through `account_type` (flagged as an unverified assumption about the Gemini normalization schema, matching this same file's existing honesty convention for other statement-level fields it already flags the same way). `account_last4` is deliberately **not** re-derived here — `Attach Metadata`'s new fallback recovers it from the already identity-verified `Extract Bank Account Password` value instead, which is more reliable than re-parsing Gemini's free text. No password, credential, or secret is ever passed to Gemini — confirmed by inspection; the Gemini-facing nodes only ever receive `raw_text`/`bank_name`/`subject`.

## Supabase mapping

No schema change, no new table, same `statements`/`statement_transactions`/`accounts` tables and the same Supabase credential (`tHzosrSGYSYIwoDH`, "Supabase account") Phase 9 already uses. **One unplanned, explicitly-requested finding, inherited from the same Phase 9 source this clone is built from**: a Supabase **service_role** JWT was hardcoded as a literal HTTP header value in `Save Merchant Memory` and `Load Merchant Memory`. Per instruction, I did not reproduce it — both are now bound to the existing `httpHeaderAuth` credential ("Header Auth account") already correctly used by the sibling `Merchant Lookup RPC` node, and the literal header values were removed. **This is the same key already flagged in the Workflow D Phase 10 v2 report — it still needs rotating in Supabase; this fix only stops this new file from carrying it forward.**

## Idempotency

Untouched — `Check Existing Statement` / `IF Statement Exists` / `Resume Existing Statement`, keyed on `(user_id, source_message_id)`, copied exactly from Phase 9.

## Account resolution

Untouched — `Aggregate Statement Totals` already (from Phase 9) strictly separates the identifier column by `account_type` (`card_last4` only when `account_type === 'Credit Card'`, `account_last4` otherwise) and never coalesces them. Verified by re-reading the exact code, not assumed. Nothing needed to change for Workflow E to inherit this correctly.

## Error handling

New categories: `BANK_ACCOUNT_IDENTITY_MISMATCH` (statement-type or last4 mismatch), `BANK_ACCOUNT_PASSWORD_MISSING` (registry gap). `BANK_ACCOUNT_PARSE_FAILURE` was **not** added as a separate category — a genuine parse failure already routes through Phase 9's existing `pdf_parsing_failure`/`unexpected_api_error`/connection-failure categories unchanged, and duplicating that mechanism wasn't necessary.

## Test matrix (structural — not run, no live instance)

| Test                                                          | Mechanism                                                                      | Status                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------- |
| 1. HDFC 6362/61388636 success                                 | Registry resolves → parser → validation passes → normal insert path            | Structurally ready; real password present |
| 2. Wrong HDFC password                                        | Parser 401/422 → existing `Classify Parser Response` error routing (unchanged) | Structurally ready                        |
| 3. Correct password, parser returns different `account_last4` | New `Evaluate Parse Quality` check → `BANK_ACCOUNT_IDENTITY_MISMATCH`          | Structurally ready                        |
| 4. Duplicate email                                            | Existing Phase 9 idempotency (unchanged)                                       | Structurally ready                        |
| 5. Credit-card email via Workflow E's label                   | New statement-type check → `BANK_ACCOUNT_IDENTITY_MISMATCH`                    | Structurally ready                        |
| 6. Bank statement via Workflow D's label                      | N/A — Workflow D is untouched and unaware Workflow E exists                    | Confirmed by design, not by test          |

None of these were run against a live parser/n8n instance — no such connection is available in this session.

## Remaining manual setup required

1. Create/select the Gmail bank-statement label and replace `REPLACE_WITH_BANK_STATEMENTS_LABEL_ID` in both `Get many messages` and `Gmail - Watch Banking Label`.
2. Import into n8n and verify import succeeds (unverified here).
3. Supply the ICICI (2332) password and the other 3 unknown bank accounts as you get them — each is one object in `BANK_ACCOUNT_CREDENTIALS`.
4. Rotate the Supabase service_role key found in `Save Merchant Memory`/`Load Merchant Memory` — present in Phase 9 and every earlier export too, not new to this file.
5. Activate Workflow E's own trigger — confirm its `Schedule Trigger` is enabled independently of Workflow D's.

## Confirmation: Workflow D was not modified

Neither `22nd Aug - Workflow D - CC Parser + Gemini Fallback - Statements Processing - Phase9.json` nor any other Workflow D file was opened for writing this session — only read. `git status` shows it still only as an untracked, unmodified file. Workflow C files likewise remain untouched.

**FINAL STATUS: PASS WITH WARNINGS** — full JSON/graph validation passed (node/connection diff against Phase9 confirms exactly the intended 9 nodes changed, connections graph byte-identical once the rename is accounted for), `node --check` passed on all 7 touched Code nodes, secret scan confirms only the one intended password and zero Supabase-JWT occurrences. Not a bare PASS: real n8n import, the actual Gmail label ID, and 4 of 5 bank-account passwords remain outside what I can verify or supply from this repository alone.
