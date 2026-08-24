# Frontend Data Contract

Verified against live Supabase (2026-08-22), not assumed from prior documentation — several
existing code comments in this repo predate recent Workflow C/D fixes and are stale (noted
inline below where that matters).

Architecture: `Page → Hook → Service → Repository → Supabase` (frozen, per `CLAUDE.md`).
`transactions` (Workflow C, real-time) and `statements` + `statement_transactions` (Workflow D,
monthly PDFs) are separate datasets and are never combined into one total — see
[Double Counting](#double-counting-rule) at the end of this document.

Classification used throughout:

- **DIRECT** — read straight off a column.
- **RELATIONSHIP** — read via a foreign key / joined view column.
- **CALCULATED** — computed client-side (in a repository's `fetchActivity()`/`mapRow()`, or in
  `analytics.repository.ts`'s in-memory aggregation) from other rows.

---

## Transactions (real-time, Workflow C)

Source: `public.transactions` (writes) / `public.vw_transactions` (list) / `public.vw_transaction_details` (detail).
Repository: `src/repositories/supabase-transaction.repository.ts`.

| UI field                  | Table.Column                                                                               | Kind         | Notes                                                                                                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------ | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| date                      | `transactions.transaction_date`                                                            | DIRECT       |                                                                                                                                                                                   |
| amount                    | `transactions.amount`                                                                      | DIRECT       |                                                                                                                                                                                   |
| merchant                  | `vw_transactions.merchant_name` (fallback: none — `merchant_id` FK unpopulated, see below) | RELATIONSHIP | `merchant.id` is `merchant_id` when set, else synthesized as the merchant name string (`resolvedMerchant()`, repo line ~142)                                                      |
| category                  | `vw_transactions.category_name`                                                            | RELATIONSHIP | Same synthesized-id pattern: `category.id` is `category_id` when set, else the category **name** (repo line ~144-146)                                                             |
| client                    | `vw_transactions.client_name`                                                              | RELATIONSHIP |                                                                                                                                                                                   |
| account/card, bank, last4 | `vw_transactions.account_name/bank_name/account_last4/account_type`                        | RELATIONSHIP | Falls back to a free-text second query (`fetchFreeTextAccounts`) when `account_id` is null on a row                                                                               |
| direction (debit/credit)  | `transactions.transaction_type`                                                            | DIRECT       | Not on the view; fetched via a second query (`fetchDirection`) — **do not confuse with `transactions.type`**, which is business/personal ownership, a completely different column |
| status                    | `vw_transactions.status`/`raw_status`                                                      | DIRECT       |                                                                                                                                                                                   |

**Confirmed live**: `transactions.account_id` **is** populated on real rows (verified: e.g. Amazon
Now transaction has a real `account_id` UUID) — this contradicts an older repo comment claiming
it's universally unbackfilled; that was true before the Workflow C account-resolution fix
(2026-08-21/22) landed. `merchant_id` and `category_id` remain **null on every live row** —
Workflow C's `Build Final Transaction Row` only ever writes the free-text `merchant`/`category`
columns, never resolves the FK. This is the confirmed root cause of two live bugs, documented in
the discovery report delivered alongside this file.

## Statements (Workflow D)

Source: `public.statements` / `public.vw_statements` / `public.vw_statement_summary`.
Repository: `src/repositories/supabase-statement.repository.ts`.

| UI field                                                                      | Table.Column                                                                                                        | Kind                                                                  |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| account_id → linked account                                                   | `statements.account_id`                                                                                             | RELATIONSHIP (now populated by Workflow D Phase 8 account resolution) |
| statement period, due date, minimum due, statement total due, closing balance | `statements.statement_period_start/end`, `due_date`, `minimum_due`, `statement_total_amount_due`, `closing_balance` | DIRECT (parser-owned, per Workflow D Phase 3/5 fixes)                 |
| processing status                                                             | `statements.processing_status`                                                                                      | DIRECT (`processing` / `completed` / `needs_review`)                  |
| notes (incl. account-match provenance)                                        | `statements.notes`                                                                                                  | DIRECT                                                                |

**No Statement Details route or Statement Transactions UI exists in the frontend today** — see
discovery report.

## Statement Transactions (Workflow D line items)

Source: `public.statement_transactions`, filtered by `statement_id`.

**Zero rows exist in the live table as of this check.** No frontend code reads this table at all
currently (confirmed by exhaustive grep). Any UI built against it cannot be end-to-end verified
against real data until a statement is processed without its transactions being cleared
afterward — this has been an intermittent issue throughout recent Workflow D testing.

`statement_transactions` has **no `account_id` column** — by design, per the established
relationship: `statement_transactions.statement_id → statements.id → statements.account_id →
accounts.id`. Do not add one.

## Accounts / Credit Cards

Source: `public.accounts` via `public.vw_accounts` (filtered by `account_kind`), `vw_account_summary`, `vw_account_health`, `vw_credit_card_utilization`.
Repositories: `src/repositories/supabase-bank-account.repository.ts`, `src/repositories/supabase-credit-card.repository.ts`.

| UI field                                         | Kind                                                                            | Notes                                                                                                                                                                                |
| ------------------------------------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| credit limit, outstanding, minimum due, due date | DIRECT                                                                          | `accounts.credit_limit/current_balance/minimum_due/payment_due_date` — mostly null on manually-seeded rows, real on Workflow-D-created ones                                          |
| available credit                                 | DIRECT if `available_credit` set, else CALCULATED `max(0, limit - outstanding)` |                                                                                                                                                                                      |
| utilization %                                    | DIRECT                                                                          | from `vw_credit_card_utilization`                                                                                                                                                    |
| monthly spend, top merchant, top category        | CALCULATED                                                                      | client-side sum over `transactions` filtered by `account_id` + current month — now functional now that `account_id` is backfilled (was previously reading 0 per stale repo comments) |
| health                                           | DIRECT                                                                          | from `vw_account_health`, validated against a known enum with a safe fallback (a prior unvalidated cast crashed this page — do not regress)                                          |

## Merchant Center

Source: `public.merchant_memory` via `public.vw_merchants`.

| UI field                                            | Kind               | Notes                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| transaction_count, total_spend, last_transaction_at | DIRECT (from view) | **Confirmed reading 0 for every merchant** — `vw_merchants`'s subqueries join on `transactions.merchant_id`, which is never populated (see Transactions section). This is documented in the view's own SQL comment (`DATABASE_MIGRATIONS.sql:899-900`) as a known, deliberate limitation at the time the view was written — not a new regression. |
| average_transaction                                 | CALCULATED         | `total_spend / transaction_count`, client-side                                                                                                                                                                                                                                                                                                    |

## Categories

Source: `public.categories` via `public.vw_categories`; `uncategorized` count via a live query against `transactions.category_id IS NULL`.

RLS note (confirmed, still current): all 24 default categories have `user_id = NULL`, and the
`own_cat_all` policy only allows edits to categories the current user owns — editing/deleting a
default category silently affects 0 rows and the repository throws accordingly. This is existing,
documented behavior, not something this task changes.

## Dashboard / Analytics

`dashboard.service.ts` composes `analyticsService`, `bankAccountRepository`, `creditCardRepository`,
`transactionRepository` — no direct Supabase access. `analytics.service.ts`/`supabase-analytics.repository.ts`
fetches up to 10,000 `transactions` rows via the transaction repository and aggregates entirely
client-side; `dashboard.service.ts`'s MTD spend/income figures call the **same**
`analyticsService.getSummary()` Analytics itself uses, so Dashboard MTD Spend and Analytics MTD
Spend are guaranteed identical by construction (same function call), not by convention.

## Double-Counting Rule

`transactions` (Workflow C) is the sole input to every Dashboard and Analytics financial total
today. `statement_transactions` is not read by any dashboard/analytics calculation and has zero
live rows regardless. **No double-counting is currently possible because there is nothing to
double-count with yet** — this becomes a real constraint only once Statement Transactions UI +
reconciliation exist and someone might be tempted to sum both sources. Documented here so that
constraint isn't forgotten when that's built: any future statement-level reporting must either
(a) read only `statements`-level aggregate columns (`total_debits`/`total_credits`, already
computed by Workflow D from the authoritative `statement_transactions` set) for statement-scoped
views, or (b) explicitly exclude `statement_transactions` rows that have a matched
`transactions` counterpart once reconciliation exists — never sum both tables' `amount` columns
for the same reporting scope.
