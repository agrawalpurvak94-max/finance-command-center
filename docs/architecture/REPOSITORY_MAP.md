# Repository Map

Source of truth: `src/repositories/*.ts` (interfaces + mock implementations) and `src/services/*.ts` (the instantiation/swap-point layer). This is the layer CLAUDE.md's "SUPABASE SERVICE LAYER" section describes as `React Component → Hook → Service → Supabase` — today every service wires a mock, in-memory implementation; Module 12A's entire job is to swap each one for a Supabase-backed implementation of the _same interface_, with zero changes to hooks or components.

Every mock implementation shares the same shape: a `private` in-memory array seeded from `src/repositories/mock-data/*`, filter/sort/paginate done in plain JS, and every method wrapped in a `withLatency(data, ms)` helper (a `setTimeout`-based `Promise`, simulating network latency — 200–600ms depending on the operation).

---

## Transaction

- **Interface:** `TransactionRepository` — `src/repositories/transaction.repository.ts`
- **Mock impl:** `MockTransactionRepository` — `src/repositories/mock-transaction.repository.ts`
- **Service:** `src/services/transactions.service.ts` exports `transactionRepository: TransactionRepository = new MockTransactionRepository()`

| Method           | Signature                                                            |
| ---------------- | -------------------------------------------------------------------- |
| `list`           | `(params: TransactionListParams) => Promise<TransactionListResult>`  |
| `getById`        | `(id: string) => Promise<Transaction \| null>`                       |
| `create`         | `(input: TransactionCreateInput) => Promise<Transaction>`            |
| `update`         | `(id: string, patch: TransactionPatch) => Promise<Transaction>`      |
| `bulkUpdate`     | `(ids: readonly string[], patch: TransactionPatch) => Promise<void>` |
| `delete`         | `(id: string) => Promise<void>`                                      |
| `bulkDelete`     | `(ids: readonly string[]) => Promise<void>`                          |
| `listCategories` | `() => Promise<readonly Category[]>`                                 |
| `listClients`    | `() => Promise<readonly Client[]>`                                   |
| `listMerchants`  | `() => Promise<readonly Merchant[]>`                                 |
| `listAccounts`   | `() => Promise<readonly TransactionAccount[]>`                       |

**Mock storage:** `private transactions: Transaction[] = [...mockTransactions]`. `list()` filters via `matchesFilters()`, sorts via `compareTransactions()` (date/merchant/amount/status, default date desc), paginates via `.slice()`. `create`/`update` re-resolve related objects by looking them up in the shared `mockAccounts`/`mockCategories`/`mockClients`/`mockMerchants` reference arrays. `bulkUpdate` loops `update()` per id; `bulkDelete` filters via a `Set` of ids.

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseTransactionRepository (reading vw_transactions / vw_transaction_search per CLAUDE.md, writing through the existing `transactions` table) and the hooks/components in this module require zero changes."_

**Future Supabase implementation:** `SupabaseTransactionRepository`, reading `vw_transactions` / `vw_transaction_search`, writing through the **existing** `transactions` table.

---

## Statement

- **Interface:** `StatementRepository` — `src/repositories/statement.repository.ts`
- **Mock impl:** `MockStatementRepository` — `src/repositories/mock-statement.repository.ts`
- **Service:** `src/services/statements.service.ts` exports `statementRepository: StatementRepository = new MockStatementRepository()`

| Method       | Signature                                                       |
| ------------ | --------------------------------------------------------------- |
| `list`       | `(params: StatementListParams) => Promise<StatementListResult>` |
| `getById`    | `(id: string) => Promise<Statement \| null>`                    |
| `getSummary` | `() => Promise<StatementSummary>`                               |
| `create`     | `(input: StatementCreateInput) => Promise<Statement>`           |
| `reprocess`  | `(id: string) => Promise<Statement>`                            |
| `delete`     | `(id: string) => Promise<void>`                                 |

