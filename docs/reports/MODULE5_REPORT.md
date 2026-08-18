# MODULE5_REPORT.md

Module 5 — Categories ("Category Management")

Generated 2026-08-04.

---

## Spec compliance summary

Built against the approved `category_configuration_v1` Stitch export as the visual source of truth (dark theme, card style, table density, spacing) — ported through the app's existing design tokens/components rather than copying Stitch's raw HTML/hardcoded hex values, per CLAUDE.md's "Stitch screens are visual references... do NOT copy HTML directly."

Three deliberate departures from Stitch, all cases where this task's written field-by-field spec (Summary Cards / Category Table / Row Actions / Category Form sections) explicitly named different data than the Stitch screen shows — per PRODUCT_DECISIONS.md's decision authority ("Whenever there is a conflict... this document takes precedence") and the same precedent Module 3 set for its own Stitch departures:

1. **Summary cards** — built exactly as specified (Total / Active / Inactive Categories, Uncategorized Transactions) instead of Stitch's (Total Categories / Active Merchants / Pending Review / System Health), since the spec's cards describe category-management state, not merchant/system health, which belong to other modules.
2. **Table columns** — built exactly as specified (adds Parent Category and Transaction Count, renames Stitch's "Merchants"→"Merchants Assigned" and "Created Date"→"Last Updated") instead of Stitch's narrower 6-column table.
3. **Row actions and form fields** — added the spec's "View Transactions" (primary) and "View Merchants" (secondary) actions and the spec's Parent Category / Color / Icon form fields, none of which Stitch's export includes (Stitch only has Edit/Delete and a Name/Description/Status/Internal Code form).

Everything else (page header layout, KPI card style, filter-bar/table-container chrome, row hover states, pagination) follows the Stitch export directly.

Supabase was **not** touched. All data flows through a typed mock repository (`MockCategoryRepository`) behind the same `CategoryRepository` interface a future Supabase implementation will satisfy.

## Components created

**Page-level**

- `src/pages/Categories.tsx` — composition only: owns page/pageSize/sort/filter/dialog state, wires hooks to reusable components. No business logic or data shaping inline.

**Categories-specific (`src/components/categories/`)**

| Component                | Responsibility                                                                                                                                |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CategoriesHeader`       | Title, subtitle, Export, Add Category                                                                                                         |
| `CategorySummaryWidget`  | The 4 spec'd KPI cards, built on the existing `KPICard`                                                                                       |
| `CategoryFilters`        | Status / Parent Category / Transaction Count (min–max) + Apply/Clear, built on the generic `FilterChip`                                       |
| `CategoryStatusBadge`    | Active/Inactive badge                                                                                                                         |
| `CategoryTable`          | TanStack Table instance: sticky header, sortable columns (Name/Transaction Count/Merchants Assigned/Last Updated), horizontal-scroll wrapper  |
| `CategoryTableSkeleton`  | Table-shaped loading skeleton                                                                                                                 |
| `CategoryRowActionsMenu` | Primary "View Transactions" icon button + secondary Edit/View Merchants/Delete dropdown                                                       |
| `CategoryFormDialog`     | Reusable Add/Edit dialog (Name, Parent Category, Description, Status, Color, Icon-placeholder)                                                |
| `categoryVisuals.ts`     | Non-component helper: icon-string→Lucide-component resolver and color-token class/label maps, shared by the table and the form's color picker |

**Generic/reusable (`src/components/`, not Categories-specific)**

- `ActiveFilterBanner` — dismissible "Filtered by X" banner. Built generically (label + clear callback) per the spec's explicit instruction to "support future drill-down consistency with Merchant, Client, Account, Credit Card, Statement" — not a Categories-only component, even though Categories is its first consumer.

## Components/architecture reused (not duplicated)

- `PageContainer`, `QueryBoundary` (loading/error/empty — including its built-in Retry on error, satisfying the "reusable error state" requirement), `EmptyState`, `Pagination`, `ConfirmDialog`, `Input`/`Button`/`Select`/`Textarea`/`Label`/`Dialog`/`DropdownMenu`/`Badge`/`Skeleton` (shadcn primitives).
- `FilterChip` (from `components/transactions/`) — same cross-module reuse Statements already established; Categories is now a third consumer.
- `downloadCsv` (from `utils/csv.ts`) — reused as-is; `categoriesToCsv` was added alongside it, factored through a new shared `rowsToCsv` helper that `transactionsToCsv` was refactored to use too (verified byte-identical output via the existing `csv.test.ts` suite, which still passes unmodified).
- `useTransactionCategories()` (from `hooks/useTransactions.ts`) — reused for the Parent Category filter/form dropdown options, rather than adding a second lightweight-category query. Same "shared master data, not owned by either module" reasoning Statements used for accounts/clients.

## Domain models reused / extended

- **`Category`** (`{id, name}`) — left completely untouched. Still embedded in `Transaction.category` and returned by `TransactionRepository.listCategories()`; nothing about this module changed its shape or its consumers.
- **`CategoryRecord`** (new, same file) — the full master-data row this module reads/writes, embedding the lightweight `Category` for its parent link exactly the way `Statement` already embeds `TransactionAccount`. Adding a new type in an existing domain file (rather than widening `Category` itself) avoids forcing every `Transaction.category` snapshot to carry Categories-only aggregate fields (transaction/merchant counts) that don't belong on a per-transaction reference — see the code comment in `domain/Category.ts` for the full reasoning.
- `CategoryStatus`, `CategoryColor`/`CATEGORY_COLORS`, `CategoryFilters`, `CategorySort`, `CategoryListParams`, `CategoryListResult`, `CategorySummary`, `CategoryCreateInput`, `CategoryUpdateInput` — all new, following the exact interface set Statement.ts/Transaction.ts already establish per module.

## Files changed

**New:**

```
src/domain/Category.ts                              (extended, see below)
src/repositories/category.repository.ts
src/repositories/mock-category.repository.ts
src/repositories/mock-data/generate-categories.ts
src/services/categories.service.ts
src/hooks/useCategories.ts
src/components/categories/*.tsx  (8 files, listed above)
src/components/categories/categoryVisuals.ts
src/components/ActiveFilterBanner.tsx
tests/e2e/categories.spec.ts
```

**Modified:**

```
src/domain/Category.ts         — additive only; original `Category` interface unchanged
src/pages/Categories.tsx       — replaced Module 1's placeholder stub with the full page
src/pages/Transactions.tsx     — drill-down support: reads ?categoryId= on mount, seeds the
                                  existing categoryId filter, shows/clears ActiveFilterBanner
src/lib/queryKeys.ts           — added `categories` query-key namespace
src/utils/csv.ts               — extracted shared rowsToCsv() helper; added categoriesToCsv()
tests/unit/csv.test.ts         — added categoriesToCsv coverage (transactionsToCsv assertions
                                  unchanged and still passing, confirming the refactor is
                                  output-identical)
```

## Architecture decisions

1. **Repository pattern, identical shape to Statements/Transactions.** `CategoryRepository` (interface) → `MockCategoryRepository` (implementation) → `categories.service.ts` (`export const categoryRepository: CategoryRepository = new MockCategoryRepository()`). A future `SupabaseCategoryRepository` only requires changing that one file.
2. **Deterministic mock data, derived from the existing transaction dataset.** `generate-categories.ts` reuses the 13 existing category ids from `reference-data.ts` (no new ids invented) and hand-authors description/status/color/icon/parent metadata per category, then computes `transactionCount` and `merchantsAssigned` (distinct merchant count) by scanning `mockTransactions` — the same dataset Transactions/Statements already read, so the numbers are real and internally consistent rather than independently fabricated.
3. **A light two-level parent hierarchy** (e.g. Cloud Infrastructure under Software/SaaS; Taxes & Govt and Payroll under Statutory) was authored across the existing 13 categories specifically to exercise the Parent Category column/filter/form field with realistic data, without inventing new category names that `generate-transactions.ts` would then also start assigning to transactions.
4. **Drill-down via URL search param, not component/router state.** Categories' "View Transactions" navigates to `/transactions?categoryId=<id>`; Transactions reads it once on mount (`useState(() => searchParams.get('categoryId'))`), seeds both `draftFilters` and `appliedFilters`, and shows `ActiveFilterBanner` until cleared. This reuses `TransactionFilters.categoryId`, which already existed — no new filter plumbing in Transactions. "View Merchants" links to `/merchants?categoryId=<id>` the same way; Merchants itself is still an unbuilt placeholder page (Module 6), so the param isn't consumed yet, but the navigation target and shape are already consistent with what Categories/Clients/Accounts/Credit Cards/Statements drill-downs will need later.
5. **Primary vs. secondary row actions, per the spec's explicit split.** "View Transactions" is a single always-visible icon button (one click, no menu); Edit/View Merchants/Delete sit behind a "..." dropdown — mirrors CLAUDE.md's Primary/Secondary/Ghost/Danger/Icon button taxonomy rather than putting all four actions in one menu the way Statements' single-menu pattern does.
6. **Form state resets via conditional mount, not an effect.** `CategoryFormDialog` renders its stateful field body (`CategoryFormBody`) only while `open` is true, with every `useState` seeded directly from the `category` prop at mount time. This was a deliberate fix for a real ESLint error (`react-hooks/set-state-in-effect`) hit while building the Add/Edit dialog — the natural first draft synced form fields from props via a `useEffect` that called multiple `setState`s synchronously, which the lint rule correctly flags as cascading-render-prone. Unmount/remount-on-open is one of the two patterns React's own docs recommend for "reset state when a prop changes" (the other being a `key` prop) and needed no such key here since the dialog is already conditionally rendered by `open`.

## Testing results

| Check                                                           | Result                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                           | ✔ Pass                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `npx eslint .`                                                  | ✔ 0 errors (5 pre-existing benign warnings: `useReactTable` React Compiler notices on `CategoryTable`/`StatementTable`/`TransactionTable`, `react-refresh/only-export-components` on `badge.tsx`/`button.tsx`). One real error (`react-hooks/set-state-in-effect` in the form dialog's first draft) was found and fixed — see architecture decision 6.                                                                       |
| `npx prettier --check .`                                        | ✔ Clean (after `--write`; 7 new files needed only cosmetic reformatting)                                                                                                                                                                                                                                                                                                                                                     |
| `npm run build`                                                 | ✔ Pass — `Categories` chunk builds as its own lazy-loaded bundle (25.1kB / 8.0kB gzip)                                                                                                                                                                                                                                                                                                                                       |
| `npx vitest run`                                                | ✔ 10/10 (3 new `categoriesToCsv` cases added: header+row format, blank parent-category cell, comma-quoting; existing `transactionsToCsv` cases unchanged and still passing after the shared-helper refactor)                                                                                                                                                                                                                 |
| `npx playwright test --project=chromium`                        | ✔ 26/26 (17 pre-existing + **9 new** Categories specs: list loads with real rows, summary shows all 4 KPIs, search filters rows, row menu shows Edit/View Merchants/Delete, primary action drills into Transactions with the filter+banner applied, Add Category dialog exposes every spec'd field including the disabled Icon placeholder, required-field validation, Edit prefills from the row, sorting toggles asc/desc) |
| Responsive — desktop (1440px) / tablet (834px) / mobile (390px) | ✔ Screenshotted at all three; `document.body.scrollWidth === clientWidth` at every breakpoint — no page-level horizontal overflow                                                                                                                                                                                                                                                                                            |
| Drill-down end-to-end                                           | ✔ Verified manually + in Playwright: clicking "View Transactions" on Cloud Infrastructure navigates to `/transactions?categoryId=cat-cloud`, shows "Filtered by category: Cloud Infrastructure", and the ledger correctly shows only that category's 21 transactions                                                                                                                                                         |
| Keyboard / accessibility                                        | ✔ Inherited from Base UI's accessible primitives (native `<table>` semantics, real `<button>`s, `aria-label`s on icon-only buttons, `role="alert"` field errors, `aria-invalid`/`aria-required` on form fields) — same pattern as Modules 3–4, no custom keyboard handling needed                                                                                                                                            |
| Dark mode                                                       | ✔ Only mode exercised (consistent with Modules 1–4)                                                                                                                                                                                                                                                                                                                                                                          |

One test-authoring bug (not an app bug) was caught while writing `categories.spec.ts`: `getByText('Active Categories')` matched both that KPI label and "**Inactive** Categories" via substring match — fixed with `{ exact: true }`, the same class of issue flagged in Modules 3–4's reports.

A transient Playwright infra flake was observed at the default 8-worker concurrency (`Protocol error: Internal server error, session closed` on 2 of 26 tests) that did not reproduce at `--workers=4`, run twice back-to-back (26/26 both times). Treated as local resource contention, not a product defect — every test passed reliably once retried at reduced parallelism.

## Future Supabase integration points

1. Implement `SupabaseCategoryRepository implements CategoryRepository` (`src/repositories/`) — `list`/`getSummary`/`create`/`update`/`delete`, backed by the existing `categories` table (per CLAUDE.md Part 3) and a new `vw_categories`-style view joining transaction/merchant counts server-side (per CLAUDE.md's "never calculate... Category Statistics inside React" rule — the mock repo's in-memory count is today's stand-in for that view).
2. Change one line in `src/services/categories.service.ts` to construct the Supabase implementation instead of `MockCategoryRepository`.
3. `CategoryRecord`/`CategoryFilters`/`CategoryListParams` were written to mirror that future view + the `categories` table, so no hook or component types should need to change.
4. The Icon field is explicitly a placeholder today (disabled input, "Icon picker coming soon") — `CategoryRecord.icon` already round-trips as a plain string key (not a component reference) so a real icon-picker UI can be added later purely as a new form control, with `categoryVisuals.ts`'s `resolveCategoryIcon()` needing only new map entries, not a shape change.
5. Merchants' consumption of `?categoryId=` (the "View Merchants" drill-down target) is unimplemented pending Module 6 — when Merchants is built, it should read the param the same way Transactions does here (`useState(() => searchParams.get('categoryId'))` + `ActiveFilterBanner`), not a new mechanism.

## Commits

1. `feat: implement Module 1 Application Shell`
2. `docs: analyze updated Dashboard and Analytics Stitch designs`
3. `feat: implement Module 2 Dashboard`
4. `feat: implement transactions module`
5. `docs: add MODULE3_REPORT.md`
6. `docs: add module-completion git protocol to CLAUDE.md`
7. `chore: establish shared domain architecture and project roadmap`
8. `feat(module-4): implement statements module`
9. `docs: update project governance and development roadmap`
10. `feat(module-5): implement categories module` — this module

Stopping here per instruction. Awaiting explicit approval before beginning Module 6.
