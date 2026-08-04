# MODULE6_REPORT.md

Module 6 — Merchants ("Merchant Center")

Generated 2026-08-04.

---

## Spec compliance summary

The only Stitch export available for this screen is `Stitch Designs/FInal Stitch Designs/.../merchant centre/` (a sibling directory one level above the Frontend copy of the design archive, added after that copy was made — it isn't in `Frontend/FInal Stitch Designs`). It was used as the visual source of truth for dark theme, card treatment, table density, and row-hover behavior — ported through the app's already-established design tokens and components (per CLAUDE.md: "do NOT copy HTML directly"), not by copying its raw HTML/hardcoded hex values.

Several deliberate departures from that Stitch screen, all cases where this task's written field-by-field spec named different data than the screen shows:

1. **Product identity.** The Stitch export's `<title>` and header both read "FinOps Core" / "FY 2024-25" — both explicitly banned by `PRODUCT_DECISIONS.md` ("Official Product Name: Finance Command Center... Never use... FinOps Core", and the FY-subtitle was already removed from the shell during Module 1 per `docs/STITCH_MAPPING.md`). Not reproduced.
2. **AI/rule-engine framing is out of scope.** The Stitch screen's KPIs (Known Merchants, Auto Learned, Manual Overrides), its per-row "Learning Source" badges (RULE BASED / AI LEARNED / MANUAL), the "Needs Review" toggle, and "AI Categorization Engine: Online" status line all describe AI-categorization machinery. CLAUDE.md's Merchant Center contract explicitly lists "AI Categorisation Logic" as Out of Scope. None of it was built.
3. **Summary cards, table columns, row actions, and form fields** were all built exactly as this task specified (Total/Active/Uncategorized Merchants, Total Spend, Transactions This Month; Merchant Name/Default Category/Transaction Count/Total Spend/Average Transaction/Last Transaction/Status/Actions; View Transactions/Edit Merchant/Change Category/Delete/Merge-placeholder; Name/Default Category/Status/Notes/Aliases-placeholder/Rules-placeholder) rather than the Stitch screen's own set (which additionally has Aliases/Client/Learning Source columns and a Category/Client/Date-range filter bar with no Status or Has Rules filters).

Everything else (page header layout, KPI card style, filter-bar/table-container chrome, row hover states, pagination, dark theme) follows the same design tokens every other module already uses — same `apex_ledger` token set the Merchant Center `DESIGN.md` itself specifies, already ported into `src/styles/index.css` since Module 1.

Supabase was **not** touched. All data flows through a typed mock repository (`MockMerchantRepository`) behind the same `MerchantRepository` interface a future Supabase implementation will satisfy.

## Components created

**Page-level**

- `src/pages/Merchants.tsx` — composition only: owns page/pageSize/sort/filter/dialog state, wires hooks to reusable components. No business logic or data shaping inline.

**Merchants-specific (`src/components/merchants/`)**

| Component                | Responsibility                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `MerchantsHeader`        | Title, subtitle, Export, Add Merchant                                                                                      |
| `MerchantSummaryWidget`  | The 5 spec'd KPI cards, built on the existing `KPICard` — mixed formatting (4 plain counts + 1 currency) per card          |
| `MerchantFilters`        | Category / Status / Has Rules / Transaction Count (min–max) + Apply/Clear, built on the generic `FilterChip`               |
| `MerchantStatusBadge`    | Active/Inactive badge                                                                                                      |
| `MerchantTable`          | TanStack Table instance: sticky header, sortable columns, inline-editable Default Category cell, horizontal-scroll wrapper |
| `MerchantTableSkeleton`  | Table-shaped loading skeleton                                                                                              |
| `MerchantRowActionsMenu` | Primary "View Transactions" icon button + secondary Edit/Change Category/Merge-placeholder/Delete dropdown                 |
| `MerchantFormDialog`     | Reusable Add/Edit dialog (Name, Default Category, Status, Notes, Aliases-placeholder, Merchant-Rules-placeholder)          |

No new "categoryVisuals"-style helper was needed here — merchants use a single fixed icon/color (`Store`/`primary`), unlike Categories' per-row icon/color variety, so nothing to factor out.

## Components/architecture reused (not duplicated)

- `ActiveFilterBanner` — reused as-is, zero changes. See "Drill-down" below for how it's now shared by two modules through one mechanism instead of two.
- `KPICard`, `QueryBoundary` (including its built-in Retry-on-error), `EmptyState`, `Pagination`, `ConfirmDialog`, `FilterChip`, `Input`/`Button`/`Select`/`Textarea`/`Label`/`Dialog`/`DropdownMenu`/`Badge`/`Skeleton` — all reused unmodified, same as Categories.
- **`CategorySelector`/`InlineSelector`** (from `components/transactions/`) — reused verbatim as the table's Default Category cell, the same inline-editable pattern Transactions already uses for its own Category column. This is also how "Change Category" is really satisfied day-to-day: the table cell IS the quick-change control. The row-menu's "Change Category" item is a convenience alias that opens the full `MerchantFormDialog` (same as "Edit Merchant") rather than a second bespoke quick-edit UI — see Architecture Decision 3.
- `useTransactionCategories()` — reused for the Category filter and the form's Default Category dropdown, same "shared master data" reasoning Categories used for its own Parent Category dropdown.
- `formatINR` (from `utils/currency.ts`) — reused for Total Spend/Average Transaction table cells and the Total Spend KPI.
- `downloadCsv` + the `rowsToCsv` helper (extracted during Module 5) — reused as-is; `merchantsToCsv` was added alongside `transactionsToCsv`/`categoriesToCsv` through the same shared helper, not a new CSV implementation.

## Domain models reused / extended

- **`Merchant`** (`{id, name}`) — left completely untouched, exactly as `Category` was in Module 5. Still embedded in `Transaction.merchant` and returned by `TransactionRepository.listMerchants()`.
- **`MerchantRecord`** (new, same file) — the full master-data row this module reads/writes, mirroring `CategoryRecord`'s relationship to `Category` field-for-field (embeds the lightweight `Category` for its default-category link, same reasoning documented in `domain/Category.ts` applied symmetrically here).
- `MerchantStatus`, `MerchantFilters`, `MerchantSort`, `MerchantListParams`, `MerchantListResult`, `MerchantSummary`, `MerchantCreateInput`, `MerchantUpdateInput` — new, following the exact interface set `Category.ts`/`Statement.ts` already establish per module.

## Files changed

**New:**

```
src/repositories/merchant.repository.ts
src/repositories/mock-merchant.repository.ts
src/repositories/mock-data/generate-merchants.ts
src/services/merchants.service.ts
src/hooks/useMerchants.ts
src/components/merchants/*.tsx  (7 files, listed above)
tests/e2e/merchants.spec.ts
```

**Modified:**

```
src/domain/Merchant.ts         — additive only; original `Merchant` interface unchanged
src/pages/Merchants.tsx        — replaced Module 1's placeholder stub with the full page
src/pages/Transactions.tsx     — drill-down generalized from category-only to a small
                                  {categoryId, merchantId} map (see Architecture Decision 1)
src/lib/queryKeys.ts           — added `merchants` query-key namespace
src/utils/csv.ts               — added merchantsToCsv(), reusing the existing rowsToCsv() helper
src/components/dashboard/KPICard.tsx — bug fix, see "Bug found" below
tests/unit/csv.test.ts         — added merchantsToCsv coverage (existing transactionsToCsv/
                                  categoriesToCsv assertions unchanged and still passing)
```

## Bug found and fixed during verification

**`KPICard`'s value text overflows its card when the formatted number is long.** Screenshotting the Merchant summary row (5 KPI cards, `lg:grid-cols-5`, narrower per-card than the 4-column grids Categories/Statements use) showed "Total Spend" — `₹2,38,34,938` — visibly bleeding past its card's right edge into the next card. Confirmed programmatically: that card's `scrollWidth` (228px) exceeded its `clientWidth` (216px); all four other cards measured equal. Root cause: the value `<div>` had no wrapping behavior, and `₹2,38,34,938` is a single unbroken string the browser can't line-break at spaces. No prior module's KPI values were both currency-formatted _and_ in a 5-column grid at once (Statements' 5-column row is all short plain counts; Dashboard's currency values sit in a roomier grid) — so this is a real, previously-latent bug in a shared component, not something Merchants introduced on its own.

Fixed with a one-class addition (`break-all` on the value `<div>` in `src/components/dashboard/KPICard.tsx`) so long values wrap onto a second line instead of overflowing; CSS Grid's default row-stretch alignment means the other four cards in that row grow to match height automatically, so the row stays visually even. Re-verified: `scrollWidth === clientWidth` on all 5 cards afterward, and re-screenshotted Dashboard/Statements/Categories to confirm no visual regression on their (short) KPI values.

## Architecture decisions

1. **Drill-down generalized to a small param map, not duplicated.** The spec explicitly said "Do NOT create another drill-down implementation," and Transactions already had one Category-only implementation from Module 5. Rather than copy-pasting it for `merchantId`, `Transactions.tsx` now reads a `DRILL_DOWN_PARAMS` map (`{ categoryId: {...}, merchantId: {...} }`), resolves whichever one is present in the URL on mount, and renders one `ActiveFilterBanner`. Adding a third drill-down target later (Client/Account/Credit Card/Statement, as the Categories spec anticipated) means adding one entry to that map, not a third implementation.
2. **Repository pattern, identical shape to every prior module.** `MerchantRepository` → `MockMerchantRepository` → `merchants.service.ts`. A future `SupabaseMerchantRepository` only requires changing that one file.
3. **"Change Category" reuses the inline cell instead of building a second control.** The Default Category table column is a live `CategorySelector` (the same inline-editable dropdown Transactions already uses), so "changing a merchant's category" already has a fast, direct, already-approved UI. The row-action-menu's "Change Category" item opens the same `MerchantFormDialog` as "Edit Merchant" rather than a bespoke popover — building a second quick-edit control for a capability the inline cell already covers would be exactly the kind of redundant abstraction CLAUDE.md's Feature Development Rules warn against ("Do not introduce new abstractions unless reused by multiple modules").
4. **Deterministic mock data, derived from the existing transaction/category datasets.** `generate-merchants.ts` reuses the 19 existing merchant ids from `reference-data.ts` (no new ids invented) and hand-authors default-category/status/aliases/notes/hasRules metadata per merchant, then computes `transactionCount`, `totalSpend`, `averageTransaction`, and `lastTransactionAt` by scanning `mockTransactions` — the same dataset Transactions/Statements/Categories already read. Two merchants (Razorpay, Zerodha) are deliberately left uncategorized to exercise the "Uncategorized Merchants" KPI/filter with real data, mirroring Categories' precedent of leaving two categories inactive for the same reason.
5. **Aliases and Merchant Rules are real data fields with placeholder editing UI**, not fully-fake stubs — `MerchantRecord.aliases: readonly string[]` and `hasRules: boolean` are populated in mock data and power real search (search matches name **and** aliases) and a real "Has Rules" filter; only the _editing_ controls in the form are disabled placeholders ("Alias manager coming soon" / "Rule builder coming soon"), the same distinction Categories drew for its Icon field.
6. **Form state resets via conditional mount, not an effect** — identical fix to `CategoryFormDialog`'s (Module 5): `MerchantFormBody` is only mounted while the dialog is `open`, with every `useState` seeded directly from the `merchant` prop, avoiding the `react-hooks/set-state-in-effect` issue that pattern was built to fix in the first place.

## Testing results

| Check                                                           | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                           | ✔ Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `npx eslint .`                                                  | ✔ 0 errors (6 pre-existing benign warnings: `useReactTable` React Compiler notices on `MerchantTable`/`CategoryTable`/`StatementTable`/`TransactionTable`, `react-refresh/only-export-components` on `badge.tsx`/`button.tsx`)                                                                                                                                                                                                                                      |
| `npm run build`                                                 | ✔ Pass — `Merchants` chunk builds as its own lazy-loaded bundle (23.3kB / 6.9kB gzip)                                                                                                                                                                                                                                                                                                                                                                               |
| `npx vitest run`                                                | ✔ 14/14 (4 new `merchantsToCsv` cases: header+row format, Uncategorized fallback, blank last-transaction cell, comma-quoting; existing `transactionsToCsv`/`categoriesToCsv` cases unchanged and still passing)                                                                                                                                                                                                                                                     |
| `npx playwright test --project=chromium`                        | ✔ 36/36 (26 pre-existing + **10 new** Merchants specs: list loads, all 5 KPIs visible, search filters rows, row menu shows Edit/Change Category/Merge-placeholder/Delete, primary action drills into Transactions with the filter+banner applied, Default Category cell is inline-editable, Add Merchant dialog exposes every spec'd field including the two disabled placeholders, required-name validation, Edit prefills from the row, sorting toggles asc/desc) |
| Responsive — desktop (1440px) / tablet (834px) / mobile (390px) | ✔ Screenshotted at all three; `document.body.scrollWidth === clientWidth` at every breakpoint — no page-level horizontal overflow (after the KPICard fix above)                                                                                                                                                                                                                                                                                                     |
| Drill-down end-to-end                                           | ✔ Verified manually + in Playwright: clicking "View Transactions" on Adobe Creative Cloud navigates to `/transactions?merchantId=merchant-adobe`, shows "Filtered by merchant: Adobe Creative Cloud", and the ledger correctly shows only that merchant's 14 transactions                                                                                                                                                                                           |
| Keyboard / accessibility                                        | ✔ Inherited from Base UI's accessible primitives — same pattern as Modules 3–5                                                                                                                                                                                                                                                                                                                                                                                      |
| Dark mode                                                       | ✔ Only mode exercised (consistent with Modules 1–5)                                                                                                                                                                                                                                                                                                                                                                                                                 |

Two test-authoring bugs (not app bugs) were caught while writing `merchants.spec.ts`, both the same class Modules 3–5 already flagged: `getByText('Total Spend')` matched both the KPI label and the sortable table-column header with identical text (scoped with `{ exact: true }.first()`), and a second click on `getByRole('button', { name: 'Add Merchant' })` timed out because Base UI marks the rest of the page inert while a dialog is open — the header button becomes inaccessible, leaving only the dialog's own submit button, so the extra `.nth(1)` was actually wrong, not needed.

## Future Supabase integration points

1. Implement `SupabaseMerchantRepository implements MerchantRepository` (`src/repositories/`) — `list`/`getSummary`/`create`/`update`/`delete`, backed by the existing `merchant_memory` table (per CLAUDE.md Part 3) and a new `vw_merchants`-style view joining transaction/spend aggregates server-side (per CLAUDE.md's "never calculate... Merchant Statistics inside React" rule — the mock repo's in-memory aggregation is today's stand-in for that view).
2. Change one line in `src/services/merchants.service.ts` to construct the Supabase implementation instead of `MockMerchantRepository`.
3. Alias management ("Alias manager coming soon") and rule building ("Rule builder coming soon") are explicit future placeholders per this task's spec — `MerchantRecord.aliases`/`hasRules` already model the read side; only write UIs remain, and per CLAUDE.md's Merchant Center contract, any actual categorization-rule _logic_ stays out of this module's scope regardless (n8n/AI Categorisation territory).
4. Merge Merchants is disabled in the row menu ("Soon") — per the spec's "Future placeholder" note. When scoped, it should follow the audit-preserving behavior CLAUDE.md's original Merchant Center business rules describe ("Merge should preserve audit history").
5. The generalized `DRILL_DOWN_PARAMS` map in `Transactions.tsx` is ready for Client/Account/Credit Card/Statement drill-downs the moment those modules are built — no Transactions-side changes needed beyond adding one map entry per new param.

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
10. `feat(module-5): implement categories module`
11. `feat(module-6): implement merchants module` — this module

Stopping here per instruction. Awaiting explicit approval before beginning Module 7.
