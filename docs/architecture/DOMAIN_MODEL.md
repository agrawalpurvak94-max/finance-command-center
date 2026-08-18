# Domain Model

Source of truth: `src/domain/*.ts` (9 files). This document describes only what exists in those files today — no invented fields, no anticipated future shape beyond what a file's own comments already state.

Per CLAUDE.md, the domain layer is **frozen architecture** — reuse only, do not fork. Every repository, service, hook, and component in the app imports its types from here; there is no duplicate definition anywhere else (verified in `DOMAIN_ARCHITECTURE_REPORT.md`, an earlier audit preserved in [docs/reports](../reports/)).

A recurring pattern across modules: a **lightweight reference type** (`Category`, `Merchant`, `Client`, `{id, name}`-shaped) is embedded inside `Transaction`/`Statement` rows and returned by `TransactionRepository.listCategories()` etc., while a **separate, richer `*Record` type** (`CategoryRecord`, `MerchantRecord`, `ClientRecord`, `BankAccountRecord`, `CreditCardRecord`) holds the full master-data row that module's own page/repository reads and writes. The two are deliberately not merged — widening the lightweight type would force every transaction snapshot to carry aggregate fields (spend totals, transaction counts) that don't belong on a per-transaction reference.

---

## Transaction — `src/domain/Transaction.ts`

The core financial ledger row. Comment in the file states it "mirrors the eventual `transactions` Supabase table" (an **existing production table** per CLAUDE.md Part 3) — field names are camelCase for the frontend; `merchantId`/`categoryId`/`clientId`/`accountId` map 1:1 to the table's FK columns.

**`Transaction`**

| Field           | Type                                      |
| --------------- | ----------------------------------------- |
| `id`            | `string`                                  |
| `date`          | `string`                                  |
| `merchant`      | `Merchant`                                |
| `category`      | `Category \| null`                        |
| `client`        | `Client \| null`                          |
| `account`       | `TransactionAccount`                      |
| `ownerType`     | `OwnerType` (`'business' \| 'personal'`)  |
| `type`          | `TransactionType` (`'debit' \| 'credit'`) |
| `amount`        | `number`                                  |
| `status`        | `TransactionStatus`                       |
| `paymentMode`   | `PaymentMode`                             |
| `notes`         | `string \| null`                          |
| `duplicateOfId` | `string \| null`                          |

- `TransactionStatus` = `'reviewed' \| 'uncategorized' \| 'duplicate' \| 'flagged' \| 'verified' \| 'pending_review'` — the full 6-state ledger lifecycle. Deliberately distinct from Dashboard's `RecentTransactionStatus` (see below) — a past architecture audit renamed a colliding duplicate rather than merging them, because they represent different concepts.
- `PaymentMode` = `'upi' \| 'card' \| 'netbanking' \| 'cash' \| 'cheque' \| 'auto_debit'` — Module 10 (Analytics) addition, derived deterministically in the mock generator (bank accounts skew upi/netbanking/cash/cheque; credit cards skew card/auto_debit).

**Relationships:** embeds `Merchant`, `Category`, `Client` (all optional/nullable except merchant), and `TransactionAccount` (always present — every transaction belongs to exactly one bank account or credit card).

**Supporting types:** `TransactionFilters`, `TransactionSort` (`'date' | 'merchant' | 'amount' | 'status'`), `TransactionListParams`, `TransactionListResult`, `TransactionPatch` (inline-edit shape), `TransactionCreateInput` (manual-entry shape — takes `merchantName: string` and `accountId: string` rather than full objects).

**Future placeholders:** none — this file has no empty/deferred sections; it's a completed, in-use module (Module 3).

---

## Statement — `src/domain/Statement.ts`

