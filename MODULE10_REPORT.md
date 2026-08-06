# MODULE10_REPORT.md

Module 10 — Analytics

Generated 2026-08-06. Updated 2026-08-06 with a UI refinement pass (bug-fix/usability/product-feedback — see "UI Refinement Pass" below).

---

## Spec compliance summary

- Page: `/analytics`, sticky **Global Filter Bar** (Date Range, Client, Category, Merchant, Bank Account, Credit Card, Bank, Transaction Type, Payment Mode, Biz/Personal, Amount Range, plus disabled "(future)" Tags/Saved Views chips).
- **10 KPI cards** on the existing `KPICard`: Total Spend, Total Transactions, Average Transaction, Monthly Spend (with MoM trend), Total Income, Net Cash Flow, Highest Spending Category, Highest Spending Merchant, Most Used Card, Most Used Account.
- **7 main charts**, all custom-styled Recharts (no default palette/tooltip/legend — see "Chart styling" below): Spend Trend (line, Spend-only, Day/Week/Month/Quarter/Year granularity toggle), Category Split (donut, top 7 categories + "Other" + legend list), Merchant Spend (horizontal bar), Client Spend (bar), Credit Card Spend (stacked bar, top 6 cards × month), Bank Account Activity (area: credits/debits/net + per-account ranked list), Business vs Personal Spend (grouped bar, monthly).
- **Secondary Analytics**: one reusable `AnalyticsTable` (search/sort/paginate/export/row drill-down) instantiated across 9 tabs — Top Categories, Top Merchants, Top Clients, Top Credit Cards, Top Accounts, Highest Transactions, Recurring Merchants, Largest Expenses, Refund Analysis.
- **Insights Panel**: rule-based cards (MoM spend change, top-merchant concentration, high card spend, largest transaction), computed entirely in the repository — never in React.
- **Interactivity — three tiers, wired identically across every widget** (KPI/chart/legend/table row):
  1. **Hover → cross-highlight** (visual only, no refetch): dims non-matching marks/rows via a shared `hoveredDimension` + `isHighlighted()` helper.
  2. **Click → cross-filter** (commits, stacks, refetches): merges the clicked dimension into `appliedFilters`; every KPI/chart/table re-queries. Shown as removable chips in `ActiveFiltersRow`; multiple dimensions stack.
  3. **"View Transactions" / per-row drill icon → navigate away**: sends the full current filter set to `/transactions`, reusing `ActiveFilterBanner` — no second routing mechanism.
- **Export menu** (7 CSV options): Dashboard Summary, Filtered Transactions, Filtered Statements, Category/Merchant/Client/Card Summary. "Export PDF/Excel" from the Stitch reference were **substituted with CSV** — no PDF/xlsx library is in the approved stack; flagged to the project owner before building, not silently invented.
- Repository pattern: `AnalyticsRepository` → `MockAnalyticsRepository`, mock-only, single swap point at `analytics.service.ts` for Module 12A.

## Components created

**Page-level**

- `src/pages/Analytics.tsx` — composition only; owns `draftFilters`/`appliedFilters`/`granularity`/`hoveredDimension` state and the cross-filter/cross-highlight/drill-down handlers, replaces the Module-2-era `ModulePlaceholder` stub.

**Analytics-specific (`src/components/analytics/`)**

