# COMPONENT_LIBRARY.md

Catalog of reusable components — built, and required by the updated Stitch designs. This file did not exist before; created fresh per the design-diff task. Documentation only — no components below marked "Required" have been created yet.

---

## Built (Module 1 — Application Shell)

| Component           | Path                                   | Purpose                                                                                                   |
| ------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `AppShell`          | `src/layouts/AppShell.tsx`             | Top-level layout: sidebar + topnav + routed outlet                                                        |
| `Sidebar`           | `src/layouts/Sidebar.tsx`              | Primary navigation, desktop + mobile drawer content                                                       |
| `TopNav`            | `src/layouts/TopNav.tsx`               | Global search, theme toggle, notifications, user menu                                                     |
| `PageContainer`     | `src/layouts/PageContainer.tsx`        | Consistent page padding/wrapper                                                                           |
| `Breadcrumbs`       | `src/components/Breadcrumbs.tsx`       | Typed breadcrumb trail — already reusable for the Analytics screen's breadcrumb once that module is built |
| `ModulePlaceholder` | `src/components/ModulePlaceholder.tsx` | "Not yet built" stub used by unbuilt route pages                                                          |

## Built (shadcn primitives, `src/components/ui/`)

`button`, `sheet`, `avatar`, `dropdown-menu`, `input`, `skeleton` — all Base UI-backed (not Radix; see CONFIG_REPORT.md for the API differences that matter, e.g. `render` prop instead of `asChild`, `onClick` instead of `onSelect`).

---

## Required — identified by DESIGN_DIFF_REPORT.md (not yet built)

None of these should be created until the open questions in DESIGN_DIFF_REPORT.md are resolved and the corresponding module is approved to start.

| Component                             | Likely home                                        | Purpose                                                                               | Notes                                                                                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `KPICard`                             | `components/dashboard/` (shared with Analytics)    | Label + large value + trend indicator (up/down/flat, colored)                         | Used by both Dashboard and Analytics KPI rows — one component, not two                                                                                                                                       |
| `FacilityCard` / `AccountSummaryCard` | `components/accounts/`                             | Bank/credit account summary: balance, inflow/outflow or due-date, last sync           | Needs an "urgent" variant (colored border, badge, primary action) — overlaps with the existing Financial Accounts module's account cards; should be the _same_ component, not a Dashboard-specific duplicate |
| `ResolutionQueueItem`                 | `components/dashboard/` or `components/ai-review/` | Actionable flagged-transaction row: category tag, description, amount, resolve action | Conceptually overlaps with the AI Review module — needs a decision on which module owns this data/component before building                                                                                  |
| `QuickActionTile`                     | `components/dashboard/`                            | Icon + label button in a grid                                                         | Simple, low-risk to build once approved                                                                                                                                                                      |
| `FloatingActionButton`                | `components/`                                      | Fixed-position primary action button                                                  | Needs a decision on true viewport-corner fixed positioning vs. sidebar-relative (current export pins it oddly to the sidebar)                                                                                |
| `DonutChart`                          | `components/charts/`                               | Category/allocation breakdown with legend                                             | Must be built as a real Recharts `PieChart`, not the hand-rolled stacked-SVG-arc technique in the export — real charts get accessible tooltips and legends for free                                          |
| `TrendChart`                          | `components/charts/`                               | Time-series bar/area chart with a range toggle (ALL/6M/1M)                            | Same reasoning — Recharts `BarChart`/`AreaChart`, not divs with inline heights                                                                                                                               |
| `ClientProfitabilityCard`             | `components/analytics/`                            | Revenue/Spend/Margin summary per client                                               | Needs an explicit "inactive/dimmed" state definition — the export uses unexplained `opacity-50`                                                                                                              |
| `LabeledProgressBar`                  | `components/`                                      | Progress bar with a label, value, and severity coloring                               | Used for credit-line utilization; generic enough to reuse elsewhere (e.g. category budgets later)                                                                                                            |
| `FYToggle`                            | `components/`                                      | Segmented control for fiscal-year selection                                           | Needs a decision on how many fiscal years are actually selectable and where the value comes from                                                                                                             |
| `DateRangePicker`                     | `components/`                                      | Button that opens a date-range selector                                               | Not yet designed beyond a static button — needs an actual picker UI decision                                                                                                                                 |
| `ExportButton`                        | `components/`                                      | Triggers a report/data export                                                         | No export mechanism (format, destination) is specified anywhere yet                                                                                                                                          |
| `SystemStatusIndicator`               | `components/`                                      | Pulsing dot + status label in a footer                                                | Needs a real data source (what "operational" means) before it can be non-decorative                                                                                                                          |
| `TopNavUserMenu` (extended variant)   | `layouts/TopNav.tsx`                               | Avatar + name + role, not just an icon-only avatar                                    | Conflicts with the already-approved "generic shell" decision — see DESIGN_DIFF_REPORT.md                                                                                                                     |

## Icon additions needed (Lucide equivalents, once approved)

`credit_card` → `CreditCard`, `trending_up`/`trending_down`/`trending_flat` → `TrendingUp`/`TrendingDown`/`Minus`, `warning` → `TriangleAlert`, `payments` → `Banknote`, `account_balance_wallet` → `Wallet`, `bar_chart` → `BarChart3` (already mapped), `receipt` → `Receipt` (already mapped), `cloud`/`flight`/`restaurant`/`mail` → `Cloud`/`Plane`/`UtensilsCrossed`/`Mail` (merchant category glyphs), `calendar_today` → `Calendar`, `expand_more` → `ChevronDown`, `download` → `Download`, `chevron_right` → `ChevronRight` (already used by `Breadcrumbs`), `add_circle` → `CirclePlus`, `person_add` → `UserPlus`, `store` → `Store` (already mapped), `request_quote` → `FileText`/`ReceiptText`, `sync` → `RefreshCw` (already mapped).

---

## Open before any of the "Required" row is built

See DESIGN_DIFF_REPORT.md's Recommendation section — brand name, dashboard-candidate supersession, and the two empty/unfinished design sections all need your decision first.
