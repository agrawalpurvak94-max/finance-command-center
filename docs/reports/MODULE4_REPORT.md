# MODULE4_REPORT.md

Module 4 (commit-scope) — Statements ("Statement Processing")

Generated 2026-08-03.

Note on numbering: CLAUDE.md's Part 4/5 module contracts label this "Module 5
(Statements)" in the narrative module list, but the Commit Format mapping
table added afterward (Part 6) explicitly assigns `module-4` to Statements
for commit-scoping purposes — that table is the authoritative source for the
`feat(module-N): ...` scope used here and in this report's filename.

---

## Session continuity: what was already done before this session

This session picked up an interrupted implementation rather than starting
fresh. Before writing any code, the repository was inspected end-to-end
(`git status`, `git diff --stat`, `git log`) to establish exactly what had
already landed:

- `src/domain/Statement.ts` — full `Statement`/`StatementFilters`/`StatementSort`/
  `StatementListParams`/`StatementListResult`/`StatementSummary`/
  `StatementCreateInput` types (already replaced the empty pre-Module-4
  placeholder noted in `DOMAIN_ARCHITECTURE_REPORT.md`).
- `src/repositories/statement.repository.ts`, `mock-statement.repository.ts`,
  `mock-data/generate-statements.ts` — repository interface, mock
  implementation, and a seeded (`mulberry32`) deterministic dataset (63
  statements across the existing mock accounts).
- `src/services/statements.service.ts` — the single Supabase swap point.
- `src/hooks/useStatements.ts` — `useStatementsList`, `useStatementsSummary`,
  `useCreateStatement`, `useReprocessStatement`, `useDeleteStatement`.
- `src/lib/queryKeys.ts` — `statements` query-key namespace added.
- `src/components/statements/*` — all 9 components (header, filters, summary
  widget, table, table skeleton, status badge, row actions menu, details
  drawer, upload dialog) were already written.
- `src/pages/Statements.tsx` — full page composition already wired to the
  above (search, filters with draft/applied split, pagination, drawer,
  upload dialog, delete confirmation).
- `src/components/dashboard/KPICard.tsx` — already extended with an optional
  `formatValue` prop so the Statements summary widget could render plain
  counts instead of the Dashboard's INR currency formatting, without forking
  the component.
- Routing (`src/app/App.tsx`) and the sidebar nav item (`src/lib/navigation.ts`)
  already pointed `/statements` at this page — leftover scaffolding from
  Module 1, unchanged here.

**Nothing above was rewritten.** This session's own contribution was:
verification (typecheck/lint/build/tests), writing the missing Playwright
coverage, finding and fixing one real cross-module responsive bug the new
tests surfaced, and this report.

## Files added this session

```
tests/e2e/statements.spec.ts
MODULE4_REPORT.md
```

## Files modified this session

```
src/components/Pagination.tsx   — mobile overflow fix (see "Bug found" below)
```

No other previously-uncommitted file was changed; the Module 4 work already
on disk was verified as correct and left as-is.

## Bug found and fixed during verification

**Pagination overflows the viewport on mobile when the result set has 5–7
pages.** `src/components/Pagination.tsx`'s numbered page-button row
(`getPageItems`) only collapses to an ellipsis layout above 7 pages; between
1 and 7 pages it renders every page number as its own button with no wrap
and no overflow handling on the containing `<nav>`. Transactions' 320-row
mock dataset (32 pages) always ellipsis-collapses to a handful of buttons
and never hit this, so it went unnoticed in Module 3. Statements' 63-row
dataset (7 pages, exactly at the non-collapsing threshold) rendered all 7
number buttons plus the rows-per-page select and prev/next arrows, which
together measure wider than a 390px viewport.

Confirmed via a scripted Playwright check
(`document.body.scrollWidth` vs `clientWidth` at 390×844) — `/statements`
showed `scrollWidth: 475` against a 390px viewport (`OVERFLOW`), while the
identical check against `/transactions` at the same viewport showed no
overflow, isolating the bug to `Pagination` rather than anything
Statements-specific. Walking the DOM ancestor chain confirmed the table's
own `overflow-x-auto`/`overflow-hidden` containment was working correctly
(table clientWidth correctly clamped to 340px) — the offending element was a
sibling `<nav>`, not the table.

Fixed by making the numbered page-button list desktop-only (`hidden
sm:flex`) and substituting a compact "Page X of Y" text label below the `sm`
breakpoint, keeping the prev/next arrow buttons and rows-per-page selector
visible at every size. Re-verified: `scrollWidth === clientWidth === 390` at
390px afterward, and `npx playwright test --project=chromium` (all 17 specs
across `smoke`, `transactions`, `statements`) still passes — this is a
shared component, so this was re-checked against Transactions' pagination
too, not just Statements'.

This mirrors Module 3's bug #2 in kind (a shared-layout responsive bug
surfaced by, but not scoped to, the module being built) — fixed here for the
same reason: it blocks this module's own "Responsive: Support Desktop,
Tablet, Mobile / Never desktop-only" acceptance bar.

## Testing results

