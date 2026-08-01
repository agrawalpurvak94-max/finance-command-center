# Stitch → React Mapping Document

Source of truth: `FInal Stitch Designs/stitch_duplicate_of_finance_intelligence_command_center/` (confirmed identical copy also exists one directory up in `../Stitch Designs/`). Compared against CLAUDE.md Part 1 (Routing) and Part 4/5 (Module Contracts).

Decisions below reflect your answers on canonical nav, Dashboard scope, Transactions source, and the pause-for-missing-designs rule.

---

## Global decisions

- **Design tokens**: `apex_ledger/DESIGN.md` (Zinc/Slate dark palette, Geist type, 8px spacing, Linear/Stripe-inspired) is the token source of truth, ported into `src/styles/index.css` as Tailwind v4 `@theme` extensions using the _same token names Stitch used_ (`surface`, `surface-container`, `on-surface-variant`, `primary`, `primary-container`, `outline-variant`, etc.) — this preserves 1:1 visual fidelity rather than translating through shadcn's simpler semantic names and risking drift. shadcn's own base slots (`--background`, `--card`, etc.) are re-pointed at the closest Apex Ledger equivalents so existing shadcn primitives (`Button`) still render correctly in this palette. `awesome-design-md` (Stripe/Linear/Notion) is consulted only for spacing/typography/a11y/state polish, per your instruction — not for color/layout.
- **Icons**: the export uses Google Material Symbols; every icon is mapped to its closest Lucide equivalent (CLAUDE.md: "Lucide only"). Mapping table below.
- **Nav is unified**: one shared `Sidebar`/`TopNav` is built once (Module 1) and reused everywhere — the stale/divergent nav markup embedded in individual screen exports (`category_configuration_v1`, `client_directory_v1`, `financial_dashboard_v8_refined`) is discarded in favor of the canonical order you confirmed; only each screen's _main content area_ is ported.
- **Flagged deviation from CLAUDE.md Part 1 Routing**: the original routing list (`/`, `/accounts`, `/transactions`, `/statements`, `/analytics`, `/merchants`, `/ai-review`, `/settings`) predates the Stitch nav and is missing `/clients` and `/categories`, both of which are first-class sidebar items in the confirmed design and in your module order. Adding both.
- **Correction (2026-08-01)**: `/ai-review` was initially added to the sidebar even though no exported Stitch screen has a nav slot for it — an overreach beyond the confirmed design, since CLAUDE.md's routing list alone isn't Stitch source-of-truth for the shell. Per your explicit follow-up instruction, the AI Review nav item and its route/page stub have been removed entirely. Unlike Merchant Center/Analytics/Settings (which _do_ have a confirmed nav slot in the majority-pattern screens, just no page content yet), AI Review has zero design backing at the nav level — it will be re-added only once a Stitch export actually includes it.
- Same follow-up also made the shell strictly generic: the "FY 2024-25" subtitle, the topbar's "Workspaces"/"Clients" quick-links, and the Help icon were all removed (none were on the user's explicit closed list of allowed shell elements), the search placeholder was simplified to plain "Search…", and the avatar became a real Profile/Sign out dropdown menu rather than a static image.

## Material Symbols → Lucide icon map

| Material Symbol   | Lucide                 | Used for               |
| ----------------- | ---------------------- | ---------------------- |
| `dashboard`       | `LayoutDashboard`      | Dashboard nav          |
| `groups`          | `Users`                | Clients nav            |
| `account_balance` | `Landmark`             | Financial Accounts nav |
| `receipt_long`    | `Receipt`              | Transactions nav       |
| `description`     | `FileText`             | Statements nav         |
| `category`        | `Tags`                 | Categories nav         |
| `storefront`      | `Store`                | Merchant Center nav    |
| `analytics`       | `BarChart3`            | Analytics nav          |
| `settings`        | `Settings`             | Settings nav           |
| `search`          | `Search`               | Top nav search input   |
| `notifications`   | `Bell`                 | Top nav                |
| `help_outline`    | `HelpCircle`           | Top nav                |
| `add`             | `Plus`                 | Action buttons         |
| `refresh`         | `RefreshCw`            | Sync actions           |
| `sync`            | `RefreshCw` (animated) | Syncing status         |
| `bolt`            | `Zap`                  | Floating action button |

---

## Screen → Route → Components → Supabase → CRUD

### Module 1 — Application Shell

|               |                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Stitch source | Chrome common to all 8 screens (sidebar + top bar), reconciled to the confirmed canonical nav — no dedicated screen file |
| Routes        | Provides the outer layout for every route below                                                                          |
| Components    | `layouts/AppShell.tsx`, `layouts/Sidebar.tsx`, `layouts/TopNav.tsx`, `layouts/PageContainer.tsx`                         |
| Supabase      | None — no business logic per CLAUDE.md Module 1 contract                                                                 |
| CRUD          | None                                                                                                                     |

### Module 2 — Dashboard

