# DEV_DATA_RESET_PLAN.md

Read-only cleanup and reset-safety analysis, produced before any Module 12B implementation work. **No database, RLS, view, or n8n change was made to produce this report** — every number below comes from live, read-only queries against the current development Supabase project.

---

## 0. Reconciling the `statement_id` discrepancy (your item 6)

**Confirmed directly against live data**: `statement_id` is `NULL` on all 89,308 `statement_transactions` rows (`distinct statement_id = 0`). `statement_month` is _also_ `NULL` on all 89,308 rows.

This does not contradict `MODULE12B_N8N_AUDIT.md`'s earlier finding — it explains it. The live `Structured Transactions` node (Workflow D, native-parser path) computes:

```js
const statementMonth = data.statement_month || null
const statementId = statementMonth && messageId ? `${messageId}_${statementMonth}` : null
```

`messageId` is always a real string (sourced from the Gmail message id, which is never empty). `statementMonth` comes from `data.statement_month`, where `data` is the `CC Parser API`'s response body (`body.data`). Since `statement_month` is `NULL` on every single row with no exceptions, the most likely explanation is that the `cc-parser-api` microservice's actual response never includes a field named `data.statement_month` at all (wrong field name, different nesting, or the field simply isn't returned) — so `statementMonth` is always falsy, so `statementId`'s ternary always falls to `null`, on every row, every time. This is a single-point, deterministic explanation consistent 100% with the observed data, but **it is inferred from code, not confirmed by inspecting a real `cc-parser-api` response** (out of scope for this read-only frontend/DB audit). Recommend confirming with one real controlled execution (already planned as TEST 5 in `MODULE12B_N8N_AUDIT.md`) before relying on this explanation to design the fix.

Practical consequence for this reset plan: **`statement_id` was never actually populated with the synthetic string on any live row** — the 89,308 rows are unlinked (`NULL`), not mislinked. There is no synthetic-id collision or partial-linkage risk to reason about; every row is uniformly unlinked.

---

## 1. Current row counts (live, this session)

| Table                    | Row count |
| ------------------------ | --------- |
| `transactions`           | 14        |
| `statement_transactions` | 89,308    |
| `statements`             | 0         |
| `accounts`               | 7         |
| `clients`                | 3         |
| `merchant_memory`        | 83        |
| `categories`             | 24        |
| `application_settings`   | 9         |
| `banks`                  | 0         |
| `email_sources`          | 0         |
| `processed_messages`     | 0         |
| `audit_logs`             | 0         |
| `notifications`          | 0         |

---

## A. Tables that should be reset

**`transactions`** (14 rows) and **`statement_transactions`** (89,308 rows) — per your confirmation, this is disposable personal test data generated while building/testing the n8n workflows, not production/customer data. `statements` is already empty (0 rows) — nothing to reset there.

## B. Tables that must NOT be reset

- **`accounts`** (7 rows) — Purvak's real bank/card reference records (HDFC Savings, HDFC Current, Axis Current, ICICI Savings, AMEX Platinum, HDFC Millennia, SBI Cashback). This is master reference data, not transaction history — clearing `transactions`/`statement_transactions` does not touch it, and it should not be cleared itself.
- **`clients`** (3 rows) — the reconciled Personal/Business/Internal buckets. Reference data, not transaction history.
- **`categories`** (24 rows) — the canonical vocabulary reconciled during the Database Foundation phase. Foundational reference data.
- **`merchant_memory`** (83 rows) — **flagged as a genuine open question, not decided here.** These rows were learned from the same test transactions/statements now being marked disposable, but the mappings themselves (e.g. a normalized merchant → its correct category) have real reuse value going forward and are conceptually reference data, not transaction history. Per your instruction's own framing (item 4 asks me to confirm resetting `transactions`/`statement_transactions` doesn't affect "merchant_memory **structure**" — not its content), I have treated `merchant_memory` as **out of scope for this reset** by default. If you want its content cleared too (since it was learned from disposable data), that is a separate decision — say so explicitly and I'll produce the same kind of dependency analysis for it before touching it.
- **`application_settings`** (9 rows) — general app configuration, unrelated to transaction data.
- **RLS policies, views, table structures** — none of these are rows; nothing about a row-level `DELETE` touches any of them (see §4).

## C. Exact order of deletion/reset (foreign-key safe)

Verified directly against `information_schema` — the full FK graph touching these tables is:

```
accounts.client_id            → clients.id
categories.parent_category_id → categories.id            (self-referencing)
merchant_memory.default_category_id → categories.id
statements.account_id         → accounts.id
statements.client_id          → clients.id
transactions.account_id       → accounts.id
transactions.category_id      → categories.id
transactions.client_id        → clients.id
transactions.duplicate_of_id  → transactions.id           (self-referencing)
transactions.merchant_id      → merchant_memory.id
transactions.statement_id     → statements.id
```

All `delete_rule = NO ACTION` (no cascades configured anywhere).

Two facts make this reset trivially simple and low-risk:

