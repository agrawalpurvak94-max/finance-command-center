# CATEGORY_VOCABULARY_RECONCILIATION_RESULT.md

Execution and verification result for the canonical category mapping Purvak approved on 2026-08-19 (see `CATEGORY_VOCABULARY_RECONCILIATION.md`). Executed against the live development Supabase project (`cnxfrlirhycbqnwfxvpm`) via the same direct-Postgres connection used for every prior Database Foundation step.

---

## 0. Final read-only pre-verification (all 8 items, immediately before execution)

| #   | Check                                                                        | Result                                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `categories` table                                                           | 21 rows, unchanged since `POST_SEED_VERIFICATION.md`                                                                                                                                         |
| 2   | `merchant_memory.category` values                                            | 20 distinct values; 8 unresolved (Airlines=4, Bank Charges=1, Dining=7, EMI=1, Food Delivery=2, Income=1, Software=2, Taxi=7 — sum 25, matching prior report exactly)                        |
| 3   | `statement_transactions.category` values                                     | Same 16 distinct values as the reconciliation report; row counts had grown organically (33,826 → 39,832) from ongoing n8n Workflow D activity between sessions — vocabulary itself unchanged |
| 4   | `transactions.category` values                                               | Unchanged: Business, Food, Fuel, Investment, Shopping, Uncategorized                                                                                                                         |
| 5   | Workflow C vocabulary                                                        | Re-confirmed unchanged (not re-extracted again — no code changed since the prior read)                                                                                                       |
| 6   | Workflow D vocabulary                                                        | Re-confirmed unchanged                                                                                                                                                                       |
| 7   | Keyword/rules vocabulary ("Merchanet Rules")                                 | Re-confirmed unchanged                                                                                                                                                                       |
| 8   | Dynamic category lookup path ("Load categories" → "Claude Haiku categorize") | Re-confirmed unchanged                                                                                                                                                                       |

No drift had occurred since the reconciliation report was written; safe to proceed.

---

## 1. Execution summary

|                                                 |                                                                                                                                                                                        |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Method                                          | New file `DATABASE_CATEGORY_NORMALIZATION.sql`, dry-run validated first (`BEGIN...ROLLBACK`, confirmed zero errors and expected row counts), then executed for real (`BEGIN...COMMIT`) |
| Result                                          | ✅ **SUCCESS** — committed on first real attempt, no errors                                                                                                                            |
| `DATABASE_MIGRATIONS.sql` / `DATABASE_SEED.sql` | Not modified, not re-run                                                                                                                                                               |
| n8n workflows                                   | Not touched                                                                                                                                                                            |
| Frontend / repositories                         | Not touched                                                                                                                                                                            |
| Git                                             | Nothing committed                                                                                                                                                                      |

## 2. Mapping counts (rows changed per mapping)

| Mapping                                           | `merchant_memory` rows | `statement_transactions` rows |
| ------------------------------------------------- | ---------------------- | ----------------------------- |
| Taxi → Transport                                  | 7                      | 6                             |
| Airlines → Travel                                 | 4                      | 2                             |
| Bank Charges → Fees & Charges                     | 1                      | 2,838                         |
| Dining → Food                                     | 7                      | 2,844                         |
| Food Delivery → Food                              | 2                      | 2,843                         |
| Software → SaaS Software                          | 2                      | 5,676                         |
| EMI → Loans & EMI                                 | 1                      | 2,838                         |
| Income → Income _(no-op rename; target = source)_ | 1                      | 0                             |
| **Total rows updated**                            | **25**                 | **17,047**                    |

`merchant_memory.default_category_id` backfill: **25 rows** newly resolved (matches the 25 previously-`NULL` rows exactly).

New categories created: **3** — `SaaS Software`, `Loans & EMI`, `Income`. Total categories: 21 → **24**.

## 3. Before / after counts

| Metric                                             | Before        | After                                                |
| -------------------------------------------------- | ------------- | ---------------------------------------------------- |
| `categories`                                       | 21            | 24                                                   |
| `merchant_memory` (rows)                           | 79            | 79                                                   |
| `merchant_memory` unresolved `default_category_id` | 25            | **0**                                                |
| `statement_transactions` (rows)                    | 39,832        | 39,832                                               |
| `transactions` (rows)                              | 14            | 14                                                   |
| `accounts` / `clients` (rows)                      | 7 / 3         | 7 / 3                                                |
| `transactions` sum(amount)                         | 771,106.00    | 771,106.00 (unchanged)                               |
| `statement_transactions` sum(amount)               | 45,752,076.36 | 45,752,076.36 (unchanged, same transaction snapshot) |