| Check                                    | Result                                                                                                                                                                                                                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                    | ✔ Pass                                                                                                                                                                                                                                                                      |
| `npx eslint .`                           | ✔ 0 errors (4 pre-existing benign warnings: `useReactTable` React Compiler notices on both `StatementTable` and `TransactionTable`, `react-refresh/only-export-components` on `badge.tsx`/`button.tsx`)                                                                     |
| `npm run build`                          | ✔ Pass — `Statements` chunk builds as its own lazy-loaded bundle (26.1kB / 7.65kB gzip)                                                                                                                                                                                     |
| `npx vitest run`                         | ✔ 7/7 (unchanged — no new unit-level logic was added this session; existing `csv`/`currency`/`bootstrap` suites cover shared utilities)                                                                                                                                     |
| `npx playwright test --project=chromium` | ✔ 17/17 (10 pre-existing + **7 new** Statements specs: list loads with real rows, summary widget shows metrics, search filters rows, row action menu shows View Details/Delete, View Details opens the drawer, sorting toggles asc/desc, Upload Statement opens the dialog) |
| Responsive — desktop (1440px)            | ✔ Screenshotted — filters row, 5-KPI summary grid, and table all lay out correctly                                                                                                                                                                                          |
| Responsive — tablet (834px)              | ✔ Screenshotted — summary grid reflows to `sm:grid-cols-3`, table scrolls independently of the page                                                                                                                                                                         |
| Responsive — mobile (390px)              | ✔ Screenshotted after fix — no page-level horizontal overflow (bug above); summary grid stacks to `grid-cols-1`; pagination shows "Page X of Y" instead of overflowing buttons                                                                                              |
| No page-level horizontal scroll          | ✔ Verified via `document.body.scrollWidth`/`clientWidth` script at all three breakpoints (see bug above)                                                                                                                                                                    |
| Dark mode                                | ✔ Only mode exercised (consistent with Modules 1–3)                                                                                                                                                                                                                         |

Two test-authoring bugs (not app bugs) were caught and fixed while writing
`statements.spec.ts`, both ambiguous-locator issues of the same class Module
3 flagged: `getByText('Pending Review')` matched both the KPI card label and
status badges in the table rows (scoped with `.first()`), and
`getByText('Transactions Extracted')` matched both the sortable table header
and the details-drawer label (scoped to `getByLabel('Statement Details')`,
the drawer's accessible name).

## Architecture notes (as implemented, not changed by this session)

1. **Repository pattern, same shape as Transactions.** `StatementRepository`
   (interface) → `MockStatementRepository` (implementation) →
   `statements.service.ts` (`export const statementRepository: StatementRepository = new MockStatementRepository()`).
   A future `SupabaseStatementRepository` reading `vw_statements` /
   `vw_statement_summary` per CLAUDE.md only requires changing that one file.
2. **Reference data is not duplicated.** Accounts and clients used by the
   filter bar and upload dialog come from the existing `useTransactionAccounts`
   / `useTransactionClients` hooks (Module 3/4-transactions) rather than a
   second copy of that reference data — `statement.repository.ts`'s own
   doc-comment calls this out explicitly as intentional.
3. **Deterministic mock data**, seeded independently from the transactions
   dataset (`mulberry32(20260802)`, a different seed than
   `generate-transactions.ts` uses) so the two datasets don't shadow each
   other across reloads/tests.
4. **`Statement` deliberately excludes AI/OCR concepts** (extraction
   confidence, worker health, template detection) per the domain file's own
   comment — those belong to the future AI Review module, not Statements.
5. **KPICard's `formatValue` prop** is an additive, optional prop
   (`formatValue?: (value: number) => string`, defaulting to the existing
   `formatINR`), so Dashboard's and Analytics' existing usages are
   unaffected — verified by `tsc -b` and the unchanged Dashboard Playwright
   specs still passing.

## Future Supabase integration points

1. Implement `SupabaseStatementRepository implements StatementRepository`
   backed by `vw_statements`, `vw_statement_summary`,
   `vw_statement_transactions`, `vw_statement_processing` per CLAUDE.md's
   database section; swap the one line in `statements.service.ts`.
2. `StatementDetailsDrawer`'s "Processing Timeline" and "Import Logs"
   sections currently render explicit placeholder copy ("planned once this
   module reads from Supabase") rather than fabricated data — wire these to
   real timeline/log data once that backend exists.
3. `UploadStatementDialog` only records mock state and says so in its own
   description text; it does not upload anywhere. Actual file upload
   (Storage bucket) is out of scope per CLAUDE.md ("Statement Parsing, Email
   Download, PDF Extraction... already exist in n8n").
4. `StatementRowActionsMenu`'s "Download Original" item is present but
   disabled ("No file") since no file storage is wired up yet.

## Commits

1. `feat: implement Module 1 Application Shell`
2. `docs: analyze updated Dashboard and Analytics Stitch designs`
3. `feat: implement Module 2 Dashboard`
4. `feat: implement transactions module`
5. `docs: add MODULE3_REPORT.md`
6. `docs: add module-completion git protocol to CLAUDE.md`
7. `chore: establish shared domain architecture and project roadmap`
8. `feat(module-4): implement statements module` — this module (includes the
   `Pagination` mobile-overflow fix described above, and this report)

## Out-of-scope observations (not acted on)

- `Project Vision.md` (untracked, in the repo root) was left completely
  untouched — it reads as a separate product-decisions document, not
  Module-4 output, and touching or committing it wasn't requested.
- No unit tests were added for `MockStatementRepository`'s filter/sort/CRUD
  logic — Module 3 set the precedent that unit-test coverage in this repo so
  far is limited to pure utilities (`csv.ts`, `currency.ts`), with
  correctness of repository/hook logic instead covered by the Playwright
  e2e suite. Followed the same convention here rather than introducing a
  new testing pattern unilaterally.

Stopping here per instruction. Awaiting direction on the next module.