1. **`statement_transactions` has no foreign key constraint at all** — it doesn't appear as either side of any FK in the live schema. Its `statement_id` column is a plain `uuid`, not an enforced reference. Deleting all its rows cannot violate any constraint and cannot be blocked by anything.
2. **Every one of `transactions`'s 5 FK columns is unset on all 14 live rows** — verified directly: `merchant_id_set = 0`, `category_id_set = 0`, `account_id_set = 0`, `client_id_set = 0` (and `statement_id`/`duplicate_of_id` are effectively the same, unbackfilled per every prior audit this session). Nothing points _from_ `transactions` to `accounts`/`clients`/`merchant_memory`/`categories`/`statements` in practice today, and nothing points _at_ `transactions` either (confirmed: 0 distinct accounts/clients referenced by any transaction or statement row).

**Recommended order** (though given the above, order genuinely does not matter for correctness — this is the conservative, obviously-safe sequence):

1. `DELETE FROM statement_transactions` (or `TRUNCATE`) — 89,308 rows, no dependents, no dependencies.
2. `DELETE FROM transactions` (or `TRUNCATE`) — 14 rows, no dependents (nothing references a transaction row), no populated dependencies to worry about.

No other table needs to be touched. `statements` is already empty. `accounts`/`clients`/`categories`/`merchant_memory`/`application_settings` are untouched by this order.

## D. Expected row counts after reset

| Table                    | Before | After                                       |
| ------------------------ | ------ | ------------------------------------------- |
| `transactions`           | 14     | **0**                                       |
| `statement_transactions` | 89,308 | **0**                                       |
| `statements`             | 0      | 0 (unchanged)                               |
| `accounts`               | 7      | 7 (unchanged)                               |
| `clients`                | 3      | 3 (unchanged)                               |
| `merchant_memory`        | 83     | 83 (unchanged, pending your decision above) |
| `categories`             | 24     | 24 (unchanged)                              |
| `application_settings`   | 9      | 9 (unchanged)                               |

## E. What data will remain after reset

- 7 real bank/card accounts, 3 clients, 24 canonical categories, 9 application settings, 83 merchant-memory mappings (see B) — every piece of genuine reference/master data stays intact.
- Zero transaction-level or statement-level financial records. Every list/detail page backed by `transactions`/`statement_transactions` will correctly show an honest empty state (per the existing Module 12A pattern — no view or repository code needs to change to handle zero rows; this is already the tested/verified behavior for `statements`, which has been empty throughout Module 12A).

## F. What Module 12A functionality remains intact

Confirmed by the same FK/view audit used for §C:

- **Views**: every `vw_*` view touching `transactions`/`statement_transactions` (`vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_statement_transactions`, `vw_dashboard_summary`, `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_transaction_trends`, `vw_account_transactions`, `vw_client_summary`, `vw_client_top_categories`, `vw_client_top_merchants`, `monthly_summaries`, and others) is a plain `SELECT` — none of them error on zero underlying rows, they just return empty/zero-aggregate results. This is not a new code path; it's the exact behavior already verified for `statements` (0 rows) throughout Module 12A.
- **RLS policies**: schema-level objects, entirely unaffected by row deletion. `own_tx_*`/`service_role_bypass` (transactions) and `own_statement_transactions_all` remain exactly as they are.
- **Module 12A repositories**: `SupabaseTransactionRepository`, `SupabaseAnalyticsRepository` (which composes it), and `SupabaseStatementRepository` were all built and tested to handle empty result sets correctly — this was explicitly exercised for Statements (always 0 rows) and is the same code path Transactions/Analytics will hit after this reset. No repository code depends on a minimum row count.
- **Authentication**: entirely unrelated — session bootstrap, `getCurrentUserId()`, and RLS ownership checks operate independently of how many transaction rows exist.
- **`merchant_memory` structure**: untouched regardless of whether its _content_ is later reset — no column, constraint, or index on `merchant_memory` depends on `transactions`/`statement_transactions` row counts.

**One real behavior change to expect, not a bug**: Analytics KPIs, category/merchant spend charts, and the Dashboard's transaction-derived widgets will show zero/empty after the reset (14 real transactions currently produce non-zero numbers today). This is the correct, honest consequence of removing test data — flagging it so it isn't mistaken for a regression when you next open those pages.

## G. Selective deletion vs. a full clean development reset

**Recommend selective deletion — do not do a full reset.** Reasoning:

- The FK/dependency audit (§C) shows `transactions` and `statement_transactions` are already fully isolated in practice (zero populated FKs in either direction) — there is no structural reason a full reset would be _safer_; the two are equivalent from a data-integrity standpoint.
- A full reset would additionally discard your 7 real accounts, 3 clients, and the 24-category vocabulary that took multiple reconciliation passes to get right this session — none of that is disposable test data by your own description ("all existing financial **transaction** data... is personal test data"), and re-entering it would be pure rework with no safety benefit.
- The only genuinely open question is `merchant_memory` (§B) — if you want that cleared too, it's a small, well-scoped addition to this same plan (83 rows, same "no FK dependents" shape, since nothing references `merchant_memory` except `transactions.merchant_id`, which is already confirmed unset on all 14 rows) — not a reason to widen the reset to accounts/clients/categories as well.

---

**Stopping here, per instruction.** No `DELETE`, `TRUNCATE`, `DROP`, `UPDATE`, or `ALTER` was executed. No n8n workflow was modified. Waiting for your explicit approval — and your decision on `merchant_memory` — before any reset is executed.