All row counts and financial sums captured before and after inside the same script/session are **identical** — confirming the operation touched only the `category` / `default_category_id` columns.

_(Note: a slightly later, independent verification pass — run seconds afterward as a separate connection — shows `statement_transactions` having grown further, to 39,902/39,916 rows, and its amount sum to 45,832,360.46. This is n8n Workflow D inserting new statement rows in the background between scripts, consistent with the same pattern already observed and documented in `POST_SEED_VERIFICATION.md`. It is unrelated to this normalization — no `amount`, `date`, `merchant`, `account`, `client`, or `statement` column was ever written by `DATABASE_CATEGORY_NORMALIZATION.sql`.)_

## 4. Remaining unmatched values

**None.** `merchant_memory` unresolved `default_category_id` count is **0**. A direct query for any of the 7 truly-obsolete legacy values (`Taxi, Airlines, Bank Charges, Dining, EMI, Food Delivery, Software`) remaining in either `merchant_memory.category` or `statement_transactions.category` returned **zero rows** in both tables.

_(`Income` is excluded from the "obsolete" check by design — its canonical name is identical to its legacy name, so it was never expected to disappear, only to gain a matching `categories` row and resolved FK, which it now has.)_

## 5. Integrity checks

| Check                                                                 | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No merchant_memory rows remain with an obsolete category value        | ✅ Confirmed (0 rows)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| No statement_transactions rows remain with an obsolete category value | ✅ Confirmed (0 rows)                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Every merchant_memory category has a valid `default_category_id`      | ✅ 79/79 resolve to a `categories` row with a matching `name`                                                                                                                                                                                                                                                                                                                                                                                                    |
| No duplicate category master records                                  | ✅ `GROUP BY name HAVING count(*) > 1` returns 0 rows; 24 total, each name unique                                                                                                                                                                                                                                                                                                                                                                                |
| Existing categories not renamed unnecessarily                         | ✅ All 21 pre-existing rows' `name`/`description`/`color` are byte-identical to `POST_SEED_VERIFICATION.md`'s snapshot                                                                                                                                                                                                                                                                                                                                           |
| Row counts unchanged (except intended)                                | ✅ `merchant_memory`=79, `transactions`=14, `accounts`=7, `clients`=3 all unchanged; only `categories` (21→24, intended) changed by this operation                                                                                                                                                                                                                                                                                                               |
| Transaction financial values unchanged                                | ✅ `transactions` sum, and every row's `amount`, confirmed unchanged (0 NULL amounts introduced in either table)                                                                                                                                                                                                                                                                                                                                                 |
| RLS policies unchanged                                                | ✅ Still exactly the same 15 policies, identical names/tables, as `POST_SEED_VERIFICATION.md`                                                                                                                                                                                                                                                                                                                                                                    |
| All existing views still execute                                      | ✅ All 23 Phase-7 views plus `vw_dashboard_summary`/`vw_dashboard_accounts` execute successfully. (One name in my own check list, `vw_dashboard_cashflow`, does not exist — cross-referenced against `DATABASE_MIGRATIONS.sql`'s actual `CREATE VIEW` statements and confirmed this view was never created by any migration; it is a naming artifact in the verification script, not a regression. `vw_cashflow`, the view that actually exists, executes fine.) |

## 6. Anomalies

- **None caused by this operation.** The only observation worth recording is the ongoing organic growth of `statement_transactions` from live n8n Workflow D activity during the verification window (§3 note) — expected, already documented in prior reports, unrelated to category normalization.
- The pre-existing near-uniform row-count clustering in `statement_transactions` noted in `CATEGORY_VOCABULARY_RECONCILIATION.md` §3 (possible synthetic/test data) persists after normalization, since normalization only renamed category text — it did not touch row provenance. Still flagged for awareness only, not resolved here.

## 7. Confirmation

No financial data was changed. No transaction amounts, dates, merchants, accounts, clients, or statements were modified. No rows were deleted or fabricated. `transactions.type` (owner/direction signal) was not touched. No n8n workflow was modified. No frontend or repository code was modified. Only `categories` (3 new rows) and the `category` / `default_category_id` columns on `merchant_memory` and `statement_transactions` were changed, exactly as approved.

---

**Stopping here, per instruction.** Proceeding to Phase 3 (n8n analysis only, read-only, no workflow edits).
