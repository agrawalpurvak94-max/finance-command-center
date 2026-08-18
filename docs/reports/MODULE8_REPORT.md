# MODULE8_REPORT.md

Module 8 — Accounts ("Financial Accounts")

Generated 2026-08-05. Updated 2026-08-05 with a UI refinement pass (bug-fix/usability only — see "UI Refinement Pass" below). Built together with Module 9 (Credit Cards) in the same delivery pass, per explicit instruction — see "Combined build / Module 6-9 tab conflict" below for why the two are still two separate pages, modules, and commits.

---

## Combined build / Financial Accounts tab conflict

The request asked to implement Module 8 (Accounts) and Module 9 (Credit Cards) together, citing an approved Stitch design that combines both into a single "Financial Accounts" page with Bank Accounts / Credit Cards tabs.

That instruction directly conflicted with `PRODUCT_DECISIONS.md`, which is the highest-priority document in this repo ("overrides Stitch exports where conflicts exist") and explicitly states:

> "Credit Cards is a standalone module. Do not merge it into Accounts."

`src/lib/navigation.ts` already documents this as a deliberate, previously-made decision: _"Credit Cards was promoted from a tab (inside Financial Accounts) to a dedicated nav item per the Module 2 product decisions (2026-08-01)."_ The sidebar already has two separate top-level items — Financial Accounts (`/accounts`) and Credit Cards (`/credit-cards`) — specifically because of that reversal.

Per `PRODUCT_DECISIONS.md`'s own "Decision Authority" section ("generate a clarification report instead of inventing functionality"), this was flagged to the project owner before building anything. The answer: **keep them as two separate pages/routes**, each reusing the same shared components (KPI cards, responsive grid, Entity Drawer, drill-down banner), rather than merging into one tabbed page. `PRODUCT_DECISIONS.md` and the sidebar were left unmodified. Module numbering, routes, and commit scope stayed exactly as the Authoritative Module Sequence already defines: Module 8 = Accounts, Module 9 = Credit Cards, no renumbering.

Every other instruction in the original request (KPI set, card field list, drawer sections, drill-down behavior, mock repository pattern) was implemented as specified, just split across `/accounts` and `/credit-cards` instead of unified tabs on one page.

## Spec compliance summary

