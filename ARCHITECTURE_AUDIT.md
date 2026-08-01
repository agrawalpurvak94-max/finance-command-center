# ARCHITECTURE_AUDIT.md

Project maintenance pass performed before Module 4.

Generated 2026-08-02.

Scope: Modules 1–3 (Application Shell, Dashboard, Transactions). No application features were added or changed — this is a structural review plus the domain-layer consolidation described below.

---

## 1. Repository structure reviewed

```
src/
  app/            — routing, providers
  pages/          — page composition only
  layouts/        — AppShell, Sidebar, TopNav, PageContainer
  components/
    ui/           — shadcn/ui primitives (Base UI-backed)
    dashboard/    — Module 2 widgets
    transactions/ — Module 3 widgets
    (root)        — cross-module reusable components
  domain/         — NEW: shared domain layer (this maintenance pass)
  hooks/          — TanStack Query hooks, one file per module
  services/       — repository-instantiation layer, one file per module
  repositories/   — repository interfaces + mock implementations
  stores/         — Zustand (theme only)
  utils/          — pure helpers (currency, csv)
  types/          — now holds only nav.ts (UI-shell concept, not a domain entity)
supabase/         — not yet created (no Supabase integration exists yet)
tests/
  unit/           — Vitest
  e2e/            — Playwright
```

This matches CLAUDE.md's prescribed structure. No folders were renamed or moved.

## 2. Shared components verified (Modules 1–3)

| Component                                                                                                                                                                               | Used by                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `PageContainer`                                                                                                                                                                         | Every page (Module 1)                                                                        |
| `EmptyState`                                                                                                                                                                            | Dashboard (Statement/Resolution/RecentTransactions widgets), Transactions (no-results state) |
| `QueryBoundary`                                                                                                                                                                         | Every widget/table backed by a query in both Dashboard and Transactions                      |
| `ConfirmDialog`                                                                                                                                                                         | Transactions (row delete, bulk delete) — generic, not transactions-specific                  |
| `FloatingActionButton`                                                                                                                                                                  | Transactions (Quick Add) — generic, not transactions-specific                                |
| `Pagination`                                                                                                                                                                            | Transactions — generic, not transactions-specific                                            |
| `Breadcrumbs`, `ModulePlaceholder`                                                                                                                                                      | Shell/placeholder pages                                                                      |
| shadcn/ui primitives (`button`, `input`, `dialog`, `select`, `checkbox`, `popover`, `label`, `textarea`, `table`, `separator`, `badge`, `dropdown-menu`, `sheet`, `skeleton`, `avatar`) | Shared across both modules, never duplicated per-module                                      |

All of the above are genuinely shared — none have a duplicate, module-local reimplementation.

## 3. Duplicate components — none found

Dashboard's `AccountCard`/`AccountsWidget` and Transactions' `AccountCell` both render "account" information but are **not duplicates**: they serve different granularities (a dashboard summary card with balance/status/sync info vs. a compact table-cell reference showing bank + masked card number) and read from different data shapes (`ConnectedAccount` vs. `TransactionAccount`, both now in `domain/Account.ts`). Kept as two components deliberately — collapsing them would force one to serve two unrelated layouts.

No other component-level duplication was found across Modules 1–3.

## 4. Duplicate TypeScript interfaces — 2 found, both fixed

Before this pass, `src/types/transaction.ts` and `src/types/dashboard.ts` were two independent files with real overlap:

| Name                | Module 2 (`types/dashboard.ts`)         | Module 3 (`types/transaction.ts`)                                                             | Problem                                                                                                                                                                             |
| ------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AccountKind`       | `'bank' \| 'credit_card'`               | `'bank' \| 'credit_card'`                                                                     | **Byte-identical duplicate.** Same type, defined twice.                                                                                                                             |
| `TransactionStatus` | `'processed' \| 'pending' \| 'flagged'` | `'reviewed' \| 'uncategorized' \| 'duplicate' \| 'flagged' \| 'verified' \| 'pending_review'` | **Same name, different meaning.** A real risk: importing the wrong one, or a future module unifying them incorrectly, would silently produce wrong types or wrong runtime behavior. |

Both were introduced honestly — Module 2 predates Module 3's real `Transaction` domain model, so its dashboard widget invented a simplified local status vocabulary before the canonical one existed. Once Module 3 built the real thing, the collision became a genuine (if currently harmless) landmine.

**Fix applied:**

- `AccountKind` consolidated into `domain/Account.ts` — one definition, both modules import it.
- Dashboard's `TransactionStatus` renamed to `RecentTransactionStatus` in `domain/Dashboard.ts` (values unchanged: `'processed' | 'pending' | 'flagged'`). This is a pure rename — no visual or behavioral change to the Dashboard's Recent Transactions widget. It remains intentionally distinct from the canonical `TransactionStatus` (Module 3's full 6-state ledger lifecycle), because it represents a different, simplified concept (a dashboard summary indicator), not the same data under a different name.

No other duplicate or colliding type/interface names were found (verified by listing every top-level `export interface`/`export type` outside `components/ui/` and diffing names).

## 5. Reusable hooks

| Hook                 | Notes                                                                                                                                                                                                                                                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useDashboard()`     | One hook, one query per widget, shared `refreshAll()`. Not duplicated per-widget.                                                                                                                                                                                                                                                |
| `useTransactions.ts` | 8 focused hooks (`useTransactionsList`, `useTransactionCategories/Clients/Merchants/Accounts`, `useUpdateTransaction`, `useBulkUpdateTransactions`, `useBulkDeleteTransactions`, `useCreateTransaction`) — each owns exactly one query or mutation, all invalidate only `queryKeys.transactions.all`, never a global invalidate. |

