# UI Component Map

Source of truth: `src/components/**/*.tsx` (116 files), `src/layouts/*.tsx` (4 files). Per CLAUDE.md, shared components (`PageContainer`, `QueryBoundary`, `EmptyState`, `ConfirmDialog`, `Pagination`, `FloatingActionButton`, shadcn/ui primitives) are **done, reuse only** — this document exists so a future module reaches for one of these before writing a new one.

---

## 1. Shared / cross-module components (`src/components/` top level)

These are the components CLAUDE.md explicitly calls "reuse only." Each entry lists every current consumer found via grep — if a component you're about to build looks like one of these, it likely already exists.

### ActiveFilterBanner

- **Purpose:** Generic banner shown when a page's filters were seeded by a drill-down navigation from another module, with a way to clear it.
- **Props:** `label: string`, `onClear: () => void`
- **Reused by:** `Accounts.tsx`, `CreditCards.tsx`, `Statements.tsx`, `Transactions.tsx`

### Breadcrumbs

- **Purpose:** Accessible breadcrumb trail (`<nav>`/`<ol>` with chevron separators, marks the last item as current page).
- **Exports:** `Breadcrumbs` component, `BreadcrumbItem` type (`{ label: string; href?: string }`)
- **Props:** `items: readonly BreadcrumbItem[]`, `className?: string`
- **Reused by:** **nobody currently** — built (Module 1) but not yet wired into any page. Flagged as available, not as dead-code-to-delete (per "Never delegate understanding" this is a documentation pass only).

### ConfirmDialog

- **Purpose:** Generic Cancel/Confirm modal for destructive or important actions.
- **Props:** `open`, `onOpenChange`, `title`, `description`, `confirmLabel?` (default `'Confirm'`), `variant?: 'default' | 'destructive'`, `onConfirm`, `isPending?`
- **Reused by:** `Clients.tsx`, `Categories.tsx`, `Transactions.tsx`, `Merchants.tsx`, `Statements.tsx`, `components/transactions/BulkActionToolbar.tsx`

### EmptyState

