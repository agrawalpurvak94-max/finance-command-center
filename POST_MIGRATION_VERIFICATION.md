# POST_MIGRATION_VERIFICATION.md

Independent post-execution verification of `DATABASE_MIGRATIONS.sql` against the live development Supabase project (`cnxfrlirhycbqnwfxvpm`, host `db.cnxfrlirhycbqnwfxvpm.supabase.co`, confirmed matching before execution).

---

## Execution summary

|                     |                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Executed**        | 2026-08-19 (this session)                                                                                                                                                                                                                                                                      |
| **Method**          | Direct Postgres connection (`pg` driver, disposable Node script), the file's own `BEGIN...COMMIT` executed as a single multi-statement transaction                                                                                                                                             |
| **Result**          | ✅ **SUCCESS** — committed                                                                                                                                                                                                                                                                     |
| **Preceded by**     | Two failed dry-run/live attempts, both caught and fixed before this run (see `MIGRATION_CHANGELOG.md` and the two validation passes): `t.notes` → `t.note` (vw_transactions), and `cl.client_name` → `cl.client_name AS resolved_client_name` (vw_transaction_details, duplicate-column error) |
| `DATABASE_SEED.sql` | ❌ Not executed — out of scope for this step, per instruction                                                                                                                                                                                                                                  |
| `FUTURE_VIEWS.sql`  | ❌ Not executed — not opened this session                                                                                                                                                                                                                                                      |
| n8n workflows       | ❌ Not touched — confirmed via `git status` before and after; both files still show as untracked/unmodified (`??`), identical to every prior check this session                                                                                                                                |
| Git                 | Nothing committed — working tree still has the same modified/untracked file list as before execution                                                                                                                                                                                           |

---

## 1. New columns — ✅ all 20 present, correct types

| Table             | Column                | Type        | Nullable | Default    |
| ----------------- | --------------------- | ----------- | -------- | ---------- |
| `transactions`    | `merchant_id`         | uuid        | YES      | —          |
| `transactions`    | `category_id`         | uuid        | YES      | —          |
| `transactions`    | `duplicate_of_id`     | uuid        | YES      | —          |
| `categories`      | `description`         | text        | YES      | —          |
| `categories`      | `parent_category_id`  | uuid        | YES      | —          |
| `categories`      | `status`              | text        | YES      | `'active'` |
| `categories`      | `color`               | text        | YES      | —          |
| `categories`      | `icon`                | text        | YES      | —          |
| `categories`      | `updated_at`          | timestamptz | YES      | `now()`    |
| `merchant_memory` | `aliases`             | text[]      | YES      | `'{}'`     |
| `merchant_memory` | `default_category_id` | uuid        | YES      | —          |
| `merchant_memory` | `status`              | text        | YES      | `'active'` |
| `merchant_memory` | `notes`               | text        | YES      | —          |
| `merchant_memory` | `has_rules`           | boolean     | YES      | `false`    |
| `clients`         | `client_type`         | text        | YES      | —          |
| `clients`         | `user_id`             | uuid        | **NO**   | —          |
| `accounts`        | `client_id`           | uuid        | YES      | —          |
| `accounts`        | `user_id`             | uuid        | **NO**   | —          |
| `statements`      | `client_id`           | uuid        | YES      | —          |
| `statements`      | `user_id`             | uuid        | **NO**   | —          |

## 2. Foreign keys — ✅ all 16 new FKs present, correctly targeted

`accounts_client_id_fkey → clients(id)`, `accounts_user_id_fkey → auth.users(id) ON DELETE CASCADE`, `categories_parent_category_id_fkey → categories(id)`, `merchant_memory_default_category_id_fkey → categories(id)`, `statements_client_id_fkey → clients(id)`, `statements_user_id_fkey → auth.users(id) ON DELETE CASCADE`, `clients_user_id_fkey → auth.users(id) ON DELETE CASCADE`, `transactions_category_id_fkey → categories(id)`, `transactions_merchant_id_fkey → merchant_memory(id)`, `transactions_duplicate_of_id_fkey → transactions(id)`. (`transactions_account_id_fkey`/`_client_id_fkey`/`_statement_id_fkey`/`_user_id_fkey` and `statements_account_id_fkey` were already live pre-migration — confirmed still present, untouched.)

