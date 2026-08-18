# VIEW_USAGE_MATRIX.md

Every SQL view drafted in this Database Foundation phase (34 total), classified against real evidence: the 8 existing `*.repository.ts` interfaces, `dashboard.service.ts`'s own documented view list, and the actual component files under `src/components/*` (not CLAUDE.md's original aspirational spec, which sometimes named components/views that were never actually built — see the per-row notes for where the two diverge).

**"Currently Used" definition**: would this view be consumed on day one of Module 12A by a repository interface method or component that already exists in the codebase — as opposed to backing a feature that was scoped in CLAUDE.md but never actually built, or a method with no current caller. Nothing queries Supabase _today_ (every module still runs on mocks), so this column answers "is there a real consumer waiting for this once the swap happens," not "is this being queried right now."

**Location**: 24 views are in [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql) (17 Required immediately + 7 Required during Module 12A). 10 are in [FUTURE_VIEWS.sql](FUTURE_VIEWS.sql) (Future/Optional).

---

## Tier 1 — Required immediately (17 views)

Back a `list()`/`getById()`/`getSummary()` method already on an existing repository interface, or are confirmed consumed by an already-built component — i.e., the module's primary screen has nothing to render without this view.

| View                         | Repository                                                                               | Frontend Screen                                        | Currently Used | Future Module |
| ---------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------- | ------------- |
| `vw_transactions`            | `TransactionRepository.list()`                                                           | `TransactionTable` (Transactions page)                 | Yes            | —             |
| `vw_transaction_details`     | `TransactionRepository.getById()`                                                        | `TransactionDetailsDrawer`                             | Yes            | —             |
| `vw_accounts`                | `BankAccountRepository.list()`                                                           | `BankAccountCard` / `BankAccountDrawer`                | Yes            | —             |
| `vw_account_summary`         | `BankAccountRepository.getSummary()` / `CreditCardRepository.getSummary()`               | `AccountSummaryWidget` / `CreditCardSummaryWidget`     | Yes            | —             |
| `vw_account_health`          | (joined by both account repositories)                                                    | `BankAccountHealthBadge` / `CreditCardHealthBadge`     | Yes            | —             |
| `vw_credit_card_utilization` | `CreditCardRepository.list()`                                                            | `CreditCardTile` / `CreditCardDrawer`                  | Yes            | —             |
| `vw_client_summary`          | `ClientRepository.list()` / `.getSummary()`; also `AnalyticsRepository.getClientSpend()` | `ClientTable` / `ClientSummaryWidget` / `ClientDrawer` | Yes            | —             |
| `vw_categories`              | `CategoryRepository.list()`                                                              | `CategoryTable` / `CategorySummaryWidget`              | Yes            | —             |
| `vw_merchants`               | `MerchantRepository.list()`                                                              | `MerchantTable` / `MerchantSummaryWidget`              | Yes            | —             |
| `vw_statements`              | `StatementRepository.list()`                                                             | `StatementTable`                                       | Yes            | —             |
| `vw_statement_summary`       | `StatementRepository.getSummary()`                                                       | `StatementSummaryWidget`                               | Yes            | —             |
| `vw_monthly_spend`           | `AnalyticsRepository.getSummary()` / `.getSpendTrend()`                                  | `AnalyticsKpiGrid` / `SpendTrendChart`                 | Yes            | —             |
| `vw_cashflow`                | `AnalyticsRepository.getSummary()` (`.netCashFlow`)                                      | `AnalyticsKpiGrid`                                     | Yes            | —             |
| `vw_category_spend`          | `AnalyticsRepository.getCategorySpend()`                                                 | `CategorySpendChart`                                   | Yes            | —             |
| `vw_merchant_spend`          | `AnalyticsRepository.getMerchantSpend()`                                                 | `MerchantSpendChart`                                   | Yes            | —             |
| `vw_account_analytics`       | `AnalyticsRepository.getBankAccountActivity()` / `.getCreditCardSpend()`                 | `BankAccountActivityChart` / `CreditCardSpendChart`    | Yes            | —             |
| `vw_transaction_trends`      | `AnalyticsRepository.getSpendTrend()`                                                    | `SpendTrendChart`                                      | Yes            | —             |

---

## Tier 2 — Required during Module 12A (7 views)

Back a real domain-model field or a plausible existing-drawer's content, but aren't a primary `list()`/`getById()`/`getSummary()` call — needed for full parity with the current mock's behavior, not for the page to render at all.