- Page header: title "Financial Accounts", subtitle "Real-time overview of all connected bank accounts.", actions Link Account + Sync All.
- KPI row: Total Bank Accounts, Total Current Balance, Total Available Balance, Statements Imported This Month — computed by the mock repository, not in React (per CLAUDE.md's "never calculate... inside React" rule).
- Search: bank name / account name / nickname / last 4 digits, debounced through the existing `list()` query pattern (same shape as Merchants/Categories/Statements).
- Responsive card grid: 1 col mobile, 2 col tablet (`sm`), 3 col laptop (`lg`), 4 col desktop (`xl`) — scales naturally, no fixed row.
- Each card: bank logo (initials avatar), bank name, nickname, account type, last 4, current balance, available balance, monthly credits/debits, top merchant, top category, recent activity (30d count), last sync, health badge.
- Clicking a card opens the shared Entity Drawer (`EntityReviewDrawer`, the same shell Module 6 established) — no navigation, no modal.
- Drawer sections: Account Summary (Bank/Account Name/Nickname-editable/Account Type/Account Number-masked/Status-editable), Financial Overview (Current/Available Balance, Monthly Credits/Debits, Last Sync), Latest Transactions (10, "View All Transactions" → `/transactions?bankAccountId=...`), Statements (imported statements, "View All Statements" → `/statements?accountId=...`), Notes (editable + disabled placeholders for Account Rules / Import Rules / Auto Categorization Rules).
- Add Bank Account dialog: Bank, Account Type, Account Name, Nickname, Account Number, Opening Balance, Status.
- Drill-down reuses the existing `ActiveFilterBanner` mechanism — no second routing implementation (see "Architecture decisions").
- Data layer: `BankAccountRepository` interface + `MockBankAccountRepository`, mock-only, designed so Module 12A only swaps the implementation behind `accounts.service.ts`.

Out of scope, correctly not built: Supabase connection, n8n changes, Credit Cards content (Module 9's own report covers that).

## Components created

**Page-level**

- `src/pages/Accounts.tsx` — composition only: search/drawer/dialog state, wires hooks to reusable components.

**Accounts-specific (`src/components/accounts/`)**

| Component                | Responsibility                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| `AccountsHeader`         | Title, subtitle, Sync All, Link Account                                                                   |
| `AccountSummaryWidget`   | The 4 spec'd KPI cards, built on the existing `KPICard`                                                   |
| `BankAccountHealthBadge` | Healthy / Low Balance / Sync Required / Needs Review badge                                                |
| `BankAccountCard`        | The premium responsive grid card — full field list above, hover/focus states, click-to-open               |
| `BankAccountFormDialog`  | Link Account dialog (Bank, Account Type, Account Name, Nickname, Account Number, Opening Balance, Status) |
| `BankAccountDrawer`      | The 5-section review drawer, composes `EntityReviewDrawer` (reused unchanged from Module 6)               |

## Components/architecture reused (not duplicated)

- `EntityReviewDrawer` / `EntityReviewDrawerFooter` (Module 6) — reused verbatim as the drawer shell; only the section content is Accounts-specific.
- `ActiveFilterBanner`, `KPICard`, `QueryBoundary`, `EmptyState`, `Toast`, `Avatar`/`AvatarFallback`, `Skeleton`, `Select`/`Input`/`Label`/`Textarea`/`Dialog`/`Badge`/`Button` — all reused unmodified.
- `useTransactionsList` / `useStatementsList` — reused inside the drawer for Latest Transactions / Statements sections, filtered by `bankAccountId` / `accountId` respectively — no new fetching logic.
- `formatINR` — reused for every currency value.
- `getBankInitials` (new, `src/utils/bank.ts`) — small shared pure helper for the bank-logo-initials avatar fallback, factored out because Module 9's `CreditCardTile` needs the identical visual (same reasoning CLAUDE.md gives for factoring out anything reused by 2+ modules).

## Domain models reused / extended

- `TransactionAccount` / `AccountKind` (`domain/Account.ts`, pre-existing) — left untouched; `BankAccountRecord`'s `id` intentionally shares the same id space as `mockBankAccounts` so Transactions'/Statements' existing account references resolve to the exact same account this module manages.
- **`BankAccountRecord`** (new, same file) — the full master-data row this module reads/writes: `id, bankName, accountName, nickname, accountType, last4, maskedAccountNumber, currentBalance, availableBalance, monthlyCredits, monthlyDebits, topMerchant, topCategory, recentActivityCount, lastSyncAt, lastTransactionAt, health, status, notes`.
- `BankAccountType`, `BankAccountRecordStatus`, `BankAccountHealth`, `BankAccountFilters`, `BankAccountSort`, `BankAccountListParams`, `BankAccountListResult`, `BankAccountSummary`, `BankAccountCreateInput`, `BankAccountUpdateInput` — new, following the exact interface set every prior module (`Category.ts`, `Merchant.ts`, `Statement.ts`) already establishes.
- `StatementFilters.accountId` (new, additive field) — needed so "View All Statements" can filter by account; `mock-statement.repository.ts`'s `matchesFilters` extended with one line (`statement.account.id !== filters.accountId`).

## Files changed

**New:**

```
src/domain/Account.ts (extended, see above)
src/repositories/bank-account.repository.ts
src/repositories/mock-bank-account.repository.ts
src/repositories/mock-data/generate-bank-accounts.ts
src/services/accounts.service.ts
src/hooks/useAccounts.ts
src/utils/bank.ts
src/components/accounts/*.tsx  (6 files, listed above)
tests/e2e/accounts.spec.ts
```

**Modified:**

```
src/pages/Accounts.tsx           — replaced Module 8's placeholder stub with the full page
src/domain/Statement.ts          — additive `accountId` filter field
src/repositories/mock-statement.repository.ts — accountId matching, one line
src/pages/Statements.tsx         — accountId drill-down banner (same mechanism Transactions.tsx
                                    established for categoryId/merchantId — see below)
src/pages/Transactions.tsx       — DRILL_DOWN_PARAMS extended with `bankAccountId`
src/lib/queryKeys.ts             — added `accounts` query-key namespace
```

## Architecture decisions

1. **Drill-down reused, not reimplemented, in two directions.** Transactions.tsx already had a `DRILL_DOWN_PARAMS` map (`categoryId`, `merchantId`) from Modules 5/6 — Accounts adds one entry (`bankAccountId`) rather than a second mechanism. Statements.tsx had _no_ drill-down mechanism yet, so the identical pattern (captured-once-on-mount state, `ActiveFilterBanner`, clear-and-remove-from-URL) was replicated there for `accountId` — same shape, not a new design, per the spec's explicit "Do NOT implement another routing mechanism."
2. **Repository pattern, identical shape to every prior module.** `BankAccountRepository` → `MockBankAccountRepository` → `accounts.service.ts`. A future `SupabaseBankAccountRepository` only requires changing that one file; no hook or component signature changes.
3. **Health vs. Status are separate concepts, mirroring Merchant's `status` vs. computed intelligence split.** `status` (`active`/`inactive`) is the user-editable administrative state; `health` (`healthy`/`low_balance`/`sync_required`/`needs_review`) is a derived/authored indicator surfaced as a badge — never editable directly, only affected indirectly (e.g. Sync All resolves `sync_required` back to `healthy`).
4. **Mock data is genuinely linked, not fabricated in isolation.** `generate-bank-accounts.ts` reuses the 5 existing bank account ids from `reference-data.ts` (no new ids invented) and derives `monthlyCredits`/`monthlyDebits`/`topMerchant`/`topCategory`/`recentActivityCount`/`lastTransactionAt` by scanning the real `mockTransactions` dataset per account — the same dataset Transactions/Statements/Merchants already read. Only balance/sync/health fields (which have no transaction-level equivalent) are seeded via a deterministic PRNG, the same `mulberry32` pattern every other `generate-*.ts` file already uses.
5. **No pagination UI on the grid.** With 5 bank accounts, a Pagination control would be empty chrome; the repository's `list()` contract still accepts `page`/`pageSize`/`total` (for parity with the eventual SQL view and Module 12A's swap), the page just requests a generous `pageSize` and renders the full result set as a grid. Matches the spec's emphasis on a "responsive grid that scales naturally," not a paginated table.
6. **Sync All is a dedicated mutation** (`useSyncAllBankAccounts`), not a refetch — it updates every account's `lastSyncAt` and resolves any `sync_required` health back to `healthy`, then invalidates the same query keys the rest of the module already uses.

## Testing results

| Check                                                 | Result                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc -b --noEmit`                                 | ✔ Pass                                                                                                                                                                                                                                                                                                                                                                               |
| `npx eslint .`                                        | ✔ 0 errors (6 pre-existing benign warnings, unrelated to this module)                                                                                                                                                                                                                                                                                                                |
| `npm run build`                                       | ✔ Pass — `Accounts` builds as its own lazy-loaded chunk (27.6kB / 7.0kB gzip)                                                                                                                                                                                                                                                                                                        |
| `npx vitest run`                                      | ✔ 14/14 (pre-existing suite, unaffected)                                                                                                                                                                                                                                                                                                                                             |
| `npx playwright test --project=chromium` (full suite) | ✔ 71/71 (48 pre-existing + 23 new Accounts/Credit Cards specs)                                                                                                                                                                                                                                                                                                                       |
| `npx playwright test` (all 3 browsers)                | ✔ 181/213 in one parallel full-suite run; the ~32 firefox/webkit failures were confirmed to be parallel-load flakiness in this sandbox (re-running the same specs at reduced worker count passed 45/46, and the one remaining flake passed 3/3 in isolation) — not a regression, and it affected pre-existing unrelated specs (categories/merchants/statements/transactions) equally |
| Responsive                                            | ✔ Grid verified at 1/2/3/4-column breakpoints                                                                                                                                                                                                                                                                                                                                        |
| Drill-down end-to-end                                 | ✔ "View All Transactions"/"View All Statements" navigate with `bankAccountId`/`accountId` applied, banner shows the correct account label, "Clear" removes the filter and the URL param                                                                                                                                                                                              |
| Keyboard / accessibility                              | ✔ Cards are real `<button>`s with `aria-label`; drawer inherits Base UI's focus trap/Escape/click-outside from `EntityReviewDrawer`                                                                                                                                                                                                                                                  |
| Dark mode                                             | ✔ Only mode exercised (consistent with prior modules)                                                                                                                                                                                                                                                                                                                                |

## Future Supabase integration points

1. Implement `SupabaseBankAccountRepository implements BankAccountRepository` (`list`/`getSummary`/`create`/`update`/`delete`/`syncAll`), backed by the future `accounts` table and a `vw_accounts`/`vw_account_summary` view per CLAUDE.md Part 3.
2. Change one line in `src/services/accounts.service.ts` to construct it instead of `MockBankAccountRepository`.
3. Account Rules / Import Rules / Auto Categorization Rules were removed from the drawer's Notes section during the UI refinement pass below (unused placeholders, not part of current product scope) — reintroduce as real fields on `BankAccountRecord` if/when actually designed, rather than restoring disabled placeholders.

## UI Refinement Pass (2026-08-05)

A follow-up bug-fix/usability pass — no new functionality, no business-logic changes, no architectural changes. Scope: fix every text-overflow/layout defect across Accounts and Credit Cards, bring the two modules to identical visual quality. See `MODULE9_REPORT.md` for the Credit-Cards-side detail; this section covers what's specific to or shared from the Accounts side.

**Root cause found and fixed (shared component, affects the whole app):** `src/styles/index.css` defines custom `--spacing-xs/sm/md/lg/xl` design tokens that — per a comment already in that file — silently shadow Tailwind's built-in `max-w-xs/sm/md/lg/xl` scale. Any component using the named scale (e.g. `sm:max-w-sm`) was resolving to a few pixels of `max-width`, not the intended size, at any viewport ≥640px. Measured live: `ui/dialog.tsx`'s base `sm:max-w-sm` computed to **8px** (not 384px) — confirmed on an untouched, already-shipped dialog (Merchant's "Add Merchant") before touching anything, so this predates this session and affects every dialog in the app, not just Accounts/Credit Cards. Flagged to the project owner before proceeding (a shared-component fix reaching beyond the two modules named in this task); approved to fix broadly, matching the precedent Module 6 already set for fixing a real defect in a shared component (`KPICard`) when found. Fixed by switching to the numbered spacing scale or an arbitrary value everywhere the named scale was used for `max-w-*` (the codebase's own documented remedy):

- `src/components/ui/dialog.tsx` — base `sm:max-w-sm` → `sm:max-w-96` (= 24rem, correct).
- `src/components/EntityReviewDrawer.tsx`, `src/components/statements/StatementDetailsDrawer.tsx`, `src/components/transactions/TransactionDetailsDrawer.tsx` — same fix (`sm:max-w-lg`/`sm:max-w-md` → `sm:max-w-128`/`sm:max-w-112`). Note: `SheetContent`'s own default (`data-[side=right]:sm:max-w-96`) turned out to already out-rank these simple overrides in the CSS cascade — so these three were effectively already rendering at a safe 384px regardless of the broken value, meaning this part of the fix is a correctness/consistency change with no visible effect, not a regression risk.
- `src/components/accounts/BankAccountFormDialog.tsx`, `src/components/credit-cards/CreditCardFormDialog.tsx` (this task's actual "dialog too narrow" reports) — `sm:max-w-lg` → `sm:max-w-128` (= 32rem / 512px), which **does** take effect since these pass their own `className` straight to `DialogContent` with no competing compound-variant default in the way. This is the fix that actually resolves the reported narrow Add-dialog issue.

**KPI value wrapping** — `KPICard` (shared) hardcoded `text-display-kpi` (36px) with `break-all`, which let long crore-value INR strings (e.g. `₹1,77,18,120`) wrap onto a second line inside dense 4–5 column grids instead of overflowing cleanly. Added an optional `valueClassName` prop (defaults to the existing `text-display-kpi`, so every other module's KPI row is visually unchanged) and switched `break-all` → `truncate` (+ a `title` attribute with the full value) so a value can never wrap, only truncate in a genuine extreme case. `AccountSummaryWidget`/`CreditCardSummaryWidget` pass `valueClassName="text-headline-lg sm:text-2xl"` — sized to always fit their grids without wrapping.

**`BankAccountCard` overflow fixes:**

- The health badge (e.g. "NEEDS REVIEW") was getting squeezed/clipped on accounts with a longer bank name — the avatar+name flex block lacked `min-w-0`, so it refused to shrink and pushed the badge past the card's edge. Fixed with `min-w-0 flex-1` on that block, `truncate` added to the bank-name line (previously only the account-name line truncated), and explicit `shrink-0` on the avatar/badge.
- `Current Balance` had the same 36px/break-all wrapping bug as the KPI cards — same fix (`truncate` + a smaller `text-headline-lg` size + `title`).
- Every other value cell (Monthly Credits/Debits, recent-activity/last-sync footer) got `min-w-0`/`truncate` added defensively so no combination of long bank name + large balance can reintroduce clipping.
- The card is now `h-full` with `mt-auto` on the footer row, so cards in the same grid row (which CSS Grid already stretches to equal height) keep their footer pinned to the bottom instead of leaving uneven trailing whitespace when sibling cards have shorter content.

**`BankAccountFormDialog` (Link Bank Account):** widened per the dialog-width fix above; the three paired-field rows (`Bank`/`Account Type`, `Nickname`/`Account Number`, `Opening Balance`/`Status`) changed from an unconditional `grid-cols-2` to `grid-cols-1 sm:grid-cols-2`, so mobile viewports stack fields instead of cramming two per row.

**`BankAccountDrawer`:** removed the Account Rules / Import Rules / Auto Categorization Rules placeholder section entirely (unused, disabled, "coming soon" — not part of current product scope, and their clipped placeholder text was one of the originally reported bugs). Notes (the one real, editable field) is now the drawer's only Section 5 field.

Playwright: `tests/e2e/accounts.spec.ts`'s "shows all five sections with the expected fields" test updated to drop the three removed-placeholder assertions.

## Commits

- `feat(module-8): implement accounts module` (initial)
- `fix(module-8,module-9): ui refinement pass for accounts and credit cards` (this follow-up, report included in the same commit) — one combined commit since the root-cause fix is in shared components (`KPICard`, `ui/dialog.tsx`, `EntityReviewDrawer`) used by both modules; see `MODULE9_REPORT.md` for the identical entry.

Stopping here per instruction. Module 9 (Credit Cards) was built in the same pass — see `MODULE9_REPORT.md`. Not beginning Module 7 or Module 10; awaiting explicit approval before any further module.