|                |                                                                                                                                                                                                                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stitch source  | **Not used as-is** — you scoped this down to: Total Spend (this month), Transactions (widget), Top Categories, Biggest Expenses. Simpler than either `executive_financial_intelligence_v7` or `financial_dashboard_v8_refined`. Card/KPI visual language still follows the Apex Ledger tokens. |
| Route          | `/`                                                                                                                                                                                                                                                                                            |
| Components     | `pages/Dashboard.tsx`, `components/dashboard/KPICard.tsx`, `components/dashboard/TopCategories.tsx`, `components/dashboard/BiggestExpenses.tsx`, `components/dashboard/RecentTransactions.tsx`                                                                                                 |
| Supabase Views | `vw_dashboard_summary` (total spend this month), `vw_category_spend` (top categories), `vw_transactions` (recent transactions / biggest expenses, sorted)                                                                                                                                      |
| CRUD           | Read-only                                                                                                                                                                                                                                                                                      |

### Module 3 — Transactions

|                |                                                                                                                                                                                                                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stitch source  | `transaction_intelligence_v7/code.html` (confirmed)                                                                                                                                                                                                                                                      |
| Route          | `/transactions`, `/transactions/:id`                                                                                                                                                                                                                                                                     |
| Components     | `pages/Transactions.tsx`, `components/transactions/TransactionTable.tsx`, `components/transactions/TransactionDrawer.tsx`, `components/transactions/SearchToolbar.tsx`, `components/transactions/BulkActions.tsx`, `components/transactions/StatusBadge.tsx` (Processed/Needs Review/Duplicate/Verified) |
| Supabase Views | `vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_transactions_review`, `vw_transactions_duplicates`                                                                                                                                                                             |
| CRUD           | Read (list/search/filter), Update (approve/reject/categorize — writes to `transactions` table per CLAUDE.md's existing-table rules, never a new migration)                                                                                                                                               |

### Module 4 — Statements

|                |                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stitch source  | `statement_processing_records_v7/code.html`                                                                                                                                                          |
| Route          | `/statements`, `/statements/:id`                                                                                                                                                                     |
| Components     | `pages/Statements.tsx`, `components/statements/StatementTable.tsx`, `components/statements/MetricsCard.tsx`, `components/statements/SystemHealthPanel.tsx`, `components/statements/RecentAlerts.tsx` |
| Supabase Views | `vw_statements`, `vw_statement_summary`, `vw_statement_processing`, `vw_statement_metrics`                                                                                                           |
| CRUD           | Read-only for this screen (resolution actions write to `statements`/`statement_transactions`, existing tables)                                                                                       |

### Module 5 — Merchant Center — **PAUSED, no Stitch design**

Per your instruction, build stops here until a Stitch export for Merchant Center is provided.

### Module 6 — Categories

|               |                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Stitch source | `category_configuration_v1/code.html` — content only (KPI row + category table); nav chrome discarded in favor of the canonical shell |
| Route         | `/categories`                                                                                                                         |
| Components    | `pages/Categories.tsx`, `components/categories/CategoryTable.tsx`, `components/categories/CategoryStatusBadge.tsx`                    |
| Supabase      | `categories` table (existing, per CLAUDE.md Part 3)                                                                                   |
| CRUD          | Read, Create (Add Category), Update (status)                                                                                          |

### Module 7 — Clients

|               |                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| Stitch source | `client_directory_v1/code.html` — content only                                                        |
| Route         | `/clients`, `/clients/:id`                                                                            |
| Components    | `pages/Clients.tsx`, `components/clients/ClientTable.tsx`, `components/clients/ClientStatusBadge.tsx` |
| Supabase      | `clients` table (new table, per CLAUDE.md Part 3 "NEW TABLES")                                        |
| CRUD          | Read, Create (Add Client)                                                                             |

### Module 8 — Financial Accounts

|                |                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Stitch source  | `financial_accounts_v7/code.html` ("Spend Intelligence")                                                                          |
| Route          | `/accounts`, `/accounts/:id`                                                                                                      |
| Components     | `pages/Accounts.tsx`, `components/accounts/AccountCard.tsx`, `components/accounts/AccountTabs.tsx` (Bank Accounts / Credit Cards) |
| Supabase Views | `vw_accounts`, `vw_account_summary`, `vw_account_transactions`                                                                    |
| CRUD           | Read, Create (Link Account — likely an Edge Function / OAuth flow, not plain CRUD)                                                |

### Module 9 — Analytics — **PAUSED, no dedicated Stitch page**

Nav slot exists (confirmed in canonical shell); page content not designed. Note: `executive_financial_intelligence_v7`/`financial_dashboard_v8_refined`'s richer widgets (Monthly Spend Trend, Category Distribution, Activity Intensity, Bank Utilization, System Audit Log) were _not_ assigned to Dashboard per your simplified scope — worth asking you later whether any of that content was actually meant for this module instead of being dropped entirely.

### Module 10 — AI Review — **PAUSED, no Stitch design at all (no nav slot either)**

### Module 11 — Settings — **PAUSED, no dedicated Stitch page** (nav slot exists but its export was empty/incomplete)

---

## Build order for this session

Application Shell → Dashboard → Transactions → Statements, then **stop at Merchant Center** per your instruction. Categories/Clients/Financial Accounts have real designs and could be built next if you want to skip past the Merchant Center pause point — confirm when we get there.
