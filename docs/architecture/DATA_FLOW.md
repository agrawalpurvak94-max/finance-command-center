# Data Flow

Source of truth: CLAUDE.md Part 1 ("EXISTING BACKEND", "DATA FLOW") for the backend-side flow (authoritative, not built by this frontend project), and `src/services/*.ts` / `src/repositories/*.ts` for the frontend-side flow (built and inspected directly for this document).

Two flows are documented below and must not be confused: the **backend automation flow** (Gmail → n8n → Supabase — already built, external to this repo, must never be redesigned per CLAUDE.md) and the **frontend read/write flow** (Supabase → repository → hook → component — the layer this repo owns).

---

## 1. Backend automation flow (existing, authoritative — CLAUDE.md Part 1)

This is documentation of what CLAUDE.md states already exists and works; it is not implemented in this repository and this pass makes no claim to have inspected the live n8n workflows or Gmail integration directly.

```
Gmail
  │
  ▼
n8n  (Workflow A — Transaction Email Processing)
  │
  ▼
Normalize Email
  │
  ▼
Merchant Lookup            ──┐
  │                          │  (Workflow C — Merchant Learning,
  ▼                          │   runs on every transaction save)
AI Categorisation            │
  │                          │
  ▼                          │
Deduplication                │
  │                          │
  ▼                          │
Supabase                     │
  (transactions,             │
   merchant_memory,          │
   processed_messages)  ◀────┘
  │
  ▼
Processed Label (Gmail)
```

```
Statement Email
  │
  ▼
Save PDF
  │
  ▼
Google Drive
  │
  ▼
PDF Parser
  │
  ▼
AI Extraction
  │
  ▼
Normalize
  │
  ▼
Supabase
  (statement_transactions, transactions)
  │
  ▼
Statement Linked
```

```
Transaction Saved
  │
  ▼
Merchant Lookup
  │
  ▼
Known Merchant? ──NO──▶ AI Classification ──▶ Merchant Memory Updated
  │
 YES
  │
  ▼
Reuse Category
```

**Tables this flow writes to** (per CLAUDE.md Part 3, "EXISTING DATABASE" — these already exist and must not be redesigned): `transactions`, `statement_transactions`, `processed_messages`, `merchant_memory`, `monthly_summaries`, `banks`, `categories`, `email_sources`.

Per CLAUDE.md: _"These workflows already work. Do not redesign them."_ — Module 12B (n8n Integration) is scoped to **verify** these tables/views are reachable by the frontend's repositories, not to modify any of the above.

---

## 2. Frontend read/write flow (this repository — verified against actual code)

Every module follows the same four-layer path, per CLAUDE.md's "APPLICATION ARCHITECTURE" section — never skipped, never reversed:

```
React Pages
  │
  ▼
Components
  │
  ▼
Hooks              (TanStack Query — useQuery / useMutation)
  │
  ▼
Services           (single swap point — instantiates a Repository)
  │
  ▼
Repository interface
  │
  ├── today:   Mock*Repository   (in-memory array + withLatency())
  └── future:  Supabase*Repository  (Module 12A)
                  │
                  ▼
                Supabase client (src/lib/supabase.ts)
                  │
                  ▼
                SQL Views / RPC  (per CLAUDE.md Part 3)
                  │
                  ▼
                Tables
```

