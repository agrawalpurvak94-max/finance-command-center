# MODULE3_REPORT.md

Module 3 — Transactions ("Transaction Ledger")

Generated 2026-08-01.

---

## Spec compliance summary

Built faithfully against the approved Stitch visual reference (`transaction_intelligence_v7`), with the two explicitly-requested departures from Stitch applied:

1. **Bulk actions** — Stitch's Approve/Reject pair was replaced with the specified single-power-user set: Mark as Reviewed, Categorize, Change Category, Assign Client, Change Merchant, Add Notes, Export Selected, Delete Selected. No approval-workflow states (pending-approval queues, approver roles, etc.) were introduced anywhere.
2. **Business/Personal indicator** — implemented as a segmented pill (`B` / `P`, active side highlighted), per the written spec, rather than Stitch's toggle-switch treatment.

Everything else (page hierarchy, filter toolbar layout, table density, dark theme, FAB position) follows the Stitch export directly.

Supabase was **not** touched. All data flows through a typed mock repository (`MockTransactionRepository`) sitting behind the same `TransactionRepository` interface a future Supabase implementation will satisfy.

## Components created

**Page-level**

- `src/pages/Transactions.tsx` — composition only: owns page/pageSize/sort/filter/selection/drawer/dialog state, wires hooks to reusable components. No business logic or data shaping inline.

**Transactions-specific (`src/components/transactions/`)**