**Mock storage:** `private statements: Statement[] = [...mockStatements]`. `list()` filters over bankName/fileName/client name plus date/bank/kind/status/client/account, sorts via `compareStatements()` (statementDate/importedAt/transactionsExtracted, default statementDate desc). `getSummary()` tallies counts by status. `create()` looks up the account from `mockAccounts`, sets status `'imported'`. `reprocess()` sets status to `'processing'`.

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseStatementRepository (reading vw_statements / vw_statement_summary per CLAUDE.md, writing through the future `statements` table) and the hooks/components in this module require zero changes. Reference data (accounts, clients) is intentionally NOT duplicated here — see services/statements.service.ts and hooks/useStatements.ts, which reuse the existing Transactions module's account/client accessors since that reference data is shared master data, not owned by either module."_

**Future Supabase implementation:** `SupabaseStatementRepository`, reading `vw_statements` / `vw_statement_summary`, writing through the **future** `statements` table (net-new per CLAUDE.md Part 3).

---

## Category

- **Interface:** `CategoryRepository` — `src/repositories/category.repository.ts`
- **Mock impl:** `MockCategoryRepository` — `src/repositories/mock-category.repository.ts`
- **Service:** `src/services/categories.service.ts` exports `categoryRepository: CategoryRepository = new MockCategoryRepository()`

| Method       | Signature                                                             |
| ------------ | --------------------------------------------------------------------- |
| `list`       | `(params: CategoryListParams) => Promise<CategoryListResult>`         |
| `getSummary` | `() => Promise<CategorySummary>`                                      |
| `create`     | `(input: CategoryCreateInput) => Promise<CategoryRecord>`             |
| `update`     | `(id: string, input: CategoryUpdateInput) => Promise<CategoryRecord>` |
| `delete`     | `(id: string) => Promise<void>`                                       |

