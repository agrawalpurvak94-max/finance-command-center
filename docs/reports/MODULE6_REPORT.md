# MODULE6_REPORT.md

Module 6 — Merchants ("Merchant Center")

Generated 2026-08-04. Updated 2026-08-04 with the Merchant Review Drawer (follow-up commit — see "Merchant Review Drawer" section below and the second entry in "Commits"). Updated again 2026-08-04 with a final UX polish pass on the drawer (see "UX verification / polish pass" below and the third entry in "Commits").

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
| `MerchantRowActionsMenu` | Primary "View Transactions" icon button + secondary Review/Edit/Change Category/Merge-placeholder/Delete dropdown          |
| `MerchantFormDialog`     | Reusable Add/Edit dialog (Name, Default Category, Status, Notes, Aliases-placeholder, Merchant-Rules-placeholder)          |
| `MerchantReviewDrawer`   | The 4-section review drawer (see "Merchant Review Drawer" below) — composes `EntityReviewDrawer`                           |

**Generic/reusable, added for the drawer (`src/components/`, not Merchant-specific)**

| Component                  | Responsibility                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| `EntityReviewDrawer`       | The shell every future master-data drawer reuses: Sheet + header + scrollable content area         |
| `EntityReviewDrawerFooter` | Standardized Cancel / Save Changes footer with loading state, rendered by the entity-specific body |
| `Toast`                    | Minimal self-dismissing success toast (no toast library existed in this project)                   |

No new "categoryVisuals"-style helper was needed for the table/dialog work here — merchants use a single fixed icon/color (`Store`/`primary`), unlike Categories' per-row icon/color variety, so nothing to factor out.

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

**New (initial module):**

```
src/repositories/merchant.repository.ts
src/repositories/mock-merchant.repository.ts
src/repositories/mock-data/generate-merchants.ts
src/services/merchants.service.ts
src/hooks/useMerchants.ts
src/components/merchants/*.tsx  (7 files, listed above)
tests/e2e/merchants.spec.ts
```

**Modified (initial module):**

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

**New (Merchant Review Drawer follow-up):**

```
src/components/EntityReviewDrawer.tsx        — generic drawer shell + EntityReviewDrawerFooter
src/components/Toast.tsx                     — minimal success toast
src/components/merchants/MerchantReviewDrawer.tsx
```

**Modified (Merchant Review Drawer follow-up):**

```
src/components/merchants/MerchantTable.tsx        — row/name click open the drawer; interactive-
                                                     cell clicks no longer also trigger it
src/components/merchants/MerchantRowActionsMenu.tsx — added "Review Merchant" menu item
src/pages/Merchants.tsx                           — drawer + toast state, focus-restoration logic
tests/e2e/merchants.spec.ts                       — 11 new drawer specs
```

**Modified (UX polish pass follow-up):**

```
src/pages/Merchants.tsx                    — useCallback-memoized row-action handlers;
                                              scroll-position capture/restore around drawer
                                              open/close; selectedMerchantId passed to MerchantTable
src/components/merchants/MerchantTable.tsx — selectedMerchantId prop + row highlight while
                                              the reviewed merchant's drawer is open
tests/e2e/merchants.spec.ts                 — 2 new specs (row highlight, scroll preservation)
```

## Bug found and fixed during verification

**`KPICard`'s value text overflows its card when the formatted number is long.** Screenshotting the Merchant summary row (5 KPI cards, `lg:grid-cols-5`, narrower per-card than the 4-column grids Categories/Statements use) showed "Total Spend" — `₹2,38,34,938` — visibly bleeding past its card's right edge into the next card. Confirmed programmatically: that card's `scrollWidth` (228px) exceeded its `clientWidth` (216px); all four other cards measured equal. Root cause: the value `<div>` had no wrapping behavior, and `₹2,38,34,938` is a single unbroken string the browser can't line-break at spaces. No prior module's KPI values were both currency-formatted _and_ in a 5-column grid at once (Statements' 5-column row is all short plain counts; Dashboard's currency values sit in a roomier grid) — so this is a real, previously-latent bug in a shared component, not something Merchants introduced on its own.