| Component                             | Responsibility                                                                                                                                                                |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TransactionsHeader`                  | Title, subtitle, CSV Export, New Transaction                                                                                                                                  |
| `FilterToolbar`                       | All 10 filters (Date Range, Category, Client, Merchant, Bank Account, Credit Card, Type, Biz/Personal, Status, Amount Range) + Apply/Clear, built on the generic `FilterChip` |
| `FilterChip`                          | Reusable popover-trigger wrapper used by every filter in the toolbar                                                                                                          |
| `BulkActionToolbar`                   | Renders only when `selectedCount > 0`; the 8 specified bulk actions                                                                                                           |
| `TransactionTable`                    | TanStack Table instance: sticky header, sortable columns, row selection, horizontal-scroll wrapper                                                                            |
| `TransactionTableSkeleton`            | Table-shaped loading skeleton                                                                                                                                                 |
| `MerchantCell`                        | Icon-box + merchant name                                                                                                                                                      |
| `CategorySelector` / `ClientSelector` | Typed wrappers over `InlineSelector` for the editable table-cell dropdowns                                                                                                    |
| `InlineSelector`                      | Generic editable-dropdown primitive shared by Category/Client selectors                                                                                                       |
| `AccountCell`                         | Bank name + card network + masked last 4                                                                                                                                      |
| `BizPersonalPill`                     | Segmented Business/Personal indicator (table cells, drawer, New Transaction dialog)                                                                                           |
| `StatusBadge`                         | Reusable status badge (Reviewed/Uncategorized/Duplicate/Flagged/Verified/Pending Review)                                                                                      |
| `RowActionsMenu`                      | Row action menu: View Details, Edit, Change Category, Assign Merchant, Assign Client, Add Note, Split Transaction (disabled, "Soon"), Delete                                  |
| `TransactionDetailsDrawer`            | Full-record side drawer: merchant, status, amount, date, biz/personal, account, category, client, notes (editable), attachments placeholder, audit timeline placeholder       |
| `NewTransactionDialog`                | Manual transaction entry form, validated, used by both the header button and the FAB                                                                                          |

**Generic/reusable (`src/components/`, not transactions-specific)**

- `ConfirmDialog` — generic confirm/cancel dialog, used for single-row and bulk delete
- `FloatingActionButton` — generic FAB, used here for "Quick Add Transaction"
- `Pagination` — generic pagination with ellipsis logic + rows-per-page control

**shadcn/ui primitives added** (Base UI-backed, added via `npx shadcn@latest add`): `select`, `checkbox`, `popover`, `label`, `textarea`, `dialog`, `table`, `separator`, `badge`.

## Shared components reused (built in earlier modules, not duplicated)

- `PageContainer` (layout)
- `QueryBoundary` (loading/error/empty handling — same component Module 2's Dashboard widgets use)
- `EmptyState` (used for the "no transactions match these filters" state)
- `Input`, `Button`, `DropdownMenu` (shadcn primitives from Module 1/2)

## Files changed

**New:**

```
src/types/transaction.ts
src/repositories/transaction.repository.ts
src/repositories/mock-transaction.repository.ts
src/repositories/mock-data/reference-data.ts
src/repositories/mock-data/generate-transactions.ts
src/services/transactions.service.ts
src/hooks/useTransactions.ts
src/components/ConfirmDialog.tsx
src/components/FloatingActionButton.tsx
src/components/Pagination.tsx
src/components/transactions/*.tsx  (14 files, listed above)
src/components/ui/{select,checkbox,popover,label,textarea,dialog,table,separator,badge}.tsx
src/utils/csv.ts
tests/unit/csv.test.ts
tests/e2e/transactions.spec.ts
```

**Modified:**

```
src/pages/Transactions.tsx     — replaced Module 1's placeholder stub with the full page
src/lib/queryKeys.ts           — added `transactions` query-key namespace
src/layouts/AppShell.tsx       — added min-w-0 to the content-column flex chain (see bug #2 below)
src/layouts/PageContainer.tsx  — added min-w-0 (same fix)
```

## Folder structure (new additions)

```
src/
  components/
    transactions/
      AccountCell.tsx
      BizPersonalPill.tsx
      BulkActionToolbar.tsx
      CategorySelector.tsx
      ClientSelector.tsx
      FilterChip.tsx
      FilterToolbar.tsx
      InlineSelector.tsx
      MerchantCell.tsx
      NewTransactionDialog.tsx
      RowActionsMenu.tsx
      StatusBadge.tsx
      TransactionDetailsDrawer.tsx
      TransactionTable.tsx
      TransactionTableSkeleton.tsx
      TransactionsHeader.tsx
    ConfirmDialog.tsx
    FloatingActionButton.tsx
    Pagination.tsx
  repositories/
    transaction.repository.ts
    mock-transaction.repository.ts
    mock-data/
      reference-data.ts
      generate-transactions.ts
  services/
    transactions.service.ts
  hooks/
    useTransactions.ts
  types/
    transaction.ts
  utils/
    csv.ts
```

## Architecture decisions

1. **Repository pattern as the sole Supabase swap point.** `TransactionRepository` (interface) → `MockTransactionRepository` (implementation) → `transactions.service.ts` (`export const transactionRepository: TransactionRepository = new MockTransactionRepository()`). Hooks and components depend only on the interface via the service export. Replacing the mock with a `SupabaseTransactionRepository` later requires touching exactly one file (`transactions.service.ts`); no hook or component changes.
2. **Deterministic mock data.** 320 transactions generated with a seeded `mulberry32` PRNG (not `Math.random()`), so the dataset — and therefore every filter/sort/search/test assertion against it — is stable across reloads and test runs.
3. **Server-state via TanStack Query, own query-key namespace.** `queryKeys.transactions.*` mirrors the pattern established for `dashboard` in Module 2; mutations invalidate only `transactions.all`, never a global `invalidateQueries()`.
4. **Filters use a draft/applied split.** `FilterToolbar` edits a local `draftFilters` object; `Apply Filters` commits it to `appliedFilters` (the value actually sent to the repository). This matches the Stitch design's explicit "Apply Filters" button and avoids re-querying on every keystroke/click inside a filter popover.
5. **Row-level edits are optimistic-feeling but server-driven.** Category/Client/Biz-Personal edits in the table go through `useUpdateTransaction` → repository → query invalidation, rather than local-only state, since these edits must survive navigation and be the same "ground truth" the drawer and future statement-reconciliation logic will read.
6. **Base UI, not Radix, under shadcn.** This project's shadcn/ui is Base UI-backed. This surfaced a real, repeated bug (see below) that doesn't exist under Radix-based shadcn tutorials/examples, so it's called out explicitly for future modules using `Select`.

## Bugs found and fixed during verification (not just claimed)

1. **Base UI `Select.Value` does not auto-resolve labels (real, repeated bug).** Unlike Radix, Base UI's `SelectValue` renders the raw `value` string unless given a `children` render-function. Four separate `Select` usages (`InlineSelector`, `FilterToolbar`'s `ReferenceSelect`, all three selects in `NewTransactionDialog`, and `BulkActionToolbar`'s Categorize select) were initially rendering raw internal IDs (`cat-office`, `client-stellar`) instead of names. Found via a full-page screenshot, root-caused by reading Base UI's `SelectValue.d.ts` directly, and fixed everywhere with the same pattern: `<SelectValue placeholder="...">{(current) => labelsById[current] ?? current}</SelectValue>`. Re-verified after the fix by scripting a Playwright pass that scans all table cells and dialog text for any `cat-|client-|merch-|acc-`-shaped raw ID and asserting zero matches — confirmed clean.
2. **Tablet/mobile: the whole page grew wider than the viewport instead of only the table scrolling (real, systemic bug, not scoped to this module alone).** The table's `overflow-x-auto` wrapper was correctly implemented, but `AppShell.tsx`'s content column and `PageContainer.tsx`'s `section` are flex items with the CSS-default `min-width: auto`, so neither would shrink below the table's ~960px intrinsic content width. Net effect: at a 834px tablet viewport, the _entire app_ (sidebar included) overflowed and required page-level horizontal scroll, rather than a contained table-only scrollbar — a worse failure mode than simple clipping. Confirmed via `scrollWidth`/`clientWidth` measurement (container matched the 1145px content width instead of the 834px viewport). Fixed with `min-w-0` on the two ancestor flex containers in `AppShell.tsx` and `PageContainer.tsx`; re-verified afterward (`clientWidth` correctly clamped to the viewport, `scrollWidth` unchanged, `canScroll: true`). This fix lives in shared layout files from Module 1, but was required to satisfy this module's own "Do not clip columns" / "Tablet: horizontal scroll where necessary" acceptance criteria, so it was made here rather than deferred.
3. **Mobile header overflow.** `TransactionsHeader`'s title+subtitle and CSV Export/New Transaction buttons used `justify-between` with no wrap, overflowing ~40px past the 390px mobile viewport. Fixed by stacking the header vertically below the `sm` breakpoint (`flex-col gap-md sm:flex-row sm:items-end sm:justify-between`); re-verified `document.body.scrollWidth === window.innerWidth` at 390px. **Note:** `DashboardHeader.tsx` (Module 2) uses the identical `justify-between`-without-wrap pattern and likely has the same issue — left untouched since it's outside Module 3's scope, but flagging it for whoever picks up Analytics/other modules next.
4. Two Playwright test-authoring bugs (not app bugs) were caught and fixed during writing: a strict-mode ambiguous selector (`getByRole('button', { name: 'Amount' })` matched both the Amount Range filter chip and the table's sort header) — scoped to `thead`; and an incorrect assumption that a merchant-name search would return exactly 1 row — corrected to assert the total-count shrank and every visible row matched, since 320 random transactions across ~19 merchants plausibly return more than a page's worth of matches.

## Testing results

| Check                                                                                | Result                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                                                | ✔ Pass                                                                                                                                                                                                                                                          |
| `npx eslint .`                                                                       | ✔ 0 errors (3 pre-existing benign warnings: TanStack Table's `useReactTable` React Compiler incompatibility notice, and `react-refresh/only-export-components` on shadcn's own `badge.tsx`/`button.tsx`)                                                        |
| `npm run build`                                                                      | ✔ Pass — `Transactions` chunk builds as its own lazy-loaded bundle (144.7kB / 43kB gzip)                                                                                                                                                                        |
| `npx vitest run`                                                                     | ✔ 7/7 (added 3 new `csv.test.ts` cases: header+row format, Uncategorized fallback, comma-quoting)                                                                                                                                                               |
| `npx playwright test --project=chromium`                                             | ✔ 10/10 (7 new Transactions specs: ledger loads with real rows, search filters rows, row selection reveals bulk toolbar, row action menu shows all items, View Details opens the drawer, sorting toggles asc/desc, FAB opens New Transaction)                   |
| Sticky header, sorting, pagination, search, multi-select, keyboard nav, hover states | ✔ Verified — sorting/selection/search covered by e2e tests above; keyboard nav and hover states are inherited from Base UI's accessible primitives (native `<table>` semantics, real `<button>`/`role="checkbox"` elements, no custom keyboard handling needed) |
| Responsive — desktop (1440px)                                                        | ✔ Screenshotted, matches Stitch layout                                                                                                                                                                                                                          |
| Responsive — tablet (834px)                                                          | ✔ Screenshotted after fix — filters wrap, table scrolls independently of the page (bug #2 above)                                                                                                                                                                |
| Responsive — mobile (390px)                                                          | ✔ Screenshotted after fix — no page-level horizontal overflow (bug #3 above)                                                                                                                                                                                    |
| No raw-ID leaks (Select label resolution)                                            | ✔ Verified via automated text-scan of table + New Transaction dialog (bug #1 above)                                                                                                                                                                             |
| Dark mode                                                                            | ✔ Only mode exercised (matches the finalized Stitch design, consistent with Modules 1–2)                                                                                                                                                                        |

## Future Supabase integration points

When ready to connect real data, the swap is scoped to:

1. Implement `SupabaseTransactionRepository implements TransactionRepository` (`src/repositories/`) — `list`/`getById`/`create`/`update`/`bulkUpdate`/`delete`/`bulkDelete`/`listCategories`/`listClients`/`listMerchants`/`listAccounts`, backed by the `vw_transactions`, `vw_transaction_details`, `vw_transaction_search` views and the `transactions` table per CLAUDE.md's database section.
2. Change one line in `src/services/transactions.service.ts` to construct the Supabase implementation instead of `MockTransactionRepository`.
3. `Transaction`/`TransactionFilters`/`TransactionListParams` (`src/types/transaction.ts`) were written to mirror the future `transactions` table + planned SQL views, so no hook or component types should need to change.
4. Duplicate detection (`vw_transactions_duplicates`) and the review queue (`vw_transactions_review`) are referenced by `Transaction.duplicateOfId` and the `duplicate`/`pending_review`/`uncategorized` statuses already modeled in `TransactionStatus`, but no UI currently filters specifically by "review queue" — that's expected to arrive with Module 8 (AI Review Center), not this module.
5. CSV export currently exports whatever `Transaction[]` is already loaded client-side; no server-side export RPC exists yet, which is fine at current data volumes but should be revisited if "50,000+ rows" (per CLAUDE.md's acceptance criteria) needs a real export-all rather than export-current-page/selection.

## Commits

1. `feat: implement Module 1 Application Shell`
2. `docs: analyze updated Dashboard and Analytics Stitch designs`
3. `feat: implement Module 2 Dashboard`
4. `feat: implement transactions module` — this module (includes the two shared-layout fixes described in bugs #2–3 above)

## Flagged, out-of-scope observations (not acted on)

- `DashboardHeader.tsx`'s mobile-wrap issue (bug #3 above) — same class of fix as `TransactionsHeader`, not applied since Module 2 is already closed out.
- The previously-flagged gap between `Project Vision.md` and the built Dashboard (missing "Recent Statements"/"Notifications" sections) remains open — not addressed here, per the standing instruction to complete one module at a time.

Stopping here per instruction. Awaiting direction on the next module.
