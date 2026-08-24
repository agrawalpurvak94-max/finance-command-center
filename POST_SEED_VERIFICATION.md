# POST_SEED_VERIFICATION.md

Independent post-execution verification of `DATABASE_SEED.sql` against the live development Supabase project (`cnxfrlirhycbqnwfxvpm`), run immediately after `DATABASE_MIGRATIONS.sql` was verified per `POST_MIGRATION_VERIFICATION.md`.

---

## Execution summary

|                           |                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Executed**              | 2026-08-19 (this session, immediately following the migration)                                                                         |
| **Method**                | Same direct Postgres connection, `DATABASE_SEED.sql` run unmodified as a single transaction (`BEGIN...COMMIT`, as written in the file) |
| **Result**                | ✅ **SUCCESS** — committed on first attempt, no errors                                                                                 |
| `DATABASE_MIGRATIONS.sql` | Not modified                                                                                                                           |
| `FUTURE_VIEWS.sql`        | Not executed                                                                                                                           |
| n8n workflows             | Not touched — confirmed via `git status`, both files still untracked/unmodified (`??`), identical to every prior check                 |
| Git                       | Nothing committed                                                                                                                      |

---

## Records inserted

| Table                                                                                                              | Rows before | Rows after | Inserted                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------ | ----------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `categories`                                                                                                       | 9           | 21         | **12** (the Gemini-enum gap values: Business, Education, Fees & Charges, Groceries, Insurance, Investment, Personal Care, Rent, Subscriptions, Transfer, Transport, Uncategorized) |
| `application_settings`                                                                                             | 0           | 9          | **9** (general×3, ai×2, integrations×2, accounts×2 — exactly as designed)                                                                                                          |
| `clients`                                                                                                          | 3           | 3          | **0** — `WHERE NOT EXISTS` correctly no-op'd; all 3 already existed                                                                                                                |
| `merchant_memory`                                                                                                  | 79          | 79         | **0** — no new merchant rows, as required                                                                                                                                          |
| `accounts`, `statements`, `transactions`, `statement_transactions`, `banks`, `email_sources`, `processed_messages` | —           | —          | **0** — this seed file has no `INSERT` targeting any of these                                                                                                                      |

## Records updated

| Table             | Rows affected                                                                                     | What changed                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `clients`         | 3                                                                                                 | `client_type` backfilled: Business→`company`, Internal→`business_unit`, Personal→`personal` |
| `merchant_memory` | 79 (status/has_rules/aliases columns — effectively no-ops, see below), 54 (`default_category_id`) | See item 4 below                                                                            |

## Records intentionally not created

Per instruction, and confirmed by design: no bank accounts, credit cards, balances, statements, transactions, or client financial data. `accounts_untouched_sample` (below) confirms all 7 real accounts still show `current_balance: null, credit_limit: null` — untouched.

---

## Verification results (all 10 items)

**1. Seed categories exist, no duplicates.** ✅ All 21 category names each appear exactly once (`GROUP BY name` → every count is `1`). The 12 new ones are present; the original 9 are untouched.

**2. Existing categories/merchant records not duplicated.** ✅ `categories` grew by exactly 12 (9→21, matching the `INSERT` count). `merchant_memory` stayed at exactly 79 — zero new rows.

**3. Client backfill correct.** ✅ All 3 clients now carry the intended `client_type`, matching `DATABASE_SEED.sql`'s documented best-guess mapping exactly: `Business→company`, `Internal→business_unit`, `Personal→personal`. `user_id` unchanged (still the verified owner UUID on all 3, from the migration's Phase 2.6 backfill).

**4. Merchant-memory defaults/backfills correct.** ✅ `status='active'` on 79/79, `has_rules=false` on 79/79, `aliases='{}'` on 79/79 — these were already set by the migration's column `DEFAULT`s, so the seed's defensive `UPDATE ... WHERE status IS NULL` etc. correctly found nothing to change (0 actual updates, matching the file's own comment that these are "defensive no-ops"). `default_category_id` was newly backfilled on **54 of 79** rows by matching `merchant_memory.category` against the now-21-row `categories` table. The remaining **25 rows** (8 distinct category values: `Airlines`, `Bank Charges`, `Dining`, `EMI`, `Food Delivery`, `Income`, `Software`, `Taxi`) stay unresolved — these category strings don't match any of the 21 category names, seeded or original. This is correct, honest behavior: the seed only performs exact-name matching and does not guess — flagged here as a finding, not a bug (see Warnings).

**5. `application_settings` defaults exist and correct.** ✅ All 9 rows present with the exact category/key/value pairs designed: `general.app_name`, `general.default_currency`, `general.timezone`, `ai.categorization_confidence_threshold`, `ai.merchant_memory_auto_learn`, `integrations.workflow_a_active`, `integrations.workflow_b_active`, `accounts.low_balance_threshold`, `accounts.high_utilization_threshold_percent`. None marked `is_sensitive`.

**6. No financial records fabricated.** ✅ Confirmed directly — all 7 `accounts` rows still show `current_balance: null` and `credit_limit: null`, unchanged from before the seed. No `statements`, `transactions`, or credit card rows were created.

**7. Existing row counts intact except intended changes.** ✅ `transactions`=14, `accounts`=7, `clients`=3, `statements`=0, `banks`=0, `email_sources`=0, `processed_messages`=0 — all identical to pre-seed. Only `categories` (9→21) and `application_settings` (0→9) changed, both as designed. `statement_transactions` grew organically (33,686→33,826, +140) from ongoing n8n activity, unrelated to this seed.

**8. RLS policies remain intact.** ✅ Still exactly 15 policies, identical set to the post-migration state — the seed touches no policy.

**9. All 24 migration views remain executable.** ✅ Re-queried every one individually; all returned successfully. `vw_categories` now correctly reflects 21 rows (up from 9), confirming the view picks up the new seed data live, as designed.

**10. n8n workflow files remain untouched.** ✅ Confirmed via `git status` — both files still show as untracked/unmodified, exactly as before this step and every step before it.

---

## Warnings

- **25 of 79 `merchant_memory` rows still have `default_category_id IS NULL`** — their `category` values (`Airlines`, `Bank Charges`, `Dining`, `EMI`, `Food Delivery`, `Income`, `Software`, `Taxi`) don't match any of the 21 categories now in the table (the original 9 + the 12 seeded from the Gemini enum gap identified in `N8N_DATABASE_MAPPING.md`). This means either: (a) Workflow D or another path uses a _third_ category vocabulary not yet accounted for, or (b) these are legitimate categories that were simply never part of the enum this phase's gap-analysis was built from. Not fixed here — flagged for a follow-up decision (extend `categories` again once this list is understood, or normalize these merchants' `category` values at the source). No functional harm today: these rows just behave as they did before the seed (free-text `category` still populated, only the FK resolution is incomplete).

No other warnings.

---

**Stopping here, per instruction.** Module 12A not started. Repositories not modified. Waiting for explicit approval before the next step.