Comment: "deliberately excludes OCR/AI-review concepts (worker health, extraction confidence, template detection) per the Module 4 spec — those belong to a future AI Review module, not to Statements" (AI Review Center is a **deferred** module — see CLAUDE.md's "DEFERRED MODULES" section).

**`Statement`**

| Field                   | Type                 |
| ----------------------- | -------------------- |
| `id`                    | `string`             |
| `account`               | `TransactionAccount` |
| `client`                | `Client \| null`     |
| `statementDate`         | `string`             |
| `statementPeriodLabel`  | `string`             |
| `fileName`              | `string`             |
| `transactionsExtracted` | `number`             |
| `status`                | `StatementStatus`    |
| `importedAt`            | `string`             |
| `notes`                 | `string \| null`     |

- `StatementStatus` = `'imported' \| 'processing' \| 'processed' \| 'failed' \| 'pending_review'`.

**Relationships:** embeds `TransactionAccount` (bank or credit card) and `Client | null`.

**Supporting types:** `StatementFilters` (includes `accountId` — explicitly documented as "Drill-down filter from Accounts (Module 8) / Credit Cards (Module 9) 'View All Statements'"), `StatementSort`, `StatementListParams`, `StatementListResult`, `StatementSummary` (`total`/`processed`/`processing`/`failed`/`pendingReview` counts), `StatementCreateInput`.

**Future placeholders:** none currently — was an intentionally empty placeholder before Module 4 was scoped (per `ARCHITECTURE_AUDIT.md`), now fully populated.

---

## Merchant — `src/domain/Merchant.ts`

**`Merchant`** (lightweight reference, embedded in `Transaction.merchant`):

| Field  | Type     |
| ------ | -------- |
| `id`   | `string` |
| `name` | `string` |

**`MerchantRecord`** (Module 6 master-data row):

| Field                | Type                                        |
| -------------------- | ------------------------------------------- |
| `id`                 | `string`                                    |
| `name`               | `string`                                    |
| `aliases`            | `readonly string[]`                         |
| `defaultCategory`    | `Category \| null`                          |
| `status`             | `MerchantStatus` (`'active' \| 'inactive'`) |
| `notes`              | `string \| null`                            |
| `hasRules`           | `boolean`                                   |
| `transactionCount`   | `number`                                    |
| `totalSpend`         | `number`                                    |
| `averageTransaction` | `number`                                    |
| `lastTransactionAt`  | `string \| null`                            |

**Relationships:** `MerchantRecord.defaultCategory` embeds `Category`.

**Supporting types:** `MerchantFilters`, `MerchantSort`, `MerchantListParams`, `MerchantListResult`, `MerchantSummary` (`total`/`active`/`uncategorized`/`totalSpend`/`transactionsThisMonth`), `MerchantCreateInput`, `MerchantUpdateInput`.

**Future placeholders:** none in the type file itself. `MODULE6_REPORT.md` (see [docs/reports](../reports/)) notes deferred UI features (merchant merge, alias management UI) that don't require new domain fields.

---

## Category — `src/domain/Category.ts`

**`Category`** (lightweight reference, embedded in `Transaction.category`):

| Field  | Type     |
| ------ | -------- |
| `id`   | `string` |
| `name` | `string` |

**`CategoryRecord`** (Module 5 master-data row):

| Field               | Type                                        |
| ------------------- | ------------------------------------------- |
| `id`                | `string`                                    |
| `name`              | `string`                                    |
| `description`       | `string`                                    |
| `parentCategory`    | `Category \| null`                          |
| `status`            | `CategoryStatus` (`'active' \| 'inactive'`) |
| `color`             | `CategoryColor`                             |
| `icon`              | `string`                                    |
| `transactionCount`  | `number`                                    |
| `merchantsAssigned` | `number`                                    |
| `lastUpdatedAt`     | `string`                                    |

- `CATEGORY_COLORS` = `['primary', 'tertiary', 'emerald', 'blue', 'amber', 'rose', 'violet']` (const array; `CategoryColor` is its element union).

**Relationships:** `CategoryRecord.parentCategory` embeds `Category` — a self-referential hierarchy (one level deep, via the lightweight type, not a recursive `CategoryRecord`).

**Supporting types:** `CategoryFilters`, `CategorySort`, `CategoryListParams`, `CategoryListResult`, `CategorySummary` (`total`/`active`/`inactive`/`uncategorizedTransactions`), `CategoryCreateInput`, `CategoryUpdateInput`.

**Future placeholders:** none.

---

## Client — `src/domain/Client.ts`

Comment: "A Client here represents an owner of financial activity (Personal, Family Member, Company, Business Unit, Trust) — this is a financial client management module, not a CRM."

**`Client`** (lightweight reference, embedded in `Transaction.client` / `Statement.client`):

| Field  | Type     |
| ------ | -------- |
| `id`   | `string` |
| `name` | `string` |

**`ClientRecord`** (Module 7 master-data row):

| Field                    | Type                             |
| ------------------------ | -------------------------------- |
| `id`                     | `string`                         |
| `name`                   | `string`                         |
| `clientType`             | `ClientType`                     |
| `company`                | `string \| null`                 |
| `email`                  | `string \| null`                 |
| `phone`                  | `string \| null`                 |
| `status`                 | `ClientRecordStatus`             |
| `notes`                  | `string \| null`                 |
| `totalSpend`             | `number`                         |
| `transactionCount`       | `number`                         |
| `linkedAccountsCount`    | `number`                         |
| `linkedCreditCardsCount` | `number`                         |
| `linkedStatementsCount`  | `number`                         |
| `topCategories`          | `readonly ClientCategorySpend[]` |
| `topMerchants`           | `readonly ClientMerchantSpend[]` |
| `firstTransactionAt`     | `string \| null`                 |
| `lastTransactionAt`      | `string \| null`                 |
| `createdAt`              | `string`                         |

- `ClientType` = `'personal' \| 'family_member' \| 'company' \| 'business_unit' \| 'trust'`
- `ClientRecordStatus` = `'active' \| 'pending' \| 'suspended'`
- `ClientCategorySpend` = `{ category: Category; totalSpend: number }`
- `ClientMerchantSpend` = `{ merchant: Merchant; totalSpend: number }`

**Relationships:** `ClientRecord` embeds `Category` (via `topCategories`) and `Merchant` (via `topMerchants`); is itself embedded as `Client` in `Transaction`/`Statement`, and is the drill-down target for Accounts (`BankAccountRecord.clientId`) and Credit Cards (`CreditCardRecord.clientId`).

**Supporting types:** `ClientFilters`, `ClientSort`, `ClientListParams`, `ClientListResult`, `ClientSummary` (`totalClients`/`totalSpend`/`clientsRequiringReview`/`activeClients`), `ClientCreateInput`, `ClientUpdateInput` (note: update input omits `clientType` — client type is not editable after creation).

**Future placeholders:** none.

---

## BankAccount / Account — `src/domain/Account.ts`

Comment: "Shared account vocabulary used by Transactions (Module 3), Dashboard (Module 2), and the future Accounts/Credit Cards modules alike. Previously duplicated verbatim in `types/transaction.ts` and `types/dashboard.ts` — consolidated here as the single source of truth."

**`TransactionAccount`** (compact account reference embedded in a transaction/statement row):

| Field         | Type                                      |
| ------------- | ----------------------------------------- |
| `id`          | `string`                                  |
| `kind`        | `AccountKind` (`'bank' \| 'credit_card'`) |
| `bankName`    | `string`                                  |
| `cardNetwork` | `CardNetwork` (optional)                  |
| `last4`       | `string`                                  |

**`ConnectedAccount`** (richer summary shape used by Dashboard's account/credit-card cards):

| Field                   | Type                                                  |
| ----------------------- | ----------------------------------------------------- |
| `id`                    | `string`                                              |
| `kind`                  | `AccountKind`                                         |
| `name`                  | `string`                                              |
| `maskedNumber`          | `string`                                              |
| `balance`               | `number`                                              |
| `status`                | `AccountStatus` (`'active' \| 'syncing' \| 'urgent'`) |
| `lastSyncedLabel`       | `string` (optional)                                   |
| `inflow` / `outflow`    | `number` (optional)                                   |
| `dueDate` / `dueAmount` | `string` / `number` (optional)                        |
| `dailyAverage`          | `number` (optional)                                   |

**`BankAccountRecord`** (Module 8 master-data row — full bank account, distinct from `TransactionAccount`):

| Field                 | Type                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `id`                  | `string`                                                                                                             |
| `bankName`            | `string`                                                                                                             |
| `accountName`         | `string`                                                                                                             |
| `nickname`            | `string \| null`                                                                                                     |
| `accountType`         | `BankAccountType` (`'savings' \| 'current' \| 'overdraft'`)                                                          |
| `last4`               | `string`                                                                                                             |
| `maskedAccountNumber` | `string`                                                                                                             |
| `currentBalance`      | `number`                                                                                                             |
| `availableBalance`    | `number`                                                                                                             |
| `monthlyCredits`      | `number`                                                                                                             |
| `monthlyDebits`       | `number`                                                                                                             |
| `topMerchant`         | `Merchant \| null`                                                                                                   |
| `topCategory`         | `Category \| null`                                                                                                   |
| `recentActivityCount` | `number`                                                                                                             |
| `lastSyncAt`          | `string`                                                                                                             |
| `lastTransactionAt`   | `string \| null`                                                                                                     |
| `health`              | `BankAccountHealth`                                                                                                  |
| `status`              | `BankAccountRecordStatus` (`'active' \| 'inactive'`)                                                                 |
| `notes`               | `string \| null`                                                                                                     |
| `clientId`            | `string \| null` — comment: "Module 7 (Clients) drill-down target — null for accounts not tied to a specific client" |

- `BankAccountHealth` = `'healthy' \| 'low_balance' \| 'sync_required' \| 'needs_review'`

**Relationships:** `BankAccountRecord` shares the same `id` space as `mockBankAccounts` in `repositories/mock-data/reference-data.ts` — comment states this is deliberate, "so that Transactions' `bankAccountId` filter and Statements' `accountId` filter resolve to the exact same account this module manages — one identity per account across the app, per CLAUDE.md's 'never duplicate business logic'." Same pattern used by `CreditCardRecord`.

**Supporting types:** `BankAccountFilters`, `BankAccountSort`, `BankAccountListParams`, `BankAccountListResult`, `BankAccountSummary` (`totalBankAccounts`/`totalCurrentBalance`/`totalAvailableBalance`/`statementsImportedThisMonth`), `BankAccountCreateInput`, `BankAccountUpdateInput` (note: only `nickname`/`status`/`notes` are editable post-creation — balance/type/bank are not).

**Future placeholders:** `ARCHITECTURE_AUDIT.md` flags an open question (not yet acted on) about whether `ConnectedAccount` and `TransactionAccount` should share a base interface — deferred pending real Credit Cards page requirements, which have since been built without that change.

---

## CreditCard — `src/domain/CreditCard.ts`

Comment: "Credit cards are modeled in Transaction/Statement rows as `Account.TransactionAccount` / `ConnectedAccount` records with `kind: 'credit_card'`. This file holds the credit-card-specific vocabulary."

`KNOWN_CARD_NETWORKS` = `['VISA', 'Mastercard', 'AMEX', 'RuPay'] as const` → `CardNetwork` is its element union. (RuPay was added as an India-specific network in a later pass; VISA/Mastercard/AMEX were the original set.)

**`CreditCardRecord`** (Module 9 master-data row):

| Field                | Type                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `id`                 | `string`                                                                                    |
| `bankName`           | `string`                                                                                    |
| `cardName`           | `string`                                                                                    |
| `nickname`           | `string \| null`                                                                            |
| `network`            | `CardNetwork`                                                                               |
| `last4`              | `string`                                                                                    |
| `maskedNumber`       | `string`                                                                                    |
| `creditLimit`        | `number`                                                                                    |
| `outstanding`        | `number`                                                                                    |
| `availableCredit`    | `number`                                                                                    |
| `utilizationPercent` | `number`                                                                                    |
| `statementDate`      | `string`                                                                                    |
| `dueDate`            | `string`                                                                                    |
| `minimumDue`         | `number`                                                                                    |
| `monthlySpend`       | `number`                                                                                    |
| `topMerchant`        | `Merchant \| null`                                                                          |
| `topCategory`        | `Category \| null`                                                                          |
| `lastTransactionAt`  | `string \| null`                                                                            |
| `health`             | `CreditCardHealth`                                                                          |
| `status`             | `CreditCardRecordStatus` (`'active' \| 'inactive'`)                                         |
| `notes`              | `string \| null`                                                                            |
| `clientId`           | `string \| null` — Module 7 drill-down target, same pattern as `BankAccountRecord.clientId` |

- `CreditCardHealth` = `'healthy' \| 'due_soon' \| 'high_utilization' \| 'payment_overdue'`

**Relationships:** same `id`-space-sharing pattern as `BankAccountRecord` (shares ids with `mockCreditCards` reference data, so Transactions'/Statements' account filters resolve to the same card).

**Supporting types:** `CreditCardFilters`, `CreditCardSort`, `CreditCardListParams`, `CreditCardListResult`, `CreditCardSummary` (`totalCreditCards`/`totalCreditLimit`/`totalOutstanding`/`totalAvailableCredit`/`statementsImportedThisMonth`), `CreditCardCreateInput`, `CreditCardUpdateInput` (`nickname`/`status`/`notes`/**`creditLimit`** — credit limit was made editable in a later pass because issuers raise/lower it as the cardholder's credit score changes; the mock repository recomputes `availableCredit`/`utilizationPercent`/`health` when it changes).

**Future placeholders:** none currently open.

---

## Dashboard — `src/domain/Dashboard.ts`

Supports Module 2 (Dashboard) widgets only — no list/CRUD types, since Dashboard is read-only aggregate data.

| Type                      | Shape                                                                                                                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Trend`                   | `{ direction: TrendDirection; label: string; tone: TrendTone }`                                                                                                                                                                         |
| `TrendDirection`          | `'up' \| 'down' \| 'flat'`                                                                                                                                                                                                              |
| `TrendTone`               | `'positive' \| 'negative' \| 'neutral'`                                                                                                                                                                                                 |
| `FinancialSnapshotMetric` | `{ id, label, value: number, trend?: Trend, warningLabel?: string }`                                                                                                                                                                    |
| `ResolutionReason`        | `'uncategorized' \| 'missing_gst' \| 'tag_required'`                                                                                                                                                                                    |
| `ResolutionQueueItem`     | `{ id, reason, reasonLabel, description, amount, flaggedOnLabel }`                                                                                                                                                                      |
| `RecentTransactionStatus` | `'processed' \| 'pending' \| 'flagged'` — **intentionally distinct** from `Transaction.ts`'s `TransactionStatus` (a simplified 3-state indicator for this widget only; a past audit renamed it from a colliding name, values unchanged) |
| `RecentTransaction`       | `{ id, dateLabel, merchant: string, category: string, amount, status: RecentTransactionStatus }`                                                                                                                                        |
| `QuickAction`             | `{ id, label, href }`                                                                                                                                                                                                                   |

**Relationships:** `FinancialSnapshotMetric` embeds `Trend`; `AnalyticsKpiMetric` (in `Analytics.ts`) extends `FinancialSnapshotMetric`. Note `RecentTransaction.merchant`/`.category` are plain `string`, not the `Merchant`/`Category` reference types — this widget intentionally uses display strings, not full entities.

**Future placeholders:** none in-file. `PRODUCT_DECISIONS.md` lists "Recent Statements" and "Notifications" as intended Dashboard sections not yet built; no domain types exist for them yet (flagged, not fabricated here).

---

## Analytics — `src/domain/Analytics.ts`

Module 10 domain layer. Comment: "Mirrors the shape of `TransactionFilters` … plus the handful of dimensions unique to the Analytics workspace (bank, statement month) so a click-to-cross-filter or a 'View Transactions' drill-down can map 1:1 onto the existing Transactions filter/drill-down mechanism without translation."

| Type                                       | Shape                                                                                                                                                                                                                              |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AnalyticsGranularity`                     | `'day' \| 'week' \| 'month' \| 'quarter' \| 'year'`                                                                                                                                                                                |
| `AnalyticsFilters`                         | superset of `TransactionFilters` plus `bankName?: string`                                                                                                                                                                          |
| `AnalyticsDimension`                       | `keyof AnalyticsFilters`                                                                                                                                                                                                           |
| `AnalyticsKpiMetric`                       | extends `FinancialSnapshotMetric` + `drillFilter?: Partial<AnalyticsFilters>`                                                                                                                                                      |
| `AnalyticsSummary`                         | `totalSpend`, `totalTransactions`, `averageTransaction`, `monthlySpend`, `monthlySpendTrend: Trend \| null`, `totalIncome`, `netCashFlow`, `highestSpendingCategory`, `highestSpendingMerchant`, `mostUsedCard`, `mostUsedAccount` |
| `AnalyticsBucket`                          | `{ bucketLabel, bucketStart, bucketEnd }` — base shape for every trend point                                                                                                                                                       |
| `AnalyticsTrendPoint`                      | extends `AnalyticsBucket` + `spend: number`                                                                                                                                                                                        |
| `AnalyticsOwnerTypePoint`                  | extends `AnalyticsBucket` + `business`/`personal: number`                                                                                                                                                                          |
| `AnalyticsCategorySlice`                   | `{ category: Category, amount, percentage }`                                                                                                                                                                                       |
| `AnalyticsRankedRow`                       | the one generic row every ranked chart/table renders: `id, label, sublabel?, value, valueLabel, secondaryValue?, secondaryLabel?, trend?, drillFilter?`                                                                            |
| `AnalyticsCardSeriesPoint` / `Result`      | per-bucket `values: Record<string, number>` keyed by card id, plus a `cards` legend list                                                                                                                                           |
| `AnalyticsAccountActivityPoint` / `Result` | extends `AnalyticsBucket` + `credits`/`debits`/`net`, plus `byAccount: AnalyticsRankedRow[]`                                                                                                                                       |
| `AnalyticsInsightSeverity`                 | `'good' \| 'warning' \| 'serious' \| 'critical' \| 'info'`                                                                                                                                                                         |
| `AnalyticsInsight`                         | `{ id, severity, title, description, actionFilter?: Partial<AnalyticsFilters> }`                                                                                                                                                   |

**Relationships:** imports and re-composes `Category`, `Merchant`, `TransactionAccount`, `OwnerType`/`PaymentMode`/`TransactionStatus`/`TransactionType` (from `Transaction.ts`), and `FinancialSnapshotMetric`/`Trend` (from `Dashboard.ts`) — Analytics is the most cross-cutting domain file, deliberately reusing rather than redefining every dimension it charts.

**Future placeholders:** `PRODUCT_DECISIONS.md` lists Budget Tracking and Forecasting as explicit "Future" features for this module (per CLAUDE.md's Module 10 contract) — no domain types exist for them yet.

---

## Cross-cutting notes

- **No entity is defined twice.** Verified against `DOMAIN_ARCHITECTURE_REPORT.md`'s original audit and re-confirmed by this pass's file-by-file read.
- **`Statement.ts`, `CreditCard.ts` were originally near-empty placeholders** (per `ARCHITECTURE_AUDIT.md`, written before Modules 4/9 were scoped) and have since been filled in additively, exactly as that audit's "future module reuse" table predicted — no interface was ever renamed or restructured to do so.
- Non-domain types that look similar but are **not** part of this financial domain layer: `NavItem` (`src/types/nav.ts`, UI-shell), `ThemeMode` (`src/stores/theme.store.ts`, app state), `BreadcrumbItem` (`src/components/Breadcrumbs.tsx`, UI-shell) — correctly excluded from `src/domain/` by design.
