# Route Map

Source of truth: `src/app/App.tsx` (routing), `src/pages/*.tsx` (per-route composition), `src/components/ActiveFilterBanner.tsx` and `src/components/EntityReviewDrawer.tsx` (the two shared drill-down/drawer primitives).

## Routes

All routes are lazy-loaded (`React.lazy`) and rendered inside a single `<Route element={<AppShell />}>` wrapper, per CLAUDE.md's "Every route should lazy load" rule. Route table from `App.tsx`:

| Path            | Page component     | Notes                                                                                                                            |
| --------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `/` (index)     | `Dashboard.tsx`    | Module 2                                                                                                                         |
| `/clients`      | `Clients.tsx`      | Module 7                                                                                                                         |
| `/accounts`     | `Accounts.tsx`     | Module 8                                                                                                                         |
| `/credit-cards` | `CreditCards.tsx`  | Module 9                                                                                                                         |
| `/transactions` | `Transactions.tsx` | Module 3                                                                                                                         |
| `/statements`   | `Statements.tsx`   | Module 4                                                                                                                         |
| `/categories`   | `Categories.tsx`   | Module 5                                                                                                                         |
| `/merchants`    | `Merchants.tsx`    | Module 6                                                                                                                         |
| `/analytics`    | `Analytics.tsx`    | Module 10                                                                                                                        |
| `/settings`     | `Settings.tsx`     | Module 11 — renders `ModulePlaceholder` (`status="Module 11 — paused, no dedicated Stitch design provided yet."`), not yet built |
| `*` (catch-all) | `NotFound.tsx`     | Renders `ModulePlaceholder` (`title="404"`)                                                                                      |

This matches CLAUDE.md Part 1's routing table exactly. `/ai-review` and a dedicated global-search route are intentionally absent — both are **deferred modules** (see CLAUDE.md's "DEFERRED MODULES" note), not part of the current sequence.

---

## Entity drawers

Every drawer is built on the shared `EntityReviewDrawer`/`EntityReviewDrawerFooter` primitive (`src/components/EntityReviewDrawer.tsx`, a `Sheet`-based shell — see [UI_COMPONENT_MAP.md](./UI_COMPONENT_MAP.md)), except `TransactionDetailsDrawer` and `StatementDetailsDrawer`, which predate that shared shell and are read-only/inline-edit sheets in their own right.

| Drawer                     | Opened from                                   | Shows                                                                                                      |
| -------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `TransactionDetailsDrawer` | `Transactions.tsx` (row click)                | Full transaction detail + inline category/client/status edit                                               |
| `StatementDetailsDrawer`   | `Statements.tsx` (row click)                  | Read-only statement metadata                                                                               |
| `MerchantReviewDrawer`     | `Merchants.tsx` (row click / "Review" action) | Merchant profile edit + recent transactions, links "View All Transactions"                                 |
| `ClientDrawer`             | `Clients.tsx` (row click / "Review" action)   | Client profile edit + financial summary, top categories/merchants, recent transactions/statements          |
| `BankAccountDrawer`        | `Accounts.tsx` (card click)                   | Account profile edit + recent transactions/statements, links "View All Transactions"/"View All Statements" |
| `CreditCardDrawer`         | `CreditCards.tsx` (tile click)                | Card profile edit (including credit limit) + recent transactions/statements, same two "View All" links     |

Categories has no drawer — `CategoryFormDialog` (a modal, not a side-sheet) handles both create and edit.

---

## Drill-down / cross-filter navigation graph