| Component                                                                                                                                                      | Responsibility                                                                                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AnalyticsHeader`                                                                                                                                              | Title/subtitle + Export dropdown (7 CSV options)                                                                                                                      |
| `GlobalFilterBar`                                                                                                                                              | Sticky filter bar, every dimension a `FilterChip` popover                                                                                                             |
| `ActiveFiltersRow`                                                                                                                                             | Removable chips for the stacked cross-filters                                                                                                                         |
| `AnalyticsKpiGrid`                                                                                                                                             | The 10 KPI cards, click-to-cross-filter where a dimension applies                                                                                                     |
| `ChartCard`                                                                                                                                                    | Shared chart chrome (title/legend/"View Transactions") — reused 7×                                                                                                    |
| `ChartTooltip`                                                                                                                                                 | Shared custom Recharts tooltip content (values lead, series keyed by stroke swatch)                                                                                   |
| `SpendTrendChart`, `CategorySpendChart`, `MerchantSpendChart`, `ClientSpendChart`, `CreditCardSpendChart`, `BankAccountActivityChart`, `BizPersonalSpendChart` | The 7 main charts                                                                                                                                                     |
| `AnalyticsTable`                                                                                                                                               | The one reusable secondary-analytics table (search/sort/paginate/export/row drill)                                                                                    |
| `SecondaryAnalyticsTabs`                                                                                                                                       | Hosts 9 `AnalyticsTable` instances on the new `ui/tabs` primitive                                                                                                     |
| `analyticsRowMappers`                                                                                                                                          | Reshapes already-computed chart data (`AnalyticsCategorySlice[]`, `AnalyticsCardSeriesResult`) into `AnalyticsRankedRow[]` for tabular/CSV display — no recomputation |
| `analyticsInteraction`                                                                                                                                         | The shared `AnalyticsWidgetHandlers` contract + `isHighlighted()` — the three-tier interaction model every widget wires into                                          |
| `InsightsPanel`                                                                                                                                                | Renders `AnalyticsInsight[]` as clickable (cross-filter) cards                                                                                                        |
| `AnalyticsPageSkeleton`                                                                                                                                        | Full-page loading shell (first paint only — refetches hold the previous render at reduced opacity instead, per dataviz guidance)                                      |

**New shared (not analytics-only)**

- `src/components/ui/tabs.tsx` — shadcn Tabs primitive on `@base-ui/react/tabs` (same package already backing `Popover`/`Select`/`Dialog` — no new dependency).
- `src/components/FilterReferenceSelect.tsx` — the "All / pick one" popover select, promoted out of `FilterToolbar.tsx` (which had a private copy) so Transactions and Analytics share one implementation instead of two.

## Components/architecture reused (not duplicated)

- `FilterChip` (`components/transactions/FilterChip.tsx`) — reused verbatim for every `GlobalFilterBar` dimension.
- `KPICard`, `QueryBoundary`, `EmptyState`, `Pagination`, `Skeleton`, `DropdownMenu*`, `Button`, `Input`, `Label` — all reused unmodified.
- `ActiveFilterBanner` — reused verbatim; see "Drill-down wiring" below for how Transactions/Statements were extended to seed it from Analytics' stacked filters.
- `useTransactionCategories` / `useTransactionClients` / `useTransactionMerchants` / `useTransactionAccounts` (Module 3) — reused as-is for every filter dropdown's reference data; Analytics fetches no duplicate lookups.
- `downloadCsv` — reused for every export; `analyticsRowsToCsv` and `statementsToCsv` added to `utils/csv.ts` alongside the existing `transactionsToCsv`/`categoriesToCsv`/`merchantsToCsv`/`clientsToCsv`.
- `formatINR` — reused for every currency value, including inside Recharts tick formatters and tooltips.

## Domain models reused / extended

- `Category`, `Client`, `Merchant`, `TransactionAccount`, `Statement` — read-only reuse, untouched.
- **`Transaction.paymentMode` / `TransactionFilters.paymentMode`** (new, additive) — `PaymentMode = 'upi' | 'card' | 'netbanking' | 'cash' | 'cheque' | 'auto_debit'`. The brief lists Payment Mode as a live (not "(future)") filter, but no such field existed. Flagged to the project owner before building; approved implicitly by proceeding. Derived deterministically in `generate-transactions.ts`'s existing seeded PRNG (bank accounts skew upi/netbanking/cash/cheque; credit cards skew card/auto_debit) — same pattern already used there for `status`/`ownerType`. Wired into both Transactions' and Analytics' filtering so it's one real field, not an Analytics-only fake.
- **`domain/Analytics.ts`** (new) — `AnalyticsGranularity`, `AnalyticsFilters`, `AnalyticsKpiMetric`, `AnalyticsSummary`, `AnalyticsBucket`/`AnalyticsTrendPoint`/`AnalyticsOwnerTypePoint`, `AnalyticsCategorySlice`, `AnalyticsRankedRow` (the one shape every ranked chart list and secondary table renders), `AnalyticsCardSeriesPoint`/`AnalyticsCardSeriesResult`, `AnalyticsAccountActivityPoint`/`AnalyticsAccountActivityResult`, `AnalyticsInsight`/`AnalyticsInsightSeverity`.

## Files changed

**New:**

```
src/domain/Analytics.ts
src/repositories/analytics.repository.ts
src/repositories/mock-analytics.repository.ts
src/services/analytics.service.ts
src/hooks/useAnalytics.ts
src/hooks/useAnalyticsExports.ts
src/components/analytics/*.tsx, analyticsInteraction.ts, analyticsRowMappers.ts  (19 files)
src/components/ui/tabs.tsx
src/components/FilterReferenceSelect.tsx
tests/unit/mock-analytics.repository.test.ts
tests/e2e/analytics.spec.ts
```

**Modified:**

```
src/pages/Analytics.tsx            — replaced the ModulePlaceholder stub with the full page
src/domain/Transaction.ts          — +PaymentMode, +Transaction.paymentMode, +TransactionFilters.paymentMode
src/repositories/mock-data/generate-transactions.ts  — derives paymentMode
src/repositories/mock-transaction.repository.ts       — filters on paymentMode; create() defaults it
src/lib/queryKeys.ts               — +analytics query-key namespace
src/utils/csv.ts                   — +analyticsRowsToCsv, +statementsToCsv
src/styles/index.css               — +--viz-1..8/good/warning/serious/critical/grid/axis tokens (light+dark)
src/pages/Transactions.tsx         — drill-down generalized from one query param to every matching
                                      TransactionFilters-shaped param present, so Analytics can hand off
                                      its full stacked filter set in one navigation; same ActiveFilterBanner
src/components/transactions/FilterToolbar.tsx  — imports the promoted FilterReferenceSelect instead of
                                                  its own private copy
```

`src/pages/Statements.tsx` was touched during the initial build (added a `status` drill-down param for the
since-removed Statement Processing Status feature) and then reverted byte-for-byte back to its Module
8/9 state in the UI refinement pass below — it carries no net change.

## Architecture decisions

1. **Repository computes everything; components only render.** `MockAnalyticsRepository` reads the _existing_ shared mock datasets (`mockTransactions`, `mockCategories`/`mockClients`/`mockMerchants`/`mockBankAccounts`/`mockCreditCards`) — no parallel fake dataset. One `matchesAnalyticsFilters()` helper is reused by all 11 repository methods (mirrors `mock-transaction.repository.ts`'s `matchesFilters`). "Top Categories"/"Top Credit Cards" secondary tables are _derived_ from the same chart-query results via `analyticsRowMappers.ts` rather than recomputed — only Highest Transactions, Recurring Merchants (3+ distinct months), Largest Expenses, and Refund Analysis (credit-type txns against merchants with existing debit history — a documented heuristic, since no explicit "refund" flag exists) need dedicated methods.
2. **Three explicit interaction tiers, one shared contract.** The brief literally contradicted itself (chart clicks described as both "navigate to Transactions" and "cross-filter and stack in place"). Resolved with the project owner before building: hover cross-highlights, click cross-filters in place and stacks, and a separate "View Transactions"/row-icon action performs the literal drill-down navigation. Every widget takes the same `AnalyticsWidgetHandlers` props (`hoveredDimension`, `onHover`, `onCrossFilter`, `onDrillDown`) — no bespoke per-chart interaction model.
3. **Custom, validated Recharts styling — no default look.** Loaded the `dataviz` skill before writing chart code. `--viz-1..8` are the skill's validated 8-hue categorical palette (CVD-safe both light/dark, not the app's pre-existing `--chart-1..5`, which are dark-mode-only and literally grayscale in light mode). `ChartCard`/`ChartTooltip` centralize custom tooltips (values lead, series keyed by a stroke swatch, never a filled box), gradient area fills, and a consistent series→color mapping — no chart uses Recharts' default palette, legend, or tooltip. **Consumed as the raw `var(--viz-N)` custom property directly, never through a `--color-viz-*` Tailwind `@theme` alias** — see "UI Refinement Pass" for why.
4. **Bucketing stands in for a future SQL `date_trunc` view.** `buildBuckets()`/`bucketIndexForDate()` in the mock repository generate a fixed, zero-filled bucket skeleton per granularity so trend-chart axes are stable even where a bucket has no data — the same shape Module 12A's real SQL views will need to produce. Note: the mock dataset spans ~150 days, so Quarter/Year buckets will look sparse until real historical data lands in 12A — a data-availability artifact, not a bug.
5. **Drill-down extended, not re-invented.** `Transactions.tsx`'s single-param `DRILL_DOWN_PARAMS` (established by Modules 5/6/8/9) is generalized to seed from _every_ matching param present, so Analytics can hand off several stacked filters (e.g. category + client) in one navigation and still show one combined `ActiveFilterBanner` label with one "Clear" action — same component, same mechanism, just reading more than one param.

## Testing results

| Check                                                                                     | Result                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                                                     | ✔ Pass                                                                                                                                                                                                                                                                                                              |
| `npx eslint .`                                                                            | ✔ 0 errors (7 pre-existing benign warnings — React Compiler/TanStack Table incompatibility notices and two `react-refresh` export warnings, all unrelated to this module)                                                                                                                                           |
| `npm run build`                                                                           | ✔ Pass — `Analytics` builds as its own lazy-loaded route chunk (599 kB / 173 kB gzip; flagged by Vite's 500 kB chunk-size warning, driven by Recharts — isolated to the Analytics route only, doesn't affect any other page's bundle)                                                                               |
| `npx vitest run`                                                                          | ✔ 27/27 (14 pre-existing + 13 new `MockAnalyticsRepository` tests: summary aggregation/filtering, category-spend percentage/amount invariants, spend-trend bucketing invariants, credit-card-spend capping, recurring-merchant detection, statement-status grouping, insight well-formedness, bank-name dedup/sort) |
| `npx playwright test tests/e2e/analytics.spec.ts --project=chromium` (isolated, 1 worker) | ✔ 8/8 — page render, click-to-cross-filter + chip, filter clear, "View Transactions" drill to `/transactions` with the banner, Statement Processing Status drill to `/statements?status=`, secondary-table search + CSV export, granularity toggle, no horizontal overflow at 390px                                 |
| `npx playwright test --project=chromium` (full suite, default parallel workers)           | 96/102 passed; 6 failures (4 in `analytics.spec.ts`, 1 each in `accounts.spec.ts`/`merchants.spec.ts` — unrelated pages) all reproduced as sandbox parallel-load flakiness (basic headings/buttons not found under heavy concurrent dev-server load)                                                                |
| Isolation re-run of the 3 affected specs at `--workers=2`                                 | ✔ 42/42 passed, confirming the failures above were flakiness, not a regression — same pattern and same resolution documented in `MODULE8_REPORT.md`/`MODULE9_REPORT.md`                                                                                                                                             |
| Responsive                                                                                | ✔ Verified desktop/tablet/mobile; fixed one real bug found during mobile testing (see below)                                                                                                                                                                                                                        |
| Dark mode                                                                                 | ✔ Only mode exercised (light mode uses the app-wide shadcn fallback, unchanged)                                                                                                                                                                                                                                     |

**Bug found and fixed during manual/Playwright verification (initial pass):** `ChartCard`'s legend+"View Transactions" row (`flex items-center gap-md`) didn't wrap on narrow viewports, causing a 3px horizontal overflow at 390px width. Fixed by adding `flex-wrap` — one shared-component fix, corrects all 7 charts at once.

## Future Supabase integration points

1. Implement `SupabaseAnalyticsRepository implements AnalyticsRepository`, backed by the SQL views enumerated in CLAUDE.md Part 3 ("REQUIRED SQL VIEWS" → Analytics: `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_account_analytics`, `vw_credit_utilization`, `vw_transaction_trends`) plus RPCs for the bucketing/recurring-merchant/refund-heuristic logic currently done in `MockAnalyticsRepository`.
2. Change one line in `src/services/analytics.service.ts` to construct it instead of `MockAnalyticsRepository`.
3. `Transaction.paymentMode` needs a real column on the eventual `transactions` table (or a derivation in the ingestion workflow) — currently mock-only.
4. "Export PDF"/"Excel" are CSV-only until a PDF/spreadsheet library is explicitly approved (see Architecture decision 3's export note).

## UI Refinement Pass (2026-08-06)

A follow-up pass driven by direct product feedback after the initial build shipped and was reviewed in the browser — bug fixes plus several scope changes. No architectural changes; the repository/service/hook layering and the three-tier interaction model are untouched.

**Real bug found and fixed: `--color-viz-*` Tailwind `@theme inline` tokens silently dropped values.** The Category Split donut was rendering several slices solid black. Root cause, confirmed via `getComputedStyle`: the `--color-viz-N: var(--viz-N)` re-export pattern inside `@theme inline` (mirroring the app's pre-existing `--color-chart-N: var(--chart-N)` pattern) resolved to an **empty string** for a subset of the 8 categorical tokens and all 4 status tokens (`--color-viz-2/5/6/7/good/warning/serious/critical`), while the underlying raw `--viz-N` custom properties on `:root`/`.dark` all resolved correctly for every token. No discernible pattern distinguished the failing keys from the passing ones (`--color-viz-1/3/4/8/grid/axis` worked) — reproducible but not diagnosable further within this session. Fix: dropped the `--color-viz-*` re-export from `@theme inline` entirely (it was never used to generate a Tailwind utility class like `fill-viz-1`, only ever consumed via raw `var()` in chart components) and switched every chart/InsightsPanel consumer from `var(--color-viz-N)` to `var(--viz-N)` directly. `index.css` documents the finding inline so it isn't rediscovered from scratch.

**Chart changes (product feedback):**

- Removed the Cash Flow chart entirely (repository `getCashFlow`, `AnalyticsCashFlowPoint`, the query, the component) — not wanted.
- "Financial Performance Overview" (Spend Trend) now shows **Spend only** — Income and Cash Flow series/legend removed; `AnalyticsTrendPoint`/`getSpendTrend` simplified to match (no more computing income/cashFlow per bucket, since nothing reads them anymore).
- **Category Split donut caps at the top 7 categories + a synthetic "Other" slice** (13 real categories exist in the mock catalog, which meant several slices were forced to reuse a hue from the 8-color palette even after the black-fill bug was fixed). This follows the dataviz skill's own rule directly — "a 9th+ series folds into Other, never a cycled/reused hue" — so every visible wedge is now a genuinely distinct color. "Other" renders in a neutral muted tone (not a series hue) and isn't independently clickable/cross-filterable, since it doesn't correspond to one category.
- **Removed the Statement Processing Status feature entirely** — both the "3 statements failed processing" Insights card and the Secondary Analytics tab. This removed `getStatementProcessingStatus` (repository/interface/service/queryKey/hook/tab), the `AnalyticsRankedRow.drillTarget` field and the `onDrillDown` `target`/`statementStatus` parameters (no longer needed with only one drill destination), and the `statementMonth` filter (it had no other consumer). `src/pages/Statements.tsx`'s `status` drill-down entry, added for this feature, was reverted back to its exact Module 8/9 state.
- **Removed the "Coming Soon" future-capabilities strip** (`FutureCapabilitiesStrip.tsx` deleted) — not wanted.
- **Added a Business vs Personal Spend chart** in the vacated Cash Flow slot: a grouped bar chart (`BizPersonalSpendChart`), one bar pair per month, driven by a new `getOwnerTypeSpend` repository method (splits debit spend by `ownerType` per month bucket, same bucketing helpers as every other chart). Clicking either bar cross-filters `ownerType` + that month's date range, same interaction contract as everything else. Scoped down from an initial "line chart + bar chart" request to bar-only per explicit confirmation, since a single grouped-bar comparison covers the "which is bigger, by month" question the two charts together were meant to answer.

**Playwright finding: Recharts SVG `<Bar>` elements are unreliable click targets for Playwright's actionability-gated `.click()`.** While testing the new Business vs Personal chart, `.click()` on a bar's `<path>` intermittently timed out with "element was detached from the DOM, retrying" or, on other runs, dispatched without error but never reached the component's `onClick` handler — despite `document.elementFromPoint` at the exact click coordinates correctly resolving to that same `<path>`. Isolated via a throwaway diagnostic script: dispatching a native `MouseEvent('click', { bubbles: true })` directly on the element via `page.evaluate` fired the handler reliably every time, proving the click wiring and business logic were both correct and the flakiness was specific to Playwright's CDP-driven pointer simulation against this SVG shape. Fixed the test (not the component) using Playwright's `locator.dispatchEvent('click')` API — the documented workaround for exactly this class of issue — instead of `.click()`. Every other chart's row/button/legend interactions in this suite use real DOM `<button>` elements and were unaffected.

**Verification:** re-ran the full quality gate after all fixes — `tsc -b --noEmit` clean, `eslint` 0 errors (same 7 pre-existing benign warnings), `npm run build` clean, `vitest run` 28/28 (added 2 `getOwnerTypeSpend` tests, removed the `getStatementProcessingStatus` test, updated `getSpendTrend` assertions for the trimmed shape), `playwright --project=chromium tests/e2e/analytics.spec.ts` 8/8 in isolation, full suite 96+/102 with the same sandbox parallel-load flakiness pattern as the initial pass (confirmed non-regression via a reduced-worker re-run).

## Commits

- `feat(module-10): implement analytics module` (initial)
- `fix(module-10): ui refinement pass — color bug, chart changes, Statement Processing removal` (this follow-up, report included in the same commit)

Stopping here per instruction. Not beginning Module 11 (Settings); awaiting explicit approval before any further module.