Fixed with a one-class addition (`break-all` on the value `<div>` in `src/components/dashboard/KPICard.tsx`) so long values wrap onto a second line instead of overflowing; CSS Grid's default row-stretch alignment means the other four cards in that row grow to match height automatically, so the row stays visually even. Re-verified: `scrollWidth === clientWidth` on all 5 cards afterward, and re-screenshotted Dashboard/Statements/Categories to confirm no visual regression on their (short) KPI values.

## Merchant Review Drawer

Added in a follow-up commit, after the base module above was already committed and pushed — per instruction, nothing in the base module was rewritten; this is purely additive.

### Objective and interaction model

The Stitch "Intelligence Detail" panel established that the primary interaction for reviewing a merchant is a right-side slide-over, not a page navigation. Three equivalent entry points open it, all wired to the same `handleReviewMerchant`:

- Clicking anywhere on a merchant's table row (except an interactive cell).
- Clicking the merchant's name specifically.
- The "Review Merchant" item in the row's "..." menu (new — added above "Edit Merchant").

Clicking the inline Default Category selector, a sort header, or another row action does **not** also open the drawer — the row's `onClick` checks whether the click originated inside `button, [role="combobox"], [role="menuitem"]` via `event.target.closest(...)` and no-ops if so, rather than every interactive cell stopping propagation individually (simpler, and avoided real accessibility errors — see "Bugs found" below). The underlying table and its current filters/sort/pagination are never touched by opening or closing the drawer, since it's an overlay (`Sheet`/portal), not a route change — "preserve filters/pagination/scroll position" from the spec falls out of that for free, it isn't separately implemented.

### Reusable `EntityReviewDrawer`

Built as a generic component in `src/components/` (not `components/merchants/`), per the explicit instruction not to build a Merchant-only drawer:

- `EntityReviewDrawer` — Sheet-based shell: header with an accessible/visible title, and a scrollable content area for arbitrary `children`. No Save/Cancel opinion baked in.
- `EntityReviewDrawerFooter` — the standardized Cancel / Save Changes / loading-state footer, rendered by the entity-specific body (e.g. `MerchantReviewDrawer`'s `DrawerBody`) as the **last** child of `EntityReviewDrawer`'s content, using `sticky bottom-0` so it stays pinned while the rest of the content scrolls beneath it.

`MerchantReviewDrawer` supplies only the four Merchant-specific sections as children — nothing merchant-specific lives in `EntityReviewDrawer` itself. When Categories/Clients/Accounts/Credit Cards get their own review drawers, they compose the same two primitives the same way.

### Section content

1. **Merchant Identity** — logo placeholder (`Store` icon, matching the table's row icon), editable Merchant Name, editable Status (+ a read-only "Current Status" badge showing the persisted value alongside the draft edit), and a disabled "Merchant ID — assigned automatically — coming soon" field (spec: "future placeholder").
2. **Classification** — Default Category via the same reused `CategorySelector`; Client Mapping rendered as a disabled placeholder (`MerchantRecord` has no client-mapping field, and this task's instructions explicitly forbid modifying domain models here — see "Scope note" below); Notes via `Textarea`.
3. **Merchant Intelligence** (read-only) — Total Transactions/Total Spend/Average Transaction come straight from the already-loaded `MerchantRecord` (no extra fetch); Last Transaction likewise. First Seen is the one genuinely new query: `useTransactionsList({ ..., sort: { id: 'date', desc: false }, filters: { merchantId }, pageSize: 1 })`, reusing the existing hook/repository exactly as-is, just with ascending sort to get the earliest transaction.
4. **Recent Transactions** — latest 5 via `useTransactionsList({ ..., sort: { id: 'date', desc: true }, filters: { merchantId }, pageSize: 5 })`. Columns are Date/Amount/Category/Account-Card, reusing `AccountCell` from `components/transactions/` for the last one. "View All Transactions" calls the **same** `handleViewTransactions` the row's primary action already uses — `navigate('/transactions?merchantId=...')` — not a second navigation path.

### Scope note: Client Mapping

The spec lists "Client Mapping" as editable, but `MerchantRecord` has no client-mapping field, and this task's own "DO NOT CHANGE" section forbids modifying domain models. Rather than either inventing a field (violates the constraint) or building a selector that silently discards its value on save (misleading), it's rendered as a disabled placeholder — the same honest pattern already established for Aliases/Merchant Rules in `MerchantFormDialog` and Icon in Categories' form. Flagged here explicitly since it's a real spec/constraint conflict, not an oversight.

### Save flow

`Save Changes` calls the existing `useUpdateMerchant()` mutation with the drawer's draft values (name/defaultCategoryId/status/notes — the same shape `MerchantFormDialog` already sends, no new mutation or endpoint). On success: the drawer closes, the table's row updates via the existing query invalidation (no drawer-specific refetch logic), and `Toast` shows "`<name>` saved." for 3 seconds. `Cancel` and `Escape` both discard the draft without mutating.

### Accessibility features

- **Escape / click-outside / focus trap** — inherited from Base UI's `Dialog` primitive underlying `Sheet`, the same one `TransactionDetailsDrawer`/`StatementDetailsDrawer` already use. Not custom-built.
- **Row-click exception is scoped and justified**, not a blanket suppression: making an entire `<tr>` a real ARIA button (`role="button" tabIndex={0}`) was considered and rejected — it would nest an interactive widget around the row's _own_ interactive children (the category selector, action buttons), which is invalid ARIA nesting and would make keyboard Tab/Enter behavior actively confusing around those controls. The name button and "Review Merchant" menu item are the fully keyboard-operable equivalents of the row click; the row's `onClick` is documented in-code as mouse-only convenience layered on top of them.
- **Focus restoration to the triggering row** — this needed real custom work; see "Bugs found" below.
- Form fields use the same `Label`/`aria-required`/`aria-invalid` pattern as every other form in this app; read-only Intelligence values use plain text, not disabled inputs, so screen readers announce them as static content rather than unavailable controls.

### Responsive behaviour

Screenshotted at 1440px/834px/390px with the drawer open at each. `document.body.scrollWidth === clientWidth` at all three — no page-level overflow. The drawer is `w-full` on mobile (fills the viewport) and `sm:max-w-lg` from the `sm` breakpoint up, matching `TransactionDetailsDrawer`/`StatementDetailsDrawer`'s existing `side="right"` sizing convention rather than a new breakpoint scheme.

### Bugs found and fixed during verification

1. **A real accessibility lint error, not a style nit.** The first draft stopped click propagation on wrapper `<div>`s around the Default Category cell and the actions menu, to keep the row's own `onClick` from also firing. ESLint's `jsx-a11y/click-events-have-key-events` and `no-static-element-interactions` correctly rejected this — a `<div onClick>` with no keyboard equivalent is a real a11y gap, not a false positive. Fixed by removing those wrapper divs entirely and instead checking the click target on the row's own handler (`event.target.closest('button, [role="combobox"], [role="menuitem"]')) — see "Interaction model" above. Zero lint errors after.
2. **Focus restoration required real investigation, not just wiring a ref.** The first implementation captured `document.activeElement` on open and called `.focus()` on it from the Sheet's `onOpenChange(false)` callback — and focus landed on `<body>` every time, not the button. Root-caused via a `MutationObserver` + a monkey-patched `HTMLElement.prototype.focus` in a scratch Playwright script (not guesswork): opening the drawer changes this page's state, which re-renders `MerchantTable` with brand-new (unmemoized) row-action callback props, which changes the `columns` `useMemo`'s dependency array, which makes TanStack Table's `flexRender` treat every cell as a new component instance and remount it — so **any** DOM ref captured before that point is reliably stale by close time. This is a pre-existing characteristic every table in this codebase shares (Category/Statement/Transaction tables all follow the identical unmemoized-callbacks-in-`useMemo`-deps pattern); it was simply never observed before because no prior feature depended on DOM node identity surviving a parent re-render. Fixing it project-wide (wrapping every page's row-action handlers in `useCallback`) was out of this module's scope, so the fix is scoped to Merchants: store the merchant's **id**, not a DOM node, and re-query a fresh element (`[data-merchant-row-trigger="<id>"]`, a small new attribute on the name button) at restore time. Separately, Base UI's `Dialog` only auto-restores focus when opened via its own `Trigger` component — every dialog in this app (this one included) is opened via externally-controlled state instead — so restoration is explicit, hooked off `onOpenChangeComplete` (exposed through `EntityReviewDrawer`'s new `onClosed` prop) rather than a guessed timeout, deferred one further macrotask because Base UI keeps moving focus onto its own closing popup container a couple more times immediately after that callback fires. Verified with a dedicated Playwright test (`toBeFocused()` on the original trigger after Escape) across both the name-click and menu-item entry points.

## UX verification / polish pass

Before closing the module, a final pass checked the drawer against a 12-item UX checklist (premium feel, animation smoothness, all three open paths, selected-row highlight while open, scroll/filter/pagination preservation, Recent Transactions rendering, drill-down banner reuse, no-refetch save, toast timing, keyboard accessibility, responsive layout, visual polish). No business logic, repository, routing, or domain-model changes were made — scoped entirely to interaction polish in `Merchants.tsx`/`MerchantTable.tsx`.

Two real defects were found and fixed:

1. **Unmemoized row-action callbacks caused a table-wide remount storm on every `Merchants` re-render.** `handleEditMerchant`/`handleReviewMerchant`/`handleChangeCategory`/`handleViewTransactions`/`handleDeleteMerchant`/`handleSortChange` were plain inline functions, so `MerchantTable`'s `columns` `useMemo` recomputed on every render (any state change — including opening the drawer), and TanStack Table's `flexRender` treated every cell as a brand-new component instance and remounted it. Confirmed with a `MutationObserver` on `tbody` in a scratch Playwright script: 1,215+ DOM mutations during a single drawer-open before the fix. Fixed by wrapping all six handlers in `useCallback`. One subtlety: `handleChangeCategory` initially depended on the whole `updateMerchant` object from `useUpdateMerchant()` — TanStack Query v5's `useMutation()` returns a **new wrapper object every render** (only `.mutate` itself is referentially stable), so that dependency silently defeated the memoization. Fixed by depending on `const updateMerchantMutate = updateMerchant.mutate` instead. After the fix: 9 mutations during open (the drawer's own content mounting), confirmed via the same instrumented script.
2. **Opening the drawer while scrolled down did not restore the table's scroll position on close.** Root-caused (not guessed) via frame-by-frame instrumentation (`requestAnimationFrame` sampling of `window.scrollY`/`scrollHeight`, plus monkey-patched `scrollTo`/`scrollIntoView`/`focus`): the drop is a side effect of Base UI's own scroll-lock engaging on open — it happens a frame before the lock's `overflow: hidden` is even readable via `getComputedStyle`, and no `scrollTo`/`scrollIntoView` call is ever made by this app's code, ruling out a page-level cause. That's library behavior out of this module's scope to fix generically (every other Sheet/Dialog in the app has the same characteristic), but since the table is fully obscured and inert for the entire time the drawer is open, restoring the pre-open position on close satisfies "preserves scroll position" without touching Base UI internals: `Merchants.tsx` now captures `window.scrollY` in `handleReviewMerchant` (all three open paths funnel through it) and restores it in the drawer's `onClosed` handler, alongside the existing focus-restoration logic. Verified with `requestAnimationFrame`-level Playwright instrumentation across three rows (including off-screen ones, where "before" was correctly measured at true interaction time — i.e. after Playwright's own actionability auto-scroll, matching what a real user would experience) — all preserved exactly.

A third, smaller gap (not a regression, just missing from the initial drawer build) was also closed: the triggering row now stays visually highlighted (`bg-accent/60`) for as long as the drawer is open, via a new optional `selectedMerchantId` prop on `MerchantTable`, and reverts on close.

The remaining nine checklist items were verified with no code changes needed: premium feel/animation smoothness/visual polish (screenshotted, matches the design tokens already established), Recent Transactions rendering, "View All Transactions" reusing the existing drill-down banner, Save Changes updating the table via existing query invalidation (no full refresh), toast auto-dismiss timing, and keyboard accessibility (Escape/focus-trap/focus-restore) — all already correct from the base drawer implementation and confirmed via the existing `merchants.spec.ts` suite plus two new specs added to lock in the row-highlight and scroll-preservation fixes.

## Architecture decisions

1. **Drill-down generalized to a small param map, not duplicated.** The spec explicitly said "Do NOT create another drill-down implementation," and Transactions already had one Category-only implementation from Module 5. Rather than copy-pasting it for `merchantId`, `Transactions.tsx` now reads a `DRILL_DOWN_PARAMS` map (`{ categoryId: {...}, merchantId: {...} }`), resolves whichever one is present in the URL on mount, and renders one `ActiveFilterBanner`. Adding a third drill-down target later (Client/Account/Credit Card/Statement, as the Categories spec anticipated) means adding one entry to that map, not a third implementation.
2. **Repository pattern, identical shape to every prior module.** `MerchantRepository` → `MockMerchantRepository` → `merchants.service.ts`. A future `SupabaseMerchantRepository` only requires changing that one file.
3. **"Change Category" reuses the inline cell instead of building a second control.** The Default Category table column is a live `CategorySelector` (the same inline-editable dropdown Transactions already uses), so "changing a merchant's category" already has a fast, direct, already-approved UI. The row-action-menu's "Change Category" item opens the same `MerchantFormDialog` as "Edit Merchant" rather than a bespoke popover — building a second quick-edit control for a capability the inline cell already covers would be exactly the kind of redundant abstraction CLAUDE.md's Feature Development Rules warn against ("Do not introduce new abstractions unless reused by multiple modules").
4. **Deterministic mock data, derived from the existing transaction/category datasets.** `generate-merchants.ts` reuses the 19 existing merchant ids from `reference-data.ts` (no new ids invented) and hand-authors default-category/status/aliases/notes/hasRules metadata per merchant, then computes `transactionCount`, `totalSpend`, `averageTransaction`, and `lastTransactionAt` by scanning `mockTransactions` — the same dataset Transactions/Statements/Categories already read. Two merchants (Razorpay, Zerodha) are deliberately left uncategorized to exercise the "Uncategorized Merchants" KPI/filter with real data, mirroring Categories' precedent of leaving two categories inactive for the same reason.
5. **Aliases and Merchant Rules are real data fields with placeholder editing UI**, not fully-fake stubs — `MerchantRecord.aliases: readonly string[]` and `hasRules: boolean` are populated in mock data and power real search (search matches name **and** aliases) and a real "Has Rules" filter; only the _editing_ controls in the form are disabled placeholders ("Alias manager coming soon" / "Rule builder coming soon"), the same distinction Categories drew for its Icon field.
6. **Form state resets via conditional mount, not an effect** — identical fix to `CategoryFormDialog`'s (Module 5): `MerchantFormBody` is only mounted while the dialog is `open`, with every `useState` seeded directly from the `merchant` prop, avoiding the `react-hooks/set-state-in-effect` issue that pattern was built to fix in the first place.

## Testing results

| Check                                                           | Result                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                           | ✔ Pass                                                                                                                                                                                                                                                                    |
| `npx eslint .`                                                  | ✔ 0 errors (6 pre-existing benign warnings: `useReactTable` React Compiler notices on `MerchantTable`/`CategoryTable`/`StatementTable`/`TransactionTable`, `react-refresh/only-export-components` on `badge.tsx`/`button.tsx`)                                            |
| `npm run build`                                                 | ✔ Pass — `Merchants` chunk builds as its own lazy-loaded bundle (23.3kB / 6.9kB gzip)                                                                                                                                                                                     |
| `npx vitest run`                                                | ✔ 14/14 (4 new `merchantsToCsv` cases: header+row format, Uncategorized fallback, blank last-transaction cell, comma-quoting; existing `transactionsToCsv`/`categoriesToCsv` cases unchanged and still passing)                                                           |
| `npx playwright test --project=chromium`                        | ✔ 48/48 (26 pre-existing + 10 base-module Merchants specs + 11 drawer specs + **2 new polish-pass specs**: selected row stays highlighted while the drawer is open and unhighlights on close; closing the drawer preserves table scroll position)                         |
| Responsive — desktop (1440px) / tablet (834px) / mobile (390px) | ✔ Screenshotted at all three; `document.body.scrollWidth === clientWidth` at every breakpoint — no page-level horizontal overflow (after the KPICard fix above)                                                                                                           |
| Drill-down end-to-end                                           | ✔ Verified manually + in Playwright: clicking "View Transactions" on Adobe Creative Cloud navigates to `/transactions?merchantId=merchant-adobe`, shows "Filtered by merchant: Adobe Creative Cloud", and the ledger correctly shows only that merchant's 14 transactions |
| Keyboard / accessibility                                        | ✔ Inherited from Base UI's accessible primitives — same pattern as Modules 3–5                                                                                                                                                                                            |
| Dark mode                                                       | ✔ Only mode exercised (consistent with Modules 1–5)                                                                                                                                                                                                                       |

Two test-authoring bugs (not app bugs) were caught while writing `merchants.spec.ts`, both the same class Modules 3–5 already flagged: `getByText('Total Spend')` matched both the KPI label and the sortable table-column header with identical text (scoped with `{ exact: true }.first()`), and a second click on `getByRole('button', { name: 'Add Merchant' })` timed out because Base UI marks the rest of the page inert while a dialog is open — the header button becomes inaccessible, leaving only the dialog's own submit button, so the extra `.nth(1)` was actually wrong, not needed.

## Future Supabase integration points

1. Implement `SupabaseMerchantRepository implements MerchantRepository` (`src/repositories/`) — `list`/`getSummary`/`create`/`update`/`delete`, backed by the existing `merchant_memory` table (per CLAUDE.md Part 3) and a new `vw_merchants`-style view joining transaction/spend aggregates server-side (per CLAUDE.md's "never calculate... Merchant Statistics inside React" rule — the mock repo's in-memory aggregation is today's stand-in for that view).
2. Change one line in `src/services/merchants.service.ts` to construct the Supabase implementation instead of `MockMerchantRepository`.
3. Alias management ("Alias manager coming soon") and rule building ("Rule builder coming soon") are explicit future placeholders per this task's spec — `MerchantRecord.aliases`/`hasRules` already model the read side; only write UIs remain, and per CLAUDE.md's Merchant Center contract, any actual categorization-rule _logic_ stays out of this module's scope regardless (n8n/AI Categorisation territory).
4. Merge Merchants is disabled in the row menu ("Soon") — per the spec's "Future placeholder" note. When scoped, it should follow the audit-preserving behavior CLAUDE.md's original Merchant Center business rules describe ("Merge should preserve audit history").
5. The generalized `DRILL_DOWN_PARAMS` map in `Transactions.tsx` is ready for Client/Account/Credit Card/Statement drill-downs the moment those modules are built — no Transactions-side changes needed beyond adding one map entry per new param.
6. Client Mapping (drawer Classification section) needs a real field on `MerchantRecord` (or a join through a future `clients` relationship) before it can be more than a placeholder — see "Scope note: Client Mapping" above.
7. `EntityReviewDrawer`/`EntityReviewDrawerFooter` are ready to be reused as-is by Categories/Clients/Accounts/Credit Cards' own review drawers when those are built — no changes anticipated to the shell itself, only to the entity-specific body composing it.

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
11. `feat(module-6): implement merchants module`
12. `feat(module-6): add merchant review drawer`
13. `refactor(module-6): polish merchant drawer interaction` — this follow-up

Stopping here per instruction. Awaiting explicit approval before beginning Module 7.
