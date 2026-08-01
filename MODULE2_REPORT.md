# MODULE2_REPORT.md

Module 2 — Dashboard ("Operational Command Center")

Generated 2026-08-01.

---

## Product decisions applied

1. Product name confirmed as **Finance Command Center** — no shell changes needed (Module 1 already used this name; the Stitch export's "FinOps Core"/"Intel Core" rename was not applied).
2. CLAUDE.md treated as sole source of truth; `FRONTEND.md`/`SUPABASE.md` absence acknowledged and ignored per instruction.
3. Dashboard and Analytics scopes split as specified — this module implements only: Operational Command Center header, Financial Snapshot, Connected Accounts, Credit Cards, Resolution Queue, Recent Transactions, Quick Actions. Analytics (historical analysis, trends, charts, cash flow, forecasting) is untouched, still a placeholder.
4. Shell left exactly as previously approved — no Help icon, no Workspace links, no ADMIN VIEW, no named user reintroduced. Search/theme toggle/notifications/profile dropdown/Settings all unchanged.
5. **Credit Cards promoted to a dedicated nav item** (`/credit-cards`, between Financial Accounts and Transactions) — full management page not built yet (out of Module 2 scope), so it's a `ModulePlaceholder` stub for now.
6. Stitch's two unfinished/empty sections were corrected, not reproduced:
   - The empty "Statement Import & Alerts" section → `StatementWidget`, a real empty state (icon, explanation, "View Statements" action) instead of a blank div.
   - The KPI row's `grid-cols-4`-with-3-populated-cards bug → corrected to a proper 3-column grid.
7. The sidebar-anchored floating "New Transaction" button (an odd, redundant duplicate of the Quick Actions tile) was dropped rather than reproduced — "Add Transaction" already covers that affordance.
8. Every section is a standalone, reusable, prop-driven widget (see below) — `Dashboard.tsx` only composes them; no section is hardcoded inline.

## What was built

| Layer               | Files                                                                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Types               | `src/types/dashboard.ts`                                                                                                                                                                      |
| Service             | `src/services/dashboard.service.ts` (mocked — see "Known gap" below)                                                                                                                          |
| Hook                | `src/hooks/useDashboard.ts` (TanStack Query, one query per widget, shared `refreshAll`)                                                                                                       |
| Query keys          | `src/lib/queryKeys.ts`                                                                                                                                                                        |
| Utility             | `src/utils/currency.ts` (`Intl.NumberFormat('en-IN')` — real Lakh/Crore grouping, unit-tested)                                                                                                |
| Reusable components | `src/components/EmptyState.tsx`, `src/components/QueryBoundary.tsx` (shared loading/error/empty handling — used by every widget, not duplicated per-widget)                                   |
| Dashboard widgets   | `src/components/dashboard/{DashboardHeader,KPICard,AccountCard,AccountsWidget,ResolutionQueueWidget,RecentTransactionsWidget,QuickActionsWidget,StatementWidget,FinancialSnapshotWidget}.tsx` |
| Page                | `src/pages/Dashboard.tsx` (composition only)                                                                                                                                                  |
| Nav/routing         | `src/lib/navigation.ts` (Credit Cards added), `src/app/App.tsx` (route added), `src/pages/CreditCards.tsx` (stub)                                                                             |

`AccountCard`/`AccountsWidget` are shared by both "Connected Accounts" and "Credit Cards" — one component, two data sets, per the "reusable widgets only" instruction. `KPICard` is written generically enough to be reused by Analytics later.

## Known gap: mock data, not live Supabase

`dashboard.service.ts` returns typed mock data (matching CLAUDE.md's `vw_dashboard_summary`/`vw_dashboard_accounts`/`vw_dashboard_due_cards` shape) rather than querying Supabase — this follows this project's standing "keep fake data until backend integration" instruction. **This means CLAUDE.md's Module 2 acceptance criterion "No Mock Data" is not yet met** — flagging explicitly rather than claiming the module is fully done against that bar. The hook/component layers are already written against the real interfaces, so swapping the service internals for real Supabase calls (Supabase MCP is connected and can inspect the actual view shapes when that's scheduled) shouldn't require touching hooks or components.

## Bugs found and fixed during verification (not just claimed)

1. **Tailwind theme collision (real, systemic):** the custom `--spacing-xs/sm/md/lg/xl` tokens ported in Module 1 silently shadow Tailwind v4's own `max-w-{xs,sm,md,lg,xl}` scale — confirmed by inspecting the generated CSS rule directly (`.max-w-xs { max-width: 4px }` instead of 320px). This broke `EmptyState`'s description text (collapsed to one word per line) and shadcn's own `Sheet` component's responsive max-width. Attempted fix via an explicit `--container-*` override; empirically confirmed (via live rule inspection) that Tailwind still prioritizes the spacing scale regardless, so the real fix is: never use bare `max-w-xs/sm/md/lg/xl` anywhere in this app; use the numeric scale (`max-w-80`, `max-w-96`) instead. Documented in `index.css` as a warning comment for future contributors. Two call sites fixed: `EmptyState.tsx`, `components/ui/sheet.tsx`.
2. **Missing tokens:** `--tertiary`/`--on-tertiary` were never ported in Module 1, silently doing nothing where used (Resolution Queue's "Uncategorized"/"Tag Required" labels). Added, using the real Apex Ledger values.
3. **Wrong token mapping:** Module 1 pointed shadcn's generic `--secondary`/`--secondary-foreground` slot at Apex Ledger's `secondary-container` (a dark navy, meant for the sidebar's active-item background) instead of `secondary` (a light blue-white, used throughout the Stitch export as the de facto "positive/processed" indicator color). Verified unused by anything already built before changing it; corrected.
4. **Responsive overflow:** the Recent Transactions table had no horizontal-scroll wrapper, so it was clipped (Amount/Status columns cut off entirely) below `lg` width. Confirmed via a real mobile-viewport screenshot, not assumed. Fixed with an `overflow-x-auto` wrapper + `min-w-140` on the table; re-verified via `scrollWidth`/`clientWidth` DOM inspection (560px content in a 340px viewport, now reachable by scroll).

## Verification

| Check                       | Result                                                                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`       | ✔ Pass                                                                                                                                                                            |
| `npx eslint .`              | ✔ 0 errors (1 pre-existing shadcn warning, unrelated)                                                                                                                             |
| `npx prettier --check .`    | ✔ Pass                                                                                                                                                                            |
| `npm run build`             | ✔ Pass — `Dashboard` chunk is a real separate lazy-loaded bundle (28.4kB), confirming code-splitting works                                                                        |
| `npx vitest run`            | ✔ 4/4 (added `currency.test.ts` — 3 cases verifying real `₹8,42,100`-style Indian grouping output, not assumed)                                                                   |
| `npx playwright test`       | ✔ 3/3 (updated the shell smoke tests for real Dashboard content; added a test asserting KPI/Resolution Queue/Recent Transactions actually render)                                 |
| Loading state               | ✔ Verified by polling the DOM for `[data-slot="skeleton"]` during load — observed 3 skeletons at ~370ms, then resolved to real KPI data                                           |
| Empty state                 | ✔ Verified visually (Statement Activity widget, which has no data by design)                                                                                                      |
| Error state                 | Code-reviewed only (`QueryBoundary`'s `isError` branch + retry button) — not live-fault-injected, since the mock service never throws. Standard, low-risk TanStack Query pattern. |
| Responsive (desktop/mobile) | ✔ Screenshotted both; found and fixed the table-overflow bug above                                                                                                                |
| Dark mode                   | ✔ Only mode exercised (matches the finalized Stitch design); light mode unaffected (untouched code path)                                                                          |

## Commits

1. `feat: implement Module 1 Application Shell` — the shell work approved in the previous session, committed for the first time.
2. `docs: analyze updated Dashboard and Analytics Stitch designs` — the design-diff analysis.
3. `feat: implement Module 2 Dashboard` — this module.

## Next recommended step

Analytics (Module 9) has a real Stitch design now ("analytics tab") per `DESIGN_DIFF_REPORT.md` — but per your instruction, wait for approval before starting it. Financial Accounts, Categories, and Clients also have confirmed designs and could go next if you'd rather follow CLAUDE.md's original module order instead.