- **Purpose:** Generic "nothing here" placeholder (icon + title + description + optional CTA link).
- **Props:** `icon: LucideIcon`, `title`, `description`, `action?: { label; href }`, `className?`
- **Reused by:** every list page (`Accounts`, `Categories`, `Clients`, `Merchants`, `CreditCards`, `Statements`, `Transactions`) and most summary widgets (`AccountSummaryWidget`, `CreditCardSummaryWidget`, `CategorySummaryWidget`, `MerchantSummaryWidget`, `StatementSummaryWidget`, `ClientSummaryWidget`, dashboard's `StatementWidget`/`ResolutionQueueWidget`/`FinancialSnapshotWidget`/`RecentTransactionsWidget`/`AccountsWidget`, `analytics/AnalyticsTable`, `analytics/InsightsPanel`)

### EntityReviewDrawer / EntityReviewDrawerFooter

- **Purpose:** Standardized right-side "review/edit entity" drawer shell (built on `Sheet`), deliberately opinion-free about Save/Cancel logic — each entity's body owns its own state.
- **Props (drawer):** `open`, `onOpenChange`, `onClosed?` (fires when the close transition finishes, for focus restoration), `title`, `children`
- **Props (footer):** `onCancel`, `onSave`, `isSaving?`, `saveLabel?` (default `'Save Changes'`), `className?`
- **Reused by:** `CreditCardDrawer`, `BankAccountDrawer`, `MerchantReviewDrawer`, `ClientDrawer` — this is the pattern named explicitly as "Entity Drawer" in CLAUDE.md's frozen shared components list.

### FilterReferenceSelect

- **Purpose:** Shared "All / pick one" dropdown for filter bars choosing a reference-data dimension (category, merchant, etc.) — promoted out of `FilterToolbar` to avoid duplicating it in `GlobalFilterBar`.
- **Props:** `value: string | undefined`, `placeholder`, `options: readonly { id; name }[]`, `onChange`, `ariaLabel`
- **Reused by:** `components/analytics/GlobalFilterBar.tsx`, `components/transactions/FilterToolbar.tsx`

### FloatingActionButton

- **Purpose:** Fixed bottom-right circular FAB.
- **Props:** `icon?: LucideIcon` (default `Zap`), `label`, `onClick`
- **Reused by:** `Transactions.tsx` only (available for reuse elsewhere)

### ModulePlaceholder

- **Purpose:** "Coming soon"/status placeholder page for unbuilt modules, or a 404 fallback.
- **Props:** `title`, `status`
- **Reused by:** `Settings.tsx`, `NotFound.tsx`

### Pagination

- **Purpose:** Rows-per-page select + numbered page buttons (desktop, ellipsis-collapsing) / "Page X of Y" (mobile) + prev/next.
- **Props:** `page`, `pageSize`, `totalItems`, `pageSizeOptions?` (default `[10, 25, 50]`), `onPageChange`, `onPageSizeChange`
- **Reused by:** `Transactions.tsx`, `Statements.tsx`, `Merchants.tsx`, `Categories.tsx`, `Clients.tsx`, `components/analytics/AnalyticsTable.tsx`

### QueryBoundary

- **Purpose:** Generic loading/error/empty/data render-prop wrapper standardizing skeleton, retry-on-error, and empty states around any TanStack Query result. The single most-reused component in the app.
- **Props (generic `<T>`):** `query: { isLoading; isError; data: T | undefined; refetch }`, `skeleton: ReactNode`, `isEmpty?: (data: T) => boolean`, `empty?`, `children: (data: T) => ReactNode`
- **Reused by:** every list page (`Categories`, `Accounts`, `Analytics`, `CreditCards`, `Clients`, `Statements`, `Merchants`, `Transactions`) and nearly every summary widget (`CreditCardSummaryWidget`, `AccountsWidget`, `FinancialSnapshotWidget`, `QuickActionsWidget`, `RecentTransactionsWidget`, `AccountSummaryWidget`, `ClientSummaryWidget`, `ResolutionQueueWidget`, `StatementSummaryWidget`, `MerchantSummaryWidget`, `CategorySummaryWidget`)

### Toast

- **Purpose:** Minimal self-contained success toast (no toast library in the project), auto-dismisses, `role="status"` / `aria-live="polite"`.
- **Props:** `message`, `onDismiss`, `durationMs?` (default `3000`)
- **Reused by:** `Accounts.tsx`, `CreditCards.tsx`, `Clients.tsx`, `Merchants.tsx`

---

## 2. Layouts (`src/layouts/`)

| Component       | Purpose                                                                                                                                                     | Composes                                             |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `AppShell`      | Root shell: sets `.dark` class from theme store on first paint, skip-to-content link, renders `Sidebar` + `TopNav` around `<main>` with routed `<Outlet />` | `Sidebar` (desktop-only), `TopNav`, `<Outlet />`     |
| `Sidebar`       | Primary nav — app title + primary/secondary `NavLink` groups from `@/lib/navigation`                                                                        | `NavLink` items, Lucide icons                        |
| `TopNav`        | Header: mobile nav trigger (`Sidebar` inside a `Sheet`), search input, notifications, theme switcher, user menu                                             | `Button`, `Input`, `Avatar`, `DropdownMenu`, `Sheet` |
| `PageContainer` | Generic page content wrapper (`min-w-0 flex-1 p-lg`)                                                                                                        | plain `<section>`; also wraps `ModulePlaceholder`    |

---

## 3. shadcn/ui primitives (`src/components/ui/`)

Note: despite the shadcn/ui naming convention, these primitives are built on **`@base-ui/react`** (Base UI), not Radix — every file imports from `@base-ui/react/*`.

| File                | Wraps                                                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `avatar.tsx`        | `@base-ui/react/avatar` — `Avatar`, `AvatarImage`, `AvatarFallback` + app-added `AvatarBadge`/`AvatarGroup`/`AvatarGroupCount`        |
| `badge.tsx`         | Not a Base UI primitive — styled `span` via `@base-ui/react/use-render` + `cva` variants                                              |
| `button.tsx`        | `@base-ui/react/button` + `cva` variant/size styling                                                                                  |
| `checkbox.tsx`      | `@base-ui/react/checkbox`                                                                                                             |
| `dialog.tsx`        | `@base-ui/react/dialog` — full `Dialog`/`Trigger`/`Portal`/`Close`/`Overlay`/`Content`/`Header`/`Footer`/`Title`/`Description` family |
| `dropdown-menu.tsx` | `@base-ui/react/menu` — full dropdown-menu family incl. checkbox/radio items, submenus                                                |
| `input.tsx`         | `@base-ui/react/input`                                                                                                                |
| `label.tsx`         | Plain `<label>`, no primitive                                                                                                         |
| `popover.tsx`       | `@base-ui/react/popover`                                                                                                              |
| `select.tsx`        | `@base-ui/react/select`                                                                                                               |
| `separator.tsx`     | `@base-ui/react/separator`                                                                                                            |
| `sheet.tsx`         | `@base-ui/react/dialog` again — Sheet is a differently-styled instance of the same Dialog primitive, with `side: 'top'                | 'right' | 'bottom' | 'left'` |
| `skeleton.tsx`      | Plain `<div>` with `animate-pulse`                                                                                                    |
| `table.tsx`         | Plain semantic `<table>` family                                                                                                       |
| `tabs.tsx`          | `@base-ui/react/tabs`                                                                                                                 |
| `textarea.tsx`      | Plain styled `<textarea>`                                                                                                             |

---

## 4. Module-specific components

Grouped by module folder. "Category" below is a documentation grouping (Table / Drawer / FormDialog / Filters-Header / StatusBadge / SummaryWidget-KPI / Skeleton / Chart / RowActionsMenu-Cell / Other), not a domain `Category`.

### transactions/ (16 files) — Module 3

| File                           | Component                  | Category       | Purpose                                                                                  |
| ------------------------------ | -------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `AccountCell.tsx`              | `AccountCell`              | Cell           | Bank/card name + masked last-4 for a transaction's account                               |
| `BizPersonalPill.tsx`          | `BizPersonalPill`          | Other          | Toggle pill: Business (B) / Personal (P)                                                 |
| `BulkActionToolbar.tsx`        | `BulkActionToolbar`        | Filters/Header | Bulk action bar for selected rows (reviewed/categorize/assign/notes/export/delete)       |
| `CategorySelector.tsx`         | `CategorySelector`         | Other          | Inline dropdown to assign category                                                       |
| `ClientSelector.tsx`           | `ClientSelector`           | Other          | Inline dropdown to assign client                                                         |
| `FilterChip.tsx`               | `FilterChip`               | Filters/Header | Generic popover-trigger chip — used by every filter toolbar app-wide                     |
| `FilterToolbar.tsx`            | `FilterToolbar`            | Filters/Header | Full Transactions filter bar (date/category/client/merchant/accounts/type/status/amount) |
| `InlineSelector.tsx`           | `InlineSelector`           | Other          | Base Select wrapper resolving id→label for inline cells                                  |
| `MerchantCell.tsx`             | `MerchantCell`             | Cell           | Merchant icon + name for a row                                                           |
| `NewTransactionDialog.tsx`     | `NewTransactionDialog`     | FormDialog     | Manual transaction creation                                                              |
| `RowActionsMenu.tsx`           | `RowActionsMenu`           | RowActionsMenu | Per-row dropdown (view/edit/categorize/assign/delete)                                    |
| `StatusBadge.tsx`              | `StatusBadge`              | StatusBadge    | Transaction status colored badge                                                         |
| `TransactionDetailsDrawer.tsx` | `TransactionDetailsDrawer` | Drawer         | Full detail sheet with inline edit                                                       |
| `TransactionTable.tsx`         | `TransactionTable`         | Table          | Main sortable/selectable TanStack table                                                  |
| `TransactionTableSkeleton.tsx` | `TransactionTableSkeleton` | Skeleton       | Loading rows                                                                             |
| `TransactionsHeader.tsx`       | `TransactionsHeader`       | Filters/Header | Page header — CSV export / new transaction                                               |

### statements/ (9 files) — Module 4

| File                          | Component                 | Category          | Purpose                                   |
| ----------------------------- | ------------------------- | ----------------- | ----------------------------------------- |
| `StatementDetailsDrawer.tsx`  | `StatementDetailsDrawer`  | Drawer            | Read-only statement metadata              |
| `StatementFilters.tsx`        | `StatementFilters`        | Filters/Header    | Date/bank/type/status/client filters      |
| `StatementRowActionsMenu.tsx` | `StatementRowActionsMenu` | RowActionsMenu    | view/reprocess/download/delete            |
| `StatementStatusBadge.tsx`    | `StatementStatusBadge`    | StatusBadge       | Processing status                         |
| `StatementSummaryWidget.tsx`  | `StatementSummaryWidget`  | SummaryWidget/KPI | Total/processed/processing/failed/pending |
| `StatementTable.tsx`          | `StatementTable`          | Table             | Sortable statements table                 |
| `StatementTableSkeleton.tsx`  | `StatementTableSkeleton`  | Skeleton          | Loading rows                              |
| `StatementsHeader.tsx`        | `StatementsHeader`        | Filters/Header    | Refresh/upload actions                    |
| `UploadStatementDialog.tsx`   | `UploadStatementDialog`   | FormDialog        | Manual statement record                   |

### categories/ (9 files) — Module 5

| File                         | Component                   | Category          | Purpose                                                                                            |
| ---------------------------- | --------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| `CategoriesHeader.tsx`       | `CategoriesHeader`          | Filters/Header    | Export / add-category actions                                                                      |
| `CategoryFilters.tsx`        | `CategoryFilters`           | Filters/Header    | Status/parent/txn-count-range filters                                                              |
| `CategoryFormDialog.tsx`     | `CategoryFormDialog`        | FormDialog        | Add/edit category (name/parent/description/status/color)                                           |
| `CategoryRowActionsMenu.tsx` | `CategoryRowActionsMenu`    | RowActionsMenu    | View transactions/merchants, edit, delete                                                          |
| `CategoryStatusBadge.tsx`    | `CategoryStatusBadge`       | StatusBadge       | Active/inactive                                                                                    |
| `CategorySummaryWidget.tsx`  | `CategorySummaryWidget`     | SummaryWidget/KPI | Total/active/inactive/uncategorized                                                                |
| `CategoryTable.tsx`          | `CategoryTable`             | Table             | Icon + color swatch + sort                                                                         |
| `CategoryTableSkeleton.tsx`  | `CategoryTableSkeleton`     | Skeleton          | Loading rows                                                                                       |
| `categoryVisuals.ts`         | _(helper, not a component)_ | n/a               | Icon-key → Lucide icon map + color class/label lookup used by `CategoryTable`/`CategoryFormDialog` |

### merchants/ (9 files) — Module 6

| File                         | Component                | Category          | Purpose                                                  |
| ---------------------------- | ------------------------ | ----------------- | -------------------------------------------------------- |
| `MerchantFilters.tsx`        | `MerchantFilters`        | Filters/Header    | Category/status/has-rules/txn-count filters              |
| `MerchantFormDialog.tsx`     | `MerchantFormDialog`     | FormDialog        | Add/edit merchant                                        |
| `MerchantReviewDrawer.tsx`   | `MerchantReviewDrawer`   | Drawer            | Review/edit + spend intelligence + recent transactions   |
| `MerchantRowActionsMenu.tsx` | `MerchantRowActionsMenu` | RowActionsMenu    | Review, view transactions, edit, merge (soon), delete    |
| `MerchantStatusBadge.tsx`    | `MerchantStatusBadge`    | StatusBadge       | Active/inactive                                          |
| `MerchantSummaryWidget.tsx`  | `MerchantSummaryWidget`  | SummaryWidget/KPI | Total/active/uncategorized/spend/txns this month         |
| `MerchantTable.tsx`          | `MerchantTable`          | Table             | Clickable name (opens review) + inline category selector |
| `MerchantTableSkeleton.tsx`  | `MerchantTableSkeleton`  | Skeleton          | Loading rows                                             |
| `MerchantsHeader.tsx`        | `MerchantsHeader`        | Filters/Header    | Export / add-merchant actions                            |

### accounts/ (6 files) — Module 8

| File                         | Component                | Category            | Purpose                                                     |
| ---------------------------- | ------------------------ | ------------------- | ----------------------------------------------------------- |
| `AccountSummaryWidget.tsx`   | `AccountSummaryWidget`   | SummaryWidget/KPI   | Count/current/available balance/statements this month       |
| `AccountsHeader.tsx`         | `AccountsHeader`         | Filters/Header      | Sync-all / link-account actions                             |
| `BankAccountCard.tsx`        | `BankAccountCard`        | Other (entity card) | Balance/health/monthly credits-debits/top merchant-category |
| `BankAccountDrawer.tsx`      | `BankAccountDrawer`      | Drawer              | Review/edit + recent transactions/statements                |
| `BankAccountFormDialog.tsx`  | `BankAccountFormDialog`  | FormDialog          | Link new bank account                                       |
| `BankAccountHealthBadge.tsx` | `BankAccountHealthBadge` | StatusBadge         | healthy/low balance/sync required/needs review              |

### credit-cards/ (6 files) — Module 9

| File                          | Component                 | Category            | Purpose                                                           |
| ----------------------------- | ------------------------- | ------------------- | ----------------------------------------------------------------- |
| `CreditCardDrawer.tsx`        | `CreditCardDrawer`        | Drawer              | Review/edit (incl. credit limit) + recent transactions/statements |
| `CreditCardFormDialog.tsx`    | `CreditCardFormDialog`    | FormDialog          | Add new card (bank/network/last4/limit/dates)                     |
| `CreditCardHealthBadge.tsx`   | `CreditCardHealthBadge`   | StatusBadge         | healthy/due soon/high utilization/overdue                         |
| `CreditCardSummaryWidget.tsx` | `CreditCardSummaryWidget` | SummaryWidget/KPI   | Count/limit/outstanding/available/statements this month           |
| `CreditCardTile.tsx`          | `CreditCardTile`          | Other (entity card) | Outstanding/utilization bar/limit/due date                        |
| `CreditCardsHeader.tsx`       | `CreditCardsHeader`       | Filters/Header      | Add-credit-card action                                            |

### clients/ (9 files) — Module 7

| File                       | Component              | Category          | Purpose                                                                                     |
| -------------------------- | ---------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| `ClientDrawer.tsx`         | `ClientDrawer`         | Drawer            | Review/edit + financial summary + top categories/merchants + recent transactions/statements |
| `ClientFilters.tsx`        | `ClientFilters`        | Filters/Header    | Type/status/category/date-added filters                                                     |
| `ClientFormDialog.tsx`     | `ClientFormDialog`     | FormDialog        | Add/edit client                                                                             |
| `ClientRowActionsMenu.tsx` | `ClientRowActionsMenu` | RowActionsMenu    | Review, view transactions, edit, delete                                                     |
| `ClientStatusBadge.tsx`    | `ClientStatusBadge`    | StatusBadge       | Active/pending/suspended                                                                    |
| `ClientSummaryWidget.tsx`  | `ClientSummaryWidget`  | SummaryWidget/KPI | Total/spend/requiring review/active                                                         |
| `ClientTable.tsx`          | `ClientTable`          | Table             | Avatar + clickable name (opens review)                                                      |
| `ClientTableSkeleton.tsx`  | `ClientTableSkeleton`  | Skeleton          | Loading rows                                                                                |
| `ClientsHeader.tsx`        | `ClientsHeader`        | Filters/Header    | Export / add-client actions                                                                 |

### dashboard/ (9 files) — Module 2

| File                           | Component                  | Category                   | Purpose                                                                                                    |
| ------------------------------ | -------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `AccountCard.tsx`              | `AccountCard`              | Other (entity card)        | Compact connected-account card (balance/due, inflow-outflow or daily avg)                                  |
| `AccountsWidget.tsx`           | `AccountsWidget`           | SummaryWidget/KPI          | Grid of `AccountCard`s with loading/empty states                                                           |
| `DashboardHeader.tsx`          | `DashboardHeader`          | Filters/Header             | Live-clock "Refreshed at" + refresh button                                                                 |
| `FinancialSnapshotWidget.tsx`  | `FinancialSnapshotWidget`  | SummaryWidget/KPI          | `KPICard` grid of top-line metrics                                                                         |
| `KPICard.tsx`                  | `KPICard`                  | SummaryWidget/KPI          | Generic metric card with trend arrow/warning — reused app-wide (also used by `analytics/AnalyticsKpiGrid`) |
| `QuickActionsWidget.tsx`       | `QuickActionsWidget`       | Other (nav widget)         | Grid of quick-action links                                                                                 |
| `RecentTransactionsWidget.tsx` | `RecentTransactionsWidget` | Table                      | Mini recent-transactions table with status dots                                                            |
| `ResolutionQueueWidget.tsx`    | `ResolutionQueueWidget`    | Other (queue widget)       | Flagged items needing review + resolve action                                                              |
| `StatementWidget.tsx`          | `StatementWidget`          | Other (empty-state widget) | Placeholder — no live statement-activity data on Dashboard yet                                             |

### analytics/ (19 files) — Module 10

| File                           | Component                   | Category                 | Purpose                                                                                                       |
| ------------------------------ | --------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ActiveFiltersRow.tsx`         | `ActiveFiltersRow`          | Filters/Header           | Removable chip row for the page's stacked cross-filters                                                       |
| `AnalyticsHeader.tsx`          | `AnalyticsHeader`           | Filters/Header           | Title + CSV export dropdown                                                                                   |
| `AnalyticsKpiGrid.tsx`         | `AnalyticsKpiGrid`          | SummaryWidget/KPI        | Clickable KPI cards w/ hover/cross-filter/drill-down                                                          |
| `AnalyticsPageSkeleton.tsx`    | `AnalyticsPageSkeleton`     | Skeleton                 | Full-page loading skeleton                                                                                    |
| `AnalyticsTable.tsx`           | `AnalyticsTable`            | Table                    | Generic searchable/sortable/paginated ranked-row table + CSV export — used by every Secondary Analytics tab   |
| `BankAccountActivityChart.tsx` | `BankAccountActivityChart`  | Chart                    | Area+line credits/debits/net per account                                                                      |
| `BizPersonalSpendChart.tsx`    | `BizPersonalSpendChart`     | Chart                    | Grouped bar, business vs personal over time                                                                   |
| `CategorySpendChart.tsx`       | `CategorySpendChart`        | Chart                    | Donut, top 7 categories + Other                                                                               |
| `ChartCard.tsx`                | `ChartCard`                 | Chart (shared wrapper)   | Title/subtitle/legend/"View Transactions" chrome for every chart                                              |
| `ChartTooltip.tsx`             | `ChartTooltip`              | Chart (tooltip)          | Custom Recharts tooltip, INR-formatted                                                                        |
| `ClientSpendChart.tsx`         | `ClientSpendChart`          | Chart                    | Bar, ranked by client                                                                                         |
| `CreditCardSpendChart.tsx`     | `CreditCardSpendChart`      | Chart                    | Stacked bar per card over time, clickable legend                                                              |
| `GlobalFilterBar.tsx`          | `GlobalFilterBar`           | Filters/Header           | Sticky page-wide filter bar                                                                                   |
| `InsightsPanel.tsx`            | `InsightsPanel`             | Other (insights widget)  | Rule-based insight cards, click to cross-filter                                                               |
| `MerchantSpendChart.tsx`       | `MerchantSpendChart`        | Chart                    | Horizontal bar, ranked by merchant                                                                            |
| `SecondaryAnalyticsTabs.tsx`   | `SecondaryAnalyticsTabs`    | Other (tabbed container) | 9 tabs, each an `AnalyticsTable`                                                                              |
| `SpendTrendChart.tsx`          | `SpendTrendChart`           | Chart                    | Line chart w/ granularity switcher                                                                            |
| `analyticsInteraction.ts`      | _(helper, not a component)_ | n/a                      | `AnalyticsWidgetHandlers` prop contract (hover/cross-filter/drill-down) + `isHighlighted` hover-dimming logic |
| `analyticsRowMappers.ts`       | _(helper, not a component)_ | n/a                      | Reshapes computed chart datasets into `AnalyticsRankedRow[]` for tables/CSV export                            |

---

## 5. Reuse guidance for future modules (Settings — Module 11)

Per this map, Settings should reach for: `PageContainer`, `QueryBoundary`, `EmptyState`, `ConfirmDialog` (for destructive settings actions), `Pagination` (if any settings list needs it), `EntityReviewDrawer` (if a settings sub-entity needs a review/edit drawer), and the shadcn/ui primitives. No new "settings-flavored" variant of any of the above should be built without checking this document first, per CLAUDE.md's "reuse before creating new components" rule.