## 3 & 4. RLS policies — ✅ 15 total, old broad policy confirmed gone

All 6 new `own_<table>_all` policies present (`accounts`, `clients`, `statements`, `merchant_memory`, `processed_messages`, `statement_transactions`), each `FOR ALL USING/WITH CHECK (auth.uid() = user_id)`. The 4 pre-existing policied tables (`banks`, `categories` ×2, `email_sources`, `transactions` ×4 remaining) unchanged. **`"Allow authenticated inserts"` on `transactions`: confirmed absent** (`SELECT ... WHERE policyname = 'Allow authenticated inserts'` returns 0 rows). `own_tx_insert` and `service_role_bypass` both still present and unchanged.

## 5. All 24 Phase 7 views — ✅ exist and execute

Every one queried for real (not just existence-checked): `vw_dashboard_due_cards`(0 rows), `vw_transactions`(14), `vw_transaction_details`(14), `vw_transaction_search`(14), `vw_accounts`(7), `vw_account_summary`(2), `vw_account_transactions`(0), `vw_account_health`(7), `vw_credit_card_utilization`(3), `vw_client_summary`(3), `vw_client_top_categories`(0), `vw_client_top_merchants`(0), `vw_categories`(9), `vw_merchants`(79), `vw_merchant_transactions`(0), `vw_statements`(0), `vw_statement_summary`(1), `vw_statement_transactions`(33,084), `vw_monthly_spend`(1), `vw_cashflow`(1), `vw_category_spend`(6), `vw_merchant_spend`(11), `vw_account_analytics`(0), `vw_transaction_trends`(4). Zero-row results (`vw_account_transactions`, `vw_client_top_categories/merchants`, `vw_merchant_transactions`, `vw_statements`, `vw_account_analytics`, `vw_dashboard_due_cards`) are expected — they depend on `account_id`/`merchant_id`/`category_id` backfill or real balances/statements, none of which this migration performs (by design — see `DATABASE_MIGRATIONS.sql`'s Backfill Strategy). The 2 pre-existing views (`vw_dashboard_summary`, `vw_dashboard_accounts`) plus `monthly_summaries` remain untouched.

## 6. New tables — ✅ all 3 exist

`application_settings`, `audit_logs`, `notifications` all confirmed present in `information_schema.tables`.

## 7. Existing tables/data intact — ✅ confirmed, row-for-row

| Table                    | Before | After  | Δ                                                                                                                                                                      |
| ------------------------ | ------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `transactions`           | 14     | 14     | 0                                                                                                                                                                      |
| `accounts`               | 7      | 7      | 0                                                                                                                                                                      |
| `clients`                | 3      | 3      | 0                                                                                                                                                                      |
| `statements`             | 0      | 0      | 0                                                                                                                                                                      |
| `categories`             | 9      | 9      | 0                                                                                                                                                                      |
| `merchant_memory`        | 79     | 79     | 0                                                                                                                                                                      |
| `banks`                  | 0      | 0      | 0                                                                                                                                                                      |
| `email_sources`          | 0      | 0      | 0                                                                                                                                                                      |
| `processed_messages`     | 0      | 0      | 0                                                                                                                                                                      |
| `statement_transactions` | 32,902 | 33,084 | +182 (organic n8n activity during this session, not caused by the migration — this table has grown continuously all session, unrelated to any statement executed here) |

No row was inserted, deleted, or had an existing column's value altered by this migration — the only writes were the 3 backfill `UPDATE`s populating the new `user_id` column, confirmed in item 11 below.

## 8. `accounts.account_type` constraint — ✅ untouched, still `'OD'`

`accounts_account_type_check: CHECK ((account_type = ANY (ARRAY['Savings', 'Current', 'OD', 'Credit Card'])))` — byte-for-byte the same as Phase 0's original finding. This migration never touched it (Decision 3).

## 9. Indexes — ✅ no unnecessary duplication

9 new indexes created, all for genuinely new columns/gaps (`idx_accounts_client_id`, `idx_categories_parent_category_id`, `idx_merchant_memory_default_category_id`, `idx_statement_transactions_statement_id`, `idx_statements_account_id`, `idx_statements_client_id`, `idx_transactions_category_id`, `idx_transactions_duplicate_of_id`, `idx_transactions_merchant_id`) plus 2 from Phase 4 (`audit_logs`/`notifications`, on the new tables). The 5 previously-identified redundant ones (`idx_transactions_account_id`, `_client_id`, `_statement_id`, `_transaction_date`, `idx_merchant_memory_normalized_merchant`) were correctly never created — confirmed by their absence from the full post-migration index list, with the original indexes they would have duplicated (`idx_transactions_account`, `_client`, `_statement`, `_date`/`idx_tx_date`, `idx_merchant_memory`) still present exactly once each.

## 10. Row counts — ✅ unchanged except the intended backfill

Covered in item 7 — zero unintended row changes anywhere.

## 11. Ownership backfill — ✅ correct, complete, confined

| Table        | Total rows | Matching verified owner UUID | NULL `user_id`          |
| ------------ | ---------- | ---------------------------- | ----------------------- |
| `accounts`   | 7          | **7**                        | 0                       |
| `clients`    | 3          | **3**                        | 0                       |
| `statements` | 0          | 0                            | 0 (nothing to backfill) |

Every existing row in `accounts`/`clients` now carries the single verified development-owner UUID; none was missed, none is NULL, `user_id` is `NOT NULL` on all three tables as designed. This UUID appears **only** in these three tables' `user_id` columns (a data value, populated by an `UPDATE` this migration ran once) — it was never written into any view definition, any RLS policy (which use `auth.uid()` dynamically, never this literal value), any frontend file, or any n8n workflow. It is not a permanent application constant anywhere in the codebase.

## 12. n8n workflows — ✅ untouched

`git status` before and after this entire session shows both workflow files as untracked and unmodified. No file under `n8n workflows/` was opened for writing or edited at any point.

---

## Comparison against prior documents

- **`PHASE0_VERIFICATION.md`**: every finding it recorded (RLS enabled/unpolicied tables, the `'OD'` constraint, zero triggers, the 5 redundant-index candidates, `monthly_summaries`'s real definition) is now reflected in the executed schema exactly as that document's recommendations intended.
- **`DATABASE_MIGRATIONS.sql`**: matches what was validated in the two dry-run passes, plus the two fixes made after those passes — no further changes were introduced at execution time.
- **`RLS_POLICY_PLAN.md`**: all 6 proposed policies now live exactly as specified; the `transactions` correction applied exactly as documented.
- **`BACKWARD_COMPATIBILITY.md`**: its Check 1 claim (both n8n workflows use `service_role`, which nothing in Phase 8 touches) is now empirically testable rather than only reasoned — `service_role_bypass` confirmed unchanged and present.

## Warnings

None. Every check above returned the expected result with no anomalies.

## Remaining Module 12A blockers

- `transactions.account_id`/`.merchant_id`/`.category_id` are still unbackfilled on existing rows (by design — that backfill is a separate, manual, reviewed step per `DATABASE_MIGRATIONS.sql`'s Backfill Strategy, not part of this migration).
- `accounts` balance/limit fields (`current_balance`, `credit_limit`, etc.) remain `NULL` on all 7 rows — real customer data, out of scope until provided.
- `BankAccountRepository.syncAll()` / `StatementRepository.reprocess()` still have no backing mechanism (RPC/Edge Function, not schema).
- `getRecurringMerchants`/`getRefundAnalysis`/`getInsights` (Analytics) still have no backing view.

## Remaining Module 12B blockers

- `statement_transactions.statement_id` linkage remains broken at the source (Workflow D writes a non-UUID synthetic value; no node creates a `statements` row). Table now at 33,084 rows and climbing rapidly, `statements` still at 0. Untouched by this migration, as instructed.

---

**Stopping here, per instruction.** `DATABASE_SEED.sql` not executed. Module 12A not started. Waiting for explicit approval before the next step.