The app has one canonical mechanism for "show me the underlying rows for this summary": navigate to the target list page with a query-string filter, which the target page reads via `useSearchParams` and (for most targets) surfaces as an `ActiveFilterBanner`. Sources are typically read-only summary pages (Categories, Merchants, Clients, Analytics, Dashboard's cards) or drawers' "View All ..." links; targets are always list pages.

```
Categories ──"View Transactions"──▶ /transactions?categoryId=
Categories ──"View Merchants"─────▶ /merchants?categoryId=       (Merchants page does not read this param)

Merchants ───"View Transactions"──▶ /transactions?merchantId=

Clients ─────"View Transactions"──▶ /transactions?clientId=
Clients ─────"View Statements"────▶ /statements?clientId=
Clients ─────"View Accounts"──────▶ /accounts?clientId=
Clients ─────"View Credit Cards"──▶ /credit-cards?clientId=

Accounts ────"View Transactions"──▶ /transactions?bankAccountId=
Accounts ────"View Statements"────▶ /statements?accountId=
Accounts ────(client link)────────▶ /accounts?clientId=          (Accounts is also a drill-down TARGET from Clients)

CreditCards ─"View Transactions"──▶ /transactions?creditCardId=
CreditCards ─"View Statements"────▶ /statements?accountId=
CreditCards ─(client link)────────▶ /credit-cards?clientId=      (also a drill-down TARGET from Clients)

Analytics ───"Drill Down"/KPI click ▶ /transactions?dateFrom=&dateTo=&categoryId=&clientId=&merchantId=
                                                     &bankAccountId=&creditCardId=&type=&ownerType=
                                                     &paymentMode=&status=&amountMin=&amountMax=
                                     (any subset of TRANSACTION_FILTER_KEYS, per the clicked chart/KPI/insight)
```

`Analytics.tsx` itself is drill-down-only in one direction — it is never a drill-down _target_ (no `useSearchParams` reads on that page; its own filters live in local component state via `GlobalFilterBar`, not the URL). Within the page it also supports **cross-filtering** (clicking a chart segment adds to the page's own local filter state without navigating) via `AnalyticsWidgetHandlers`/`onCrossFilter` — a second, page-local flavor of "click to filter" distinct from the URL-based drill-down above.

Dashboard (`/`) has no drill-down params read and shows no `ActiveFilterBanner` — it links out via its own `QuickActionsWidget` (static hrefs, e.g. "Add Transaction"), not filtered URLs.

---

## Per-page filter params and `ActiveFilterBanner` usage

| Page                            | Reads `useSearchParams`? | Param(s) read                                                                                                                                                                                                  | Banner label pattern                                                                                |
| ------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `Transactions.tsx`              | Yes                      | Any of `categoryId`, `merchantId`, `bankAccountId`, `creditCardId`, `clientId`, `dateFrom`, `dateTo`, `type`, `ownerType`, `paymentMode`, `status`, `amountMin`, `amountMax` (the `DRILL_DOWN_LABELS` key set) | `Filtered by ${drillDownLabel}` — captured once on mount                                            |
| `Statements.tsx`                | Yes                      | `accountId`, `clientId` (`DRILL_DOWN_PARAMS`)                                                                                                                                                                  | `Filtered by ${label}: ${drillDownLabel}`                                                           |
| `Accounts.tsx`                  | Yes                      | `clientId` (`CLIENT_ID_PARAM`)                                                                                                                                                                                 | `Filtered by client: ${clientDrillDownLabel}`                                                       |
| `CreditCards.tsx`               | Yes                      | `clientId` (`CLIENT_ID_PARAM`)                                                                                                                                                                                 | `Filtered by client: ${clientDrillDownLabel}`                                                       |
| `Categories.tsx`                | No                       | —                                                                                                                                                                                                              | none (drill-down source only)                                                                       |
| `Merchants.tsx`                 | No                       | —                                                                                                                                                                                                              | none (drill-down source only; also a target of Categories' `categoryId` link, but does not read it) |
| `Clients.tsx`                   | No                       | —                                                                                                                                                                                                              | none (drill-down source only)                                                                       |
| `Analytics.tsx`                 | No (local state)         | —                                                                                                                                                                                                              | none — uses its own `ActiveFiltersRow` widget instead, for the page's local cross-filter stack      |
| `Dashboard.tsx`                 | No                       | —                                                                                                                                                                                                              | none                                                                                                |
| `Settings.tsx` / `NotFound.tsx` | No                       | —                                                                                                                                                                                                              | none                                                                                                |

All four `ActiveFilterBanner` consumers (`Transactions`, `Statements`, `Accounts`, `CreditCards`) pass an `onClear` that removes the drill-down param(s) from the URL, returning the page to its unfiltered state without a full navigation.

---

## Navigation shell (not a route, but governs every page's chrome)

`AppShell.tsx` composes `Sidebar` + `TopNav` around a React Router `<Outlet />`. `Sidebar.tsx` renders nav items from `src/lib/navigation.ts`'s `primaryNavItems`/`secondaryNavItems` lists — the source of the sidebar order, which matches `PRODUCT_DECISIONS.md`'s approved structure (Dashboard, Clients, Accounts, Credit Cards, Transactions, Statements, Categories, Merchant Center, Analytics, Settings). `TopNav.tsx` provides a mobile nav trigger (opens `Sidebar` in a `Sheet`), a global search `Input` (not wired to the deferred Global Search module — visual only today), theme switcher, and user menu.
