# MIGRATION_CHANGELOG.md

Exactly what changed in `DATABASE_MIGRATIONS.sql` (and its supporting documents) since the version reviewed before Phase 0, and why. Every change below was driven by a specific `PHASE0_VERIFICATION.md` finding or an explicit follow-up decision — nothing here is speculative cleanup.

**Two update passes are recorded here:** Decisions 1–4 and 6 (2026-08-18, first pass) responded directly to Phase 0's findings. Decision 5 was originally left as a proposal (`RLS_POLICY_PLAN.md`) pending a schema-design choice — **that choice has since been approved** (2026-08-18, second pass, this update) and is now implemented in `DATABASE_MIGRATIONS.sql`, not just documented.

---

## Decision 1 — `owner_type` removed, not added

**Before:** Phase 1.2 added `transactions.owner_type text CHECK (... IN ('personal','business'))`.

**Now:** Nothing is added. Phase 0 read `monthly_summaries`'s live definition and found it already computes `total_personal`/`total_business`/`total_uncategorized` from the _existing_ `transactions.type` column. `type` was already the OwnerType storage column — every live row reading `'uncategorized'` reflects that Workflow C Parser's insert nodes never write anything else there, not that the column was wrong.

**Changed:**

- `DATABASE_MIGRATIONS.sql` Phase 1.2: `ALTER TABLE` removed, replaced with a documentation-only comment.
- `transactions.type`'s `COMMENT ON COLUMN` rewritten to state its real purpose.
- `vw_transactions` and `vw_monthly_spend` (Phase 7): `t.owner_type` → `t.type AS raw_type`. The OwnerType translation (`'personal'`/`'business'`/else-null) now happens in the repository layer, not SQL — per instruction, "the repository/domain mapping must later translate."
- Rollback strategy: `owner_type` entry removed (nothing to roll back).
- `REPOSITORY_IMPLEMENTATION_PLAN.md`: added the exact `toOwnerType()` mapping function `TransactionRepository`/`AnalyticsRepository.getOwnerTypeSpend()` must implement.

---

## Decision 2 — 5 redundant indexes removed from Phase 5a

**Before:** Phase 5a created 7 `transactions.*` indexes + 2 `merchant_memory` indexes assuming none existed (`SUPABASE_AUDIT.md` marked index coverage "Not Available via REST").

**Now:** Phase 0's `pg_indexes` read found 5 of those already exist, under different names:

| Removed from Phase 5a                     | Already exists as                                                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `idx_transactions_account_id`             | `idx_transactions_account`                                                                                        |
| `idx_transactions_client_id`              | `idx_transactions_client`                                                                                         |
| `idx_transactions_statement_id`           | `idx_transactions_statement`                                                                                      |
| `idx_transactions_transaction_date`       | `idx_transactions_date` (and `idx_tx_date`, already duplicated between themselves — not this migration's problem) |
| `idx_merchant_memory_normalized_merchant` | `idx_merchant_memory`                                                                                             |

**Kept** (genuinely new — either for columns this migration itself adds, or confirmed missing live): `idx_transactions_merchant_id`, `idx_transactions_category_id`, `idx_transactions_duplicate_of_id`, `idx_merchant_memory_default_category_id`, `idx_statement_transactions_statement_id`, `idx_statements_account_id`, `idx_statements_client_id`, `idx_accounts_client_id`, `idx_categories_parent_category_id`.

**Changed:** `DATABASE_MIGRATIONS.sql` Phase 5a header + statement list; rollback strategy's Phase 5a `DROP INDEX` list trimmed to match.

---

## Decision 3 — `accounts_account_type_check` constraint attempt removed

**Before:** Phase 3.1 assumed no CHECK constraint existed on `account_type` and added one allowing `'Savings'/'Current'/'Overdraft'/'Credit Card'` (guarded by a `DO` block).

**Now:** Phase 0's `pg_constraint` read found a constraint by that exact name already live, allowing `'Savings'/'Current'/'OD'/'Credit Card'` — note `'OD'`, not `'Overdraft'`. The migration's `DO` block guard would have silently no-op'd rather than erroring, but its stated intent ("add Overdraft support") never would have happened, and the comment explaining why was wrong.

**Changed:**

- `DATABASE_MIGRATIONS.sql` Phase 3.1: the `DO $$ ... ALTER TABLE ADD CONSTRAINT ... $$` block removed entirely, replaced with a documentation-only comment recording the real live constraint and the `'OD'` value.
- Rollback strategy: Phase 3 rollback entry removed (nothing created, nothing to roll back).
- `REPOSITORY_IMPLEMENTATION_PLAN.md`: `BankAccountRepository`/`CreditCardRepository`'s `create(input)` row and mapping-logic section both updated to specify the `'overdraft'` ↔ `'OD'` translation at the repository boundary. Existing production data is untouched — the database keeps saying `'OD'`; only the frontend-facing translation changed.

---

## Decision 4 — `updated_at` auto-maintenance added (new Phase 4.5)

**Before:** No trigger mechanism anywhere. Every `updated_at` column (including this migration's own new `categories.updated_at`) was insert-only — `DEFAULT now()` fires once, never again.

**Now:** Phase 0 confirmed zero triggers exist in `public` at all. Added:

- `CREATE OR REPLACE FUNCTION public.set_updated_at()` — one shared `BEFORE UPDATE` trigger function (`NEW.updated_at = now(); RETURN NEW;`).
- `CREATE OR REPLACE TRIGGER` on the 6 tables that have `updated_at`: `accounts`, `clients`, `statements` (pre-existing columns), `merchant_memory` (pre-existing column, no insert default at all per Phase 0 — `column_default: null`), `categories`, `application_settings` (both new to this migration).
- Deliberately **not** triggered: `audit_logs` (immutable log rows by design), `notifications` (no `updated_at` column).

**Changed:** New Phase 4.5 inserted into `DATABASE_MIGRATIONS.sql` between Phase 4 (new tables) and Phase 5a (indexes); rollback strategy extended with the corresponding `DROP TRIGGER`/`DROP FUNCTION` statements. No existing data touched — this only affects future `UPDATE`s.

---

## Decision 5 — RLS: ownership architecture approved and implemented (2026-08-18, second pass)

**Before (first pass):** RLS status was an open unknown (`DATABASE_READINESS.md` §1), then confirmed: RLS enabled on all 10 tables, only 4 with policies. `RLS_POLICY_PLAN.md` proposed (not executed) own-row policies for the 3 tables with a usable `user_id` column (`merchant_memory`, `processed_messages`, `statement_transactions`), and **stopped without proposing a policy** for `accounts`/`clients`/`statements` — no ownership column existed, and inventing one wasn't this document's call to make.

**Now (second pass, this update):** Option 1 from `RLS_POLICY_PLAN.md` — add `user_id uuid REFERENCES auth.users(id)` to all three — was explicitly approved. Before writing any SQL, the owner UUID was verified directly against the live database, not assumed:

- `auth.users` has exactly **one row** — confirmed via direct connection, not inferred from row counts elsewhere. This app is genuinely single-tenant.
- That row's `id` (`2f324f4d-1dc3-4ec5-8c23-93da480842c7`) already matches 100% of the `user_id`-populated rows in `transactions` and `merchant_memory` — the same value already hardcoded throughout both n8n workflows, not a new or different identifier.
- `merchant_memory` was checked for `NULL` `user_id` rows before writing its policy — 0 of 79 found, so no row is silently orphaned or silently exposed by the new policy.
- Its email (`agrawalpurvak94@gmail.com`) does not match this session's account email, but does match the git commit author identity ("Purvak") — flagged for your final human confirmation in the delivered summary, since that's the one part of "verify this is the intended owner" a database query alone can't settle.

**Changed:**

- `DATABASE_MIGRATIONS.sql` **Phase 2.6 (new)**: adds `user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE` to `accounts`, `clients`, `statements`; backfills existing rows to the verified owner (deterministic — not the fuzzy-matching kind of backfill deferred elsewhere in this file); sets `NOT NULL` after backfill, in the same transaction. Explicitly documents `user_id` (tenant/auth owner) vs. `client_id` (business-level client) as distinct concepts, per instruction.
- `DATABASE_MIGRATIONS.sql` **Phase 8 (new)**: RLS policies for all 6 previously-unpolicied tables (`accounts`, `clients`, `statements`, `merchant_memory`, `processed_messages`, `statement_transactions`) — each an own-row `FOR ALL USING/WITH CHECK (auth.uid() = user_id)` policy, preceded by `DROP POLICY IF EXISTS` for idempotency. No `USING (true)`/`WITH CHECK (true)` anywhere. RLS is not disabled anywhere.
- `DATABASE_MIGRATIONS.sql` **Phase 8.3**: the `transactions`-insert flag from the first pass is now fixed, not just documented — `DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.transactions`. Before/after policy behavior fully documented inline (see that phase's header comment) and in `RLS_POLICY_PLAN.md`. `service_role_bypass` is untouched; both n8n workflows authenticate as `service_role` (verified node-by-node in `N8N_NODE_DEPENDENCY_MAP.md`), so this cannot affect them.
- `RLS_POLICY_PLAN.md`: rewritten to reflect approval — the 3 "blocked" tables' STOP sections are replaced with confirmation that Option 1 was chosen and implemented; the "ready" tier's SQL is now sourced from `DATABASE_MIGRATIONS.sql` rather than duplicated here.
- `REPOSITORY_IMPLEMENTATION_PLAN.md`: "RLS readiness per repository" table updated — all 6 repositories (not 2) are now RLS-ready once the migration executes; `StatementRepository` remains separately blocked by Decision 6's empty-table problem, unrelated to RLS.
- `BACKWARD_COMPATIBILITY.md`: re-verified against the full file including Phase 2.6/Phase 8; new rows added to the Check 5 statement-type table for the backfill `UPDATE`s, the `SET NOT NULL` calls, and the `DROP POLICY`/`CREATE POLICY` pairs.
- `DATABASE_EXECUTION_PLAN.md`: RLS is no longer tracked as a separate execution step — it's part of the same single transaction as the rest of the migration.

---

## Decision 6 — Statements: documented as a Module 12B dependency, not patched

**Before:** `DATABASE_MIGRATIONS.sql` already didn't fabricate any `statements` rows or backfill `statement_transactions.statement_id` — this was already correct.

**Now:** Strengthened the documentation rather than changing behavior. Phase 0 found `statement_transactions` at 2,746 rows; a fresh check during this second pass found it's now **7,800 rows**, while `statements` is still at 0 — the gap is actively widening, not theoretical. `vw_statement_transactions`'s comment in `DATABASE_MIGRATIONS.sql` states explicitly: this is a Module 12B dependency, no backfill is attempted because the existing `statement_id` values (non-UUID synthetic strings written by Workflow D) aren't deterministically recoverable to a real statement, and inventing one would mean fabricating a link that never existed. Still true, more urgent.

**Changed:** Comment-only update in `DATABASE_MIGRATIONS.sql`; no SQL behavior change. `statements.user_id` (Decision 5, this pass) doesn't change this either — 0 rows means nothing to backfill there regardless of which columns exist on the table.

---

## Files touched by this revision

| File                                | First pass (Decisions 1–4, 6)                                                          | Second pass (Decision 5, this update)                                                                                      |
| ----------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_MIGRATIONS.sql`           | Decisions 1–4, 6                                                                       | + Phase 2.6 (ownership columns) + Phase 8 (RLS policies)                                                                   |
| `DATABASE_EXECUTION_PLAN.md`        | Capability note updated; file inventory extended                                       | RLS folded into the same execution step as the rest of the migration; ownership-confirmation flag added                    |
| `BACKWARD_COMPATIBILITY.md`         | Every check re-verified; counts corrected; `type` removed from deprecation candidates  | Re-verified again against Phase 2.6/Phase 8; Check 5 table extended with backfill/`SET NOT NULL`/policy rows               |
| `REPOSITORY_IMPLEMENTATION_PLAN.md` | Owner-type and OD↔Overdraft mappings added; RLS-readiness section added (2 of 8 ready) | RLS-readiness table updated (6 of 8 ready pending execution; `StatementRepository` separately blocked by Decision 6 only)  |
| `RLS_POLICY_PLAN.md`                | New — proposed 3 ready, stopped on 3 blocked                                           | Rewritten — all 6 approved and implemented in `DATABASE_MIGRATIONS.sql`; `transactions` correction documented before/after |
| `PHASE0_VERIFICATION.md`            | Unchanged                                                                              | Unchanged — still the original findings; this changelog and its subject file are what responded to it                      |

---

## What's safe to execute now vs. what still needs a decision

**Safe to execute as-is, no open technical questions:** `DATABASE_MIGRATIONS.sql` (Decisions 1–6 all resolved and implemented — Phase 2.6 + Phase 8 included), `DATABASE_SEED.sql` (untouched throughout, was already compliant).

**Requires your explicit human confirmation (not a technical decision — the technical work is done):** that `agrawalpurvak94@gmail.com` (the sole `auth.users` row, the UUID every existing owned row and every n8n workflow node already uses) is in fact the intended application owner. Strong supporting evidence, not something a query can prove on its own.

**Not something any SQL fixes:** the `statement_transactions.statement_id` linkage — Module 12B / Workflow D territory, documented, not patched, and growing (7,800 rows and counting).