Concretely, for a **write** (e.g. editing a transaction's category):

```
TransactionDetailsDrawer (component)
  │  calls
  ▼
useUpdateTransaction()  (hook — useMutation)
  │  calls
  ▼
transactionRepository.update(id, patch)  (via transactions.service.ts)
  │  today: MockTransactionRepository.update() — mutates in-memory array
  │  future: SupabaseTransactionRepository.update() — writes to `transactions` table
  ▼
onSuccess → queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all })
  │
  ▼
Every useQuery subscribed to a transactions.* key refetches automatically
```

And for a **read** (e.g. loading the Transactions list):

```
Transactions.tsx (page)
  │  calls
  ▼
useTransactionsList(params)  (hook — useQuery, key = queryKeys.transactions.list(params))
  │  calls
  ▼
transactionRepository.list(params)  (via transactions.service.ts)
  │  today: MockTransactionRepository.list() — filter/sort/paginate an in-memory array
  │  future: SupabaseTransactionRepository.list() — query vw_transactions / vw_transaction_search
  ▼
TransactionListResult { rows, total }
  │
  ▼
TransactionTable (component) renders rows; Pagination renders total
```

**The swap point is always the service file.** Every `src/services/*.service.ts` file (except `dashboard.service.ts`, see [REPOSITORY_MAP.md](./REPOSITORY_MAP.md)'s "Dashboard (no repository)" section) instantiates exactly one concrete repository class behind its exported interface-typed constant. Module 12A's entire job, per its contract in CLAUDE.md, is changing that one instantiation line per file — hooks and components are already written against the interface, not the mock class, so they require zero changes.

---

## 3. Transactions-specific flow

```
Transaction row created by:
  (a) n8n Workflow A (email) — lands directly in Supabase `transactions` table
  (b) n8n Workflow B (statement) — lands via `statement_transactions` → `transactions`
  (c) NewTransactionDialog (manual entry, this app) — TransactionCreateInput →
      transactionRepository.create() → (today) in-memory array / (future) `transactions` insert

Transaction row read by:
  Transactions.tsx → useTransactionsList() → vw_transactions / vw_transaction_search (future)
  Dashboard.tsx → useDashboard() → dashboardService.getRecentTransactions() (today: inline mock array;
      future: vw_dashboard_summary or similar, per dashboard.service.ts's comment)
  Analytics.tsx → useAnalytics() → analyticsService.* → mockTransactions aggregation (today);
      future: vw_monthly_spend / vw_category_spend / vw_merchant_spend / etc.

Transaction row updated by:
  TransactionDetailsDrawer inline edit, BulkActionToolbar bulk edit
      → useUpdateTransaction()/useBulkUpdateTransactions() → transactionRepository.update()/bulkUpdate()
      → invalidates queryKeys.transactions.all only (never a global invalidate, per CLAUDE.md's
        "Invalidate only affected queries" rule)
```

---

## 4. Statements-specific flow

```
Statement row created by:
  (a) n8n Workflow B (statement email → PDF → parse → extract) — future `statements` table
  (b) UploadStatementDialog (manual record, this app) — StatementCreateInput →
      statementRepository.create()

Statement row read by:
  Statements.tsx → useStatementsList()/useStatementsSummary() → vw_statements / vw_statement_summary (future)
  BankAccountDrawer / CreditCardDrawer "View All Statements" → navigates to
      /statements?accountId=<id> → Statements.tsx reads accountId from useSearchParams

Statement row updated by:
  StatementRowActionsMenu "Reprocess" → useReprocessStatement() → statementRepository.reprocess()
      → sets status back to 'processing' (today, in-memory; future: presumably re-triggers or
        reflects an n8n Workflow B re-run — not specified in code, flagged for Module 12B scoping)
```

---

## 5. Analytics-specific flow

```
Analytics.tsx
  │
  ▼
useAnalytics(filters, granularity)  — 12 parallel useQuery calls
  │
  ▼
analyticsService.*  (bound methods on the single MockAnalyticsRepository instance)
  │
  ▼
today:   in-memory aggregation over mockTransactions/mockAccounts/mockCreditCards,
         via a hand-built bucketing engine standing in for date_trunc
future:  vw_monthly_spend, vw_cashflow, vw_category_spend, vw_merchant_spend,
         vw_account_analytics, vw_credit_utilization, vw_transaction_trends
         (per CLAUDE.md Part 3's "REQUIRED SQL VIEWS — Analytics" list;
         the exact method→view mapping is not yet decided in code)
```

Every chart/table on this page also participates in **two** distinct interaction flows, both documented in [ROUTE_MAP.md](./ROUTE_MAP.md):

- **Cross-filter** (in-page): click a chart segment → merges into local `AnalyticsFilters` state → re-runs the same 12 queries with new filters. No navigation.
- **Drill-down** (cross-module): "View Transactions" / KPI click → `navigate('/transactions?...')` with a subset of `TRANSACTION_FILTER_KEYS` — leaves the Analytics page.

---

## 6. Future: Settings flow (Module 11 — not yet built)

Per CLAUDE.md's Module 11 contract, Settings will read `vw_settings_general` / `vw_settings_accounts` / `vw_settings_categories` / `vw_settings_merchants` / `vw_settings_ai` / `vw_settings_integrations` / `vw_system_health` and write through a future `application_settings` table (per Part 3's "NEW TABLES" list). No `settings.service.ts`, `useSettings.ts`, or `SettingsRepository` exists yet — `src/pages/Settings.tsx` currently renders only `ModulePlaceholder`. This section is a forward-reference to the CLAUDE.md contract, not a description of code that exists.

---

## 7. What Module 12A changes vs. does not change

| Layer                 | Changes in 12A?                                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pages, Components     | No — CLAUDE.md's Module 12A contract states zero page/component file changes except the repository swap                                                                                                                                                                   |
| Hooks                 | No — exact same signatures, same query keys                                                                                                                                                                                                                               |
| Services              | Yes — exactly one line per file (the repository instantiation); `dashboard.service.ts` is the one exception, needing a rewrite of its method bodies rather than a class swap, since it has no `Repository` interface today (see [REPOSITORY_MAP.md](./REPOSITORY_MAP.md)) |
| Repository interfaces | No — the Supabase implementation must satisfy the existing interface; CLAUDE.md: "If an interface genuinely cannot be satisfied, stop and ask before changing it."                                                                                                        |
| Domain models         | No                                                                                                                                                                                                                                                                        |
| SQL Views/RPC         | Yes — this is where all the new logic actually lands, per CLAUDE.md Part 3's "database is the single source of truth" rule                                                                                                                                                |