No duplicate data-fetching logic exists outside these two files.

## 6. Reusable utilities

| Utility                                             | Notes                                                                                                                                                                   |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/currency.ts` (`formatINR`)                   | Used by Dashboard and Transactions identically — real `Intl.NumberFormat('en-IN')` Lakh/Crore formatting, unit-tested.                                                  |
| `utils/csv.ts` (`transactionsToCsv`, `downloadCsv`) | Transactions-specific today; written generically enough (`downloadCsv(filename, content)`) to be reused by any future module needing CSV export (Statements, Accounts). |
| `lib/utils.ts` (`cn`)                               | Standard Tailwind class-merge helper, used everywhere.                                                                                                                  |
| `lib/queryKeys.ts`                                  | One shared query-key registry with per-module namespaces (`dashboard`, `transactions`) — the pattern every future module should extend, not replace.                    |

## 7. Technical debt (flagged, not fixed — see "fix only critical issues")

1. **`useDashboard`'s `refreshAll()` uses a raw `['dashboard']` literal** instead of a `queryKeys.dashboard.all` constant (which doesn't exist yet — only per-widget keys do). Works correctly today because every dashboard key starts with `'dashboard'`, but it's an implicit convention rather than an enforced one. Low risk, not fixed — changing it means adding a new key and touching working invalidation logic for zero behavioral gain right now.
2. **`DashboardHeader.tsx`'s mobile layout** uses `flex items-end justify-between` with no wrap — the same pattern that caused a real overflow bug in `TransactionsHeader.tsx` (fixed during Module 3). Not fixed here — Module 2 is closed out and this is a visual/responsive issue, not an architectural/duplication one, so it's out of scope for this pass. Flagged again for whoever next touches the Dashboard.
3. **`Project Vision.md` vs. built Dashboard gap** (missing "Recent Statements"/"Notifications" sections per that document) remains open, as flagged in `MODULE3_REPORT.md`. Still not acted on — no module currently owns closing this gap.
4. **`domain/Statement.ts` and parts of `domain/CreditCard.ts` are intentionally near-empty.** Statements (Module 5) and Credit Cards (Module 6) have no approved design yet, so their domain files hold only what's already inferable from existing mock data (`CardNetwork`) or nothing at all (`Statement.ts` is a documented placeholder). This is deliberate, not an oversight — filling them in now would mean guessing at a future module's shape.

## 8. Refactoring recommendations (not applied — flagged for future modules only)

- When Module 6 (Credit Cards) is scoped, revisit whether `ConnectedAccount` (dashboard summary shape) and `TransactionAccount` (transaction-row reference shape) should share a base interface, once it's clear what the dedicated Credit Cards page actually needs to display.
- When Module 5 (Statements) starts, populate `domain/Statement.ts` with real interfaces derived from that module's approved design — not before.
- Consider promoting `formatINR` and `downloadCsv`-style utilities into a documented "shared utilities" convention note in CLAUDE.md, since Modules 4–9 will likely all need currency formatting and several will likely need CSV export.

## 9. What changed as part of this pass

**Added:**

```
src/domain/Dashboard.ts
src/domain/Transaction.ts
src/domain/Statement.ts
src/domain/Account.ts
src/domain/CreditCard.ts
src/domain/Merchant.ts
src/domain/Category.ts
src/domain/Client.ts
```

**Removed:**

```
src/types/transaction.ts   (content moved into domain/, split by entity)
src/types/dashboard.ts     (content moved into domain/Dashboard.ts + domain/Account.ts)
```

**Modified (import paths only — zero behavioral changes except the one documented rename):**

28 files across `components/dashboard/`, `components/transactions/`, `hooks/`, `repositories/`, `services/`, `utils/`, `pages/`, `lib/queryKeys.ts`, and `tests/unit/csv.test.ts` — each updated to import from `@/domain/*` instead of `@/types/transaction` or `@/types/dashboard`. Full list is mechanical (import-line changes only) and is visible in the commit diff.

**Verification after the migration:** `tsc -b --noEmit` clean, `eslint .` clean (same 3 pre-existing benign warnings as before this pass), `prettier --check .` clean, `npm run build` succeeds, `vitest run` 7/7, `playwright test --project=chromium` 10/10 — no regressions.

## 10. What was deliberately NOT touched

Per "fix only critical architectural issues, do not refactor working code unless necessary":

- `DashboardHeader.tsx`'s mobile overflow (tech debt item 2 above) — not architectural, purely visual.
- `useDashboard`'s `refreshAll()` literal key (tech debt item 1) — works correctly, non-critical.
- No component was merged, split, or redesigned. No visual output changed anywhere in the app except that `RecentTransactionsWidget` now imports a differently-named (but identically-valued) type — there is no rendering difference.