| View                        | Repository                                                                                                | Frontend Screen                                                                                 | Currently Used                                                                                      | Future Module           |
| --------------------------- | --------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------- |
| `vw_dashboard_due_cards`    | _(no dedicated repository — `dashboard.service.ts`)_                                                      | Folded into `FinancialSnapshotWidget`/`AccountsWidget` (no separate "due cards" component file) | Yes — explicitly named in `dashboard.service.ts`'s own comment as one of the 4 views Module 2 needs | Module 2 (Dashboard)    |
| `vw_transaction_search`     | `TransactionRepository.list()` (via the `search` param on `TransactionListParams`, not a distinct method) | `FilterToolbar` search box                                                                      | Yes — but only a performance optimization for an existing param, not a new capability               | Module 3 (Transactions) |
| `vw_account_transactions`   | _(no distinct interface method — join a repository would perform)_                                        | `BankAccountDrawer` (per CLAUDE.md's "Recent Transactions" feature)                             | Yes — plausible drawer content, not independently confirmed by a named component                    | Module 8/9              |
| `vw_client_top_categories`  | _(backs `ClientRecord.topCategories`, no distinct interface method)_                                      | `ClientDrawer`                                                                                  | Yes — `ClientRecord` is the type `ClientDrawer` renders, and it has this field                      | Module 7                |
| `vw_client_top_merchants`   | _(backs `ClientRecord.topMerchants`, no distinct interface method)_                                       | `ClientDrawer`                                                                                  | Yes — same reasoning                                                                                | Module 7                |
| `vw_merchant_transactions`  | _(no distinct interface method)_                                                                          | `MerchantReviewDrawer` (per CLAUDE.md's "Transaction History" feature)                          | Yes — plausible drawer content                                                                      | Module 6                |
| `vw_statement_transactions` | _(no distinct interface method)_                                                                          | `StatementDetailsDrawer` (per CLAUDE.md's "Transaction Matching" feature)                       | Yes — plausible drawer content                                                                      | Module 4                |

---

## Tier 3 — Future / Optional (10 views — moved to `FUTURE_VIEWS.sql`)

Not referenced by any current repository interface method, and not confirmed consumed by any already-built component. Present in CLAUDE.md's original spec (which named some components — `BalanceHistory`, `ReviewPanel`, `DuplicatePanel`, `ReconciliationCard`, `MetricsCard` — that were never actually built in the shipped modules) but have no real consumer today.

| View                          | Repository                                                                        | Frontend Screen                                                                                                               | Currently Used | Future Module                                                          |
| ----------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `vw_dashboard_cashflow`       | _(no repository — `dashboard.service.ts`)_                                        | No `CashFlowChart`-equivalent file exists in `src/components/dashboard`; not named in `dashboard.service.ts`'s comment either | No             | Module 2 (Dashboard) — if a cash-flow widget is scoped                 |
| `vw_transactions_review`      | _(none — `TransactionFilters.status` covers this via `vw_transactions` directly)_ | No `ReviewPanel` file in `src/components/transactions` (CLAUDE.md named one; not built)                                       | No             | Module 3 (Transactions) — if a dedicated review queue screen is scoped |
| `vw_transactions_duplicates`  | _(none)_                                                                          | No `DuplicatePanel` file (same gap as above)                                                                                  | No             | Module 3 (Transactions)                                                |
| `vw_account_trends`           | _(none)_                                                                          | No `BalanceHistory`-equivalent file in `src/components/accounts` (CLAUDE.md named one; not built)                             | No             | Module 8 (Accounts)                                                    |
| `vw_credit_utilization`       | _(none — no `AnalyticsRepository` method matches "utilization%" specifically)_    | No confirmed chart; `CreditCardSpendChart` covers $-spend, not utilization%                                                   | No             | Module 10 (Analytics) — if a dedicated utilization chart is scoped     |
| `vw_merchant_details`         | _(none — `MerchantRepository` has no `getById()`)_                                | N/A — no detail-only screen exists distinct from the list                                                                     | No             | Module 6 (Merchants) — if `getById()` is added to the interface        |
| `vw_merchant_analytics`       | _(none)_                                                                          | No confirmed trend chart inside `MerchantReviewDrawer`                                                                        | No             | Module 6 (Merchants)                                                   |
| `vw_statement_processing`     | _(none)_                                                                          | No processing-timeline component; `StatementStatusBadge` reads the base column directly                                       | No             | Module 4 (Statements)                                                  |
| `vw_statement_reconciliation` | _(none)_                                                                          | No `ReconciliationCard` file (CLAUDE.md named one; not built)                                                                 | No             | Module 4 (Statements)                                                  |
| `vw_statement_metrics`        | _(none)_                                                                          | No `MetricsCard` file (CLAUDE.md named one; not built)                                                                        | No             | Module 4 (Statements)                                                  |

---

## Reading this matrix

- **Tier 1 + Tier 2 = 24 views, all in `DATABASE_MIGRATIONS.sql`.** These are the ones worth applying now.
- **Tier 3 = 10 views, all in `FUTURE_VIEWS.sql`.** Apply individually, only once a specific screen/component that needs one is actually being built — not as a batch "just in case."
- **Every Tier-2/Tier-3 "no distinct interface method" note is a real gap, not an oversight.** `REPOSITORY_IMPLEMENTATION_PLAN.md` documents this per-repository (e.g. Clients' `topCategories`/`topMerchants` needing either an N+1 or a batched extra query) — this matrix doesn't resolve that design question, it just confirms which views exist to support whichever answer is chosen.
- **CLAUDE.md's original component names that don't exist in the built codebase** (`BalanceHistory`, `ReviewPanel`, `DuplicatePanel`, `ReconciliationCard`, `MetricsCard`) are called out per-row above rather than silently assumed missing — worth a quick confirmation with whoever scoped those modules on whether they were deliberately dropped or are still upcoming, since that affects whether the corresponding Tier-3 view should be promoted sooner.