**Mock storage:** `private categories: CategoryRecord[] = [...mockCategoryRecords]`. `getSummary()`'s `uncategorizedTransactions` is computed by filtering the **separate** `mockTransactions` fixture array for `txn.category === null` — a cross-module in-memory join that a real `vw_category_summary` view would need to replicate. `create()` hardcodes `icon: 'Tag'`, zeroes `transactionCount`/`merchantsAssigned`.

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseCategoryRepository (reading vw_categories / a category-summary view per CLAUDE.md, writing through the existing `categories` table) and the hooks/components in this module require zero changes. Reference data (the lightweight `Category` list used for Transactions' filter/editor dropdowns) is intentionally NOT duplicated here — see hooks/useCategories.ts, which reuses the existing Transactions module's `useTransactionCategories()` for parent-category options, since that list is shared master data, not owned exclusively by either module."_

**Future Supabase implementation:** `SupabaseCategoryRepository`, reading `vw_categories` / a category-summary view, writing through the **existing** `categories` table.

---

## Merchant

- **Interface:** `MerchantRepository` — `src/repositories/merchant.repository.ts`
- **Mock impl:** `MockMerchantRepository` — `src/repositories/mock-merchant.repository.ts`
- **Service:** `src/services/merchants.service.ts` exports `merchantRepository: MerchantRepository = new MockMerchantRepository()`

| Method       | Signature                                                             |
| ------------ | --------------------------------------------------------------------- |
| `list`       | `(params: MerchantListParams) => Promise<MerchantListResult>`         |
| `getSummary` | `() => Promise<MerchantSummary>`                                      |
| `create`     | `(input: MerchantCreateInput) => Promise<MerchantRecord>`             |
| `update`     | `(id: string, input: MerchantUpdateInput) => Promise<MerchantRecord>` |
| `delete`     | `(id: string) => Promise<void>`                                       |

**Mock storage:** `private merchants: MerchantRecord[] = [...mockMerchantRecords]`. `getSummary()` computes `transactionsThisMonth` against the separate `mockTransactions` fixtures (same cross-module join pattern as Category).

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseMerchantRepository (reading vw_merchants / a merchant-summary view per CLAUDE.md, writing through the existing `merchant_memory` table) and the hooks/components in this module require zero changes. Reference data (the lightweight `Category` list used for the Default Category filter/editor) is intentionally NOT duplicated here — see hooks/useMerchants.ts, which reuses the existing Transactions module's `useTransactionCategories()`, the same 'shared master data' reasoning Categories used for its own Parent Category dropdown."_

**Future Supabase implementation:** `SupabaseMerchantRepository`, reading `vw_merchants` / a merchant-summary view, writing through the **existing** `merchant_memory` table — the n8n merchant-learning table, per CLAUDE.md Part 1's "EXISTING BACKEND" section. This is the one repository writing to an n8n-owned table; per CLAUDE.md, manual corrections should feed the learning loop, not bypass it.

---

## BankAccount

- **Interface:** `BankAccountRepository` — `src/repositories/bank-account.repository.ts`
- **Mock impl:** `MockBankAccountRepository` — `src/repositories/mock-bank-account.repository.ts`
- **Service:** `src/services/accounts.service.ts` exports `bankAccountRepository: BankAccountRepository = new MockBankAccountRepository()`

| Method       | Signature                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `list`       | `(params: BankAccountListParams) => Promise<BankAccountListResult>`                                      |
| `getSummary` | `() => Promise<BankAccountSummary>`                                                                      |
| `create`     | `(input: BankAccountCreateInput) => Promise<BankAccountRecord>`                                          |
| `update`     | `(id: string, input: BankAccountUpdateInput) => Promise<BankAccountRecord>`                              |
| `delete`     | `(id: string) => Promise<void>`                                                                          |
| `syncAll`    | `() => Promise<void>` — inline doc: _"'Sync All' header action — refreshes every account's lastSyncAt."_ |

**Mock storage:** `private accounts: BankAccountRecord[] = [...mockBankAccountRecords]`. `create()` derives `last4`/`maskedAccountNumber` from the input account number. `syncAll()` sets every account's `lastSyncAt` to today and flips `health` from `'sync_required'` to `'healthy'` only (leaves other health values untouched).

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseBankAccountRepository (reading vw_accounts / vw_account_summary per CLAUDE.md, writing through the future `accounts` table) and the hooks/components in this module require zero changes."_

**Future Supabase implementation:** `SupabaseBankAccountRepository`, reading `vw_accounts` / `vw_account_summary`, writing through the **future** `accounts` table (shared with Credit Cards below — both account kinds land in one table per CLAUDE.md Part 3).

---

## CreditCard

- **Interface:** `CreditCardRepository` — `src/repositories/credit-card.repository.ts`
- **Mock impl:** `MockCreditCardRepository` — `src/repositories/mock-credit-card.repository.ts`
- **Service:** `src/services/credit-cards.service.ts` exports `creditCardRepository: CreditCardRepository = new MockCreditCardRepository()`

| Method       | Signature                                                                 |
| ------------ | ------------------------------------------------------------------------- |
| `list`       | `(params: CreditCardListParams) => Promise<CreditCardListResult>`         |
| `getSummary` | `() => Promise<CreditCardSummary>`                                        |
| `create`     | `(input: CreditCardCreateInput) => Promise<CreditCardRecord>`             |
| `update`     | `(id: string, input: CreditCardUpdateInput) => Promise<CreditCardRecord>` |
| `delete`     | `(id: string) => Promise<void>`                                           |

**Mock storage:** `private cards: CreditCardRecord[] = [...mockCreditCardRecords]`. `update()` recomputes `availableCredit` and `utilizationPercent` from a new `creditLimit` against the existing `outstanding`, and recalculates `health` only when it was previously `'healthy'`/`'high_utilization'` — inline comment: _"Utilization is the only health signal that moves with the limit itself — due_soon/payment_overdue are date-driven and stay untouched by a limit change."_

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseCreditCardRepository (reading vw_accounts / a credit-card-specific view per CLAUDE.md, writing through the future `accounts` table) and the hooks/components in this module require zero changes."_

**Future Supabase implementation:** `SupabaseCreditCardRepository`, reading `vw_accounts` / a credit-card-specific view, writing through the **future** `accounts` table.

---

## Client

- **Interface:** `ClientRepository` — `src/repositories/client.repository.ts`
- **Mock impl:** `MockClientRepository` — `src/repositories/mock-client.repository.ts`
- **Service:** `src/services/clients.service.ts` exports `clientRepository: ClientRepository = new MockClientRepository()`

| Method       | Signature                                                         |
| ------------ | ----------------------------------------------------------------- |
| `list`       | `(params: ClientListParams) => Promise<ClientListResult>`         |
| `getSummary` | `() => Promise<ClientSummary>`                                    |
| `create`     | `(input: ClientCreateInput) => Promise<ClientRecord>`             |
| `update`     | `(id: string, input: ClientUpdateInput) => Promise<ClientRecord>` |
| `delete`     | `(id: string) => Promise<void>`                                   |

**Mock storage:** `private clients: ClientRecord[] = [...mockClientRecords]`. `getSummary()` counts `status === 'pending'` as `clientsRequiringReview`. `create()` zeroes all spend/linked-count/topCategories/topMerchants fields.

**Swap-point comment (verbatim):** _"Swap point for real backend integration. Implement this interface with a SupabaseClientRepository (reading vw_clients / a client-summary view per CLAUDE.md, writing through the future `clients` table) and the hooks/components in this module require zero changes."_

**Future Supabase implementation:** `SupabaseClientRepository`, reading `vw_clients` / a client-summary view, writing through the **future** `clients` table.

---

## Analytics

- **Interface:** `AnalyticsRepository` — `src/repositories/analytics.repository.ts`
- **Mock impl:** `MockAnalyticsRepository` — `src/repositories/mock-analytics.repository.ts`
- **Service:** `src/services/analytics.service.ts` — internally instantiates `const repository = new MockAnalyticsRepository()` (not exported directly); exports `analyticsService`, whose 14 methods are each `repository.<method>.bind(repository)`.

| Method                   | Signature                                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `getSummary`             | `(filters: AnalyticsFilters) => Promise<AnalyticsSummary>`                                |
| `getSpendTrend`          | `(filters, granularity: AnalyticsGranularity) => Promise<readonly AnalyticsTrendPoint[]>` |
| `getOwnerTypeSpend`      | `(filters) => Promise<readonly AnalyticsOwnerTypePoint[]>`                                |
| `getCategorySpend`       | `(filters) => Promise<readonly AnalyticsCategorySlice[]>`                                 |
| `getMerchantSpend`       | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getClientSpend`         | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getCreditCardSpend`     | `(filters) => Promise<AnalyticsCardSeriesResult>`                                         |
| `getBankAccountActivity` | `(filters) => Promise<AnalyticsAccountActivityResult>`                                    |
| `getHighestTransactions` | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getRecurringMerchants`  | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getLargestExpenses`     | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getRefundAnalysis`      | `(filters) => Promise<readonly AnalyticsRankedRow[]>`                                     |
| `getInsights`            | `(filters) => Promise<readonly AnalyticsInsight[]>`                                       |
| `listBankNames`          | `() => Promise<readonly string[]>`                                                        |

**Mock storage:** **stateless** — no private array. Derives everything on the fly from the shared `mockTransactions` fixtures (plus `mockAccounts`/`mockCreditCards` reference data), filtered per-call via `matchesAnalyticsFilters()`. Implements its own deterministic bucketing engine (`buildBuckets`, `bucketStartFor`, `addOneBucket`, `applyLookback`, `labelFor`, `bucketIndexForDate`) to stand in for a future `date_trunc`-based SQL view. `getInsights()` composes results from `getSummary()`/`getCreditCardSpend()`/`getHighestTransactions()` into a heuristic insight list, with an inline comment noting one signal is a _"Mock proxy for utilization since credit limits live in Module 9's own dataset, not this repository."_

**Contract comment (verbatim):** _"Every method stands in for a future Supabase SQL view/RPC (see CLAUDE.md Part 3 — 'REQUIRED SQL VIEWS' / Analytics). `MockAnalyticsRepository` is the only implementation until Module 12A swaps it for a Supabase-backed one behind `analytics.service.ts` — this interface is the contract that swap must satisfy unchanged."_

**Future Supabase implementation:** `SupabaseAnalyticsRepository`, backing each method with one of the `vw_monthly_spend` / `vw_cashflow` / `vw_category_spend` / `vw_merchant_spend` / `vw_account_analytics` / `vw_credit_utilization` / `vw_transaction_trends` views listed in CLAUDE.md Part 3 — the mapping from method to specific view is not yet decided in code and should be finalized in Module 12A, not assumed here.

---

## Dashboard (no repository — direct service)

`src/services/dashboard.service.ts` has **no `DashboardRepository` interface and no mock class**. It exports a plain `dashboardService` object with hardcoded in-file mock arrays (`financialSnapshot`, `connectedAccounts`, `creditCards`, `resolutionQueue`, `recentTransactions`, `quickActions`), each wrapped in a 300ms `withLatency()` call, exposing `getFinancialSnapshot`/`getConnectedAccounts`/`getCreditCards`/`getResolutionQueue`/`getRecentTransactions`/`getQuickActions`.

**Comment (verbatim):** _"Mock data source. CLAUDE.md's Module 2 contract calls for these to read from vw_dashboard_summary / vw_dashboard_accounts / vw_dashboard_due_cards / vw_ai_review_summary via Supabase — deferred until backend integration is explicitly scheduled, per this project's 'keep fake data until backend integration' instruction. Only this file changes when that happens; hooks and components are already written against the real interfaces."_

This is architecturally different from every other module: Dashboard has no `Repository` interface to satisfy, so Module 12A's Dashboard work is a rewrite of `dashboard.service.ts`'s method bodies, not a class swap. This asymmetry is called out here because it means Dashboard cannot follow the same "one-line swap" pattern the other 8 modules use — flag for Module 12A planning.

---

## mock-data/ (fixture generators — not repositories)

`src/repositories/mock-data/` holds the deterministic fixture generators every mock repository above seeds from. Not part of the repository contract layer — these will not have a Supabase equivalent, they exist only to make the mock repositories realistic.

| File                        | Produces                                                                                                                                                                                                  |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `reference-data.ts`         | Hand-authored master/reference data: `mockBankAccounts` (5 accounts), `mockCreditCards` (16 cards), `mockAccounts`, `mockCategories`, `mockClients`, `mockMerchants` (shared lightweight reference lists) |
| `generate-transactions.ts`  | `mockTransactions` — the core dataset most other generators derive stats from (mulberry32 PRNG)                                                                                                           |
| `generate-statements.ts`    | `mockStatements` (mulberry32 PRNG, seed `20260802`)                                                                                                                                                       |
| `generate-categories.ts`    | `mockCategoryRecords` — hand-authored metadata merged onto the 13 category ids from `reference-data.ts`                                                                                                   |
| `generate-merchants.ts`     | `mockMerchantRecords` — hand-authored metadata merged onto the 19 merchant ids (2 deliberately left uncategorized: Razorpay, Zerodha)                                                                     |
| `generate-bank-accounts.ts` | `mockBankAccountRecords` (own mulberry32 PRNG instance)                                                                                                                                                   |
| `generate-credit-cards.ts`  | `mockCreditCardRecords` (mulberry32 PRNG, seed `20260804`)                                                                                                                                                |
| `generate-clients.ts`       | `mockClientRecords` — 8 hand-authored clients combining transactions/statements/accounts/cards data                                                                                                       |

---

## Summary table

| Entity      | Interface               | Mock class                  | Service export                     | Existing/Future table          | Swap-point documented?                  |
| ----------- | ----------------------- | --------------------------- | ---------------------------------- | ------------------------------ | --------------------------------------- |
| Transaction | `TransactionRepository` | `MockTransactionRepository` | `transactionRepository`            | **Existing** `transactions`    | Yes                                     |
| Statement   | `StatementRepository`   | `MockStatementRepository`   | `statementRepository`              | **Future** `statements`        | Yes                                     |
| Category    | `CategoryRepository`    | `MockCategoryRepository`    | `categoryRepository`               | **Existing** `categories`      | Yes                                     |
| Merchant    | `MerchantRepository`    | `MockMerchantRepository`    | `merchantRepository`               | **Existing** `merchant_memory` | Yes                                     |
| BankAccount | `BankAccountRepository` | `MockBankAccountRepository` | `bankAccountRepository`            | **Future** `accounts`          | Yes                                     |
| CreditCard  | `CreditCardRepository`  | `MockCreditCardRepository`  | `creditCardRepository`             | **Future** `accounts` (shared) | Yes                                     |
| Client      | `ClientRepository`      | `MockClientRepository`      | `clientRepository`                 | **Future** `clients`           | Yes                                     |
| Analytics   | `AnalyticsRepository`   | `MockAnalyticsRepository`   | `analyticsService` (bound methods) | SQL views only, no table       | Yes                                     |
| Dashboard   | _(none)_                | _(none — inline arrays)_    | `dashboardService`                 | SQL views only, no table       | Yes (in service file, not an interface) |
