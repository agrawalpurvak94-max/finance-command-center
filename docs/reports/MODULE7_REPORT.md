# MODULE7_REPORT.md

Module 7 — Clients ("Client Management")

Generated 2026-08-06.

---

## Spec compliance summary

- Page header: title "Client Management", subtitle "Manage financial entities linked to transactions, accounts and statements.", actions Add Client + Export.
- KPI row: Total Clients, Total Spent (replaces the Stitch export's "Active Revenue" per explicit instruction), Clients Requiring Review (count of `pending`-status clients), Active Clients — computed by the mock repository, not in React.
- Search: client name / company / email / phone.
- Filters: Client Type, Status, Category (a client's top spending category), Date Added (range) — Apply/Clear, built on the existing `FilterChip` (same component Merchants/Statements already use).
- Table columns, in spec order: Client, Email, Company, Phone, Status, Total Spend, Transactions, Accounts, Cards, Created Date, Actions.
- Clicking anywhere on a row (or the client's name, or "Review Client" in the row menu) opens the shared Entity Drawer — no navigation, no modal. Search/filters/pagination/scroll position are preserved because the drawer is an overlay on the same page, not a route change.
- Drawer: 7 sections exactly as specified — Client Profile (editable Name/Company/Email/Phone/Status, read-only Client Type + a "Current Status" badge mirroring the persisted value), Financial Summary (Total Spend, Total Transactions, Linked Accounts, Linked Credit Cards, Linked Statements, First/Last Transaction), Top Categories, Top Merchants, Recent Transactions (latest 10, "View All Transactions"), Statements ("View All Statements"), Notes (editable + no unused placeholders — see "Architecture decisions").
- Add Client dialog: Client Name, Client Type, Company, Email, Phone, Status, Notes.
- Edit Client: Name, Company, Email, Phone, Status, Notes editable; Client Type is intentionally **not** editable post-creation (disabled Select in edit mode) — matches the spec's Edit Client field list, which omits Client Type where Add Client includes it.
- Delete Client: confirmation dialog that warns with the specific counts when the client has associated transactions/accounts/credit cards/statements. Future placeholder: Soft Delete (see "Future Supabase integration points").
- Drill-down: View Transactions / View Statements / View Accounts / View Credit Cards, all reusing the existing `ActiveFilterBanner` mechanism, no new routing implementation.
- Data layer: `ClientRepository` interface + `MockClientRepository`, mock-only, designed so Module 12A only swaps the implementation behind `clients.service.ts`.

## Cross-module extension required for "View Accounts" / "View Credit Cards"

The spec's drill-down section explicitly requires the Client drawer to link into Accounts and Credit Cards with a client filter applied, "reusing the same routing and filtering pattern already established." Modules 8/9's `BankAccountRecord`/`CreditCardRecord` had no client association at all (accounts/cards belong to the business generally, not any client) — so satisfying this literally required extending those two already-shipped domain models, not just adding a new page.

This was treated as in-scope, additive extension (not a redesign) for the same reason Module 8 was allowed to add `accountId` to `StatementFilters`: a small, backward-compatible field addition needed to satisfy an explicit spec requirement, following the exact established pattern rather than inventing a new one. Concretely:

- `BankAccountRecord.clientId: string | null` / `CreditCardRecord.clientId: string | null` (new, nullable — most accounts/cards stay unassigned).
- `BankAccountFilters.clientId?` / `CreditCardFilters.clientId?` (new, optional).
- `mock-bank-account.repository.ts` / `mock-credit-card.repository.ts` — one line each in `matchesFilters`.
- `generate-bank-accounts.ts` / `generate-credit-cards.ts` — one account and five cards assigned to a client (out of 5 accounts / 16 cards) so the drill-down has real rows to show, rather than every client always landing on an empty Accounts/Credit Cards page.
- `Accounts.tsx` / `CreditCards.tsx` — neither page had **any** filter or drill-down mechanism before this module (only search). Both gained the same URL-param-driven drill-down pattern Statements.tsx already used for `accountId` (captured-once-on-mount state, `ActiveFilterBanner`, clear-and-remove-from-URL) — not a new mechanism, the same one applied a second and third time.
- `BankAccountCreateInput`/`CreditCardCreateInput` were **not** touched — Add Account/Add Credit Card still don't have a Client field, since neither Module 8's nor Module 9's spec asked for one and adding it wasn't necessary to satisfy this module's drill-down requirement (new accounts/cards are simply unassigned, `clientId: null`, until edited via a future capability).

## Components created

**Page-level**

- `src/pages/Clients.tsx` — composition only: search/filter/sort/pagination/dialog/drawer state, wires hooks to reusable components. No business logic inline.

**Clients-specific (`src/components/clients/`)**

| Component              | Responsibility                                                                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `ClientsHeader`        | Title, subtitle, Export, Add Client                                                                                                            |
| `ClientSummaryWidget`  | The 4 spec'd KPI cards, built on `KPICard` (using its `valueClassName` override from the Module 8/9 UI refinement pass, so numbers never wrap) |
| `ClientFilters`        | Client Type / Status / Category / Date Added (range) + Apply/Clear, built on the generic `FilterChip`                                          |
| `ClientStatusBadge`    | Active / Pending / Suspended badge                                                                                                             |
| `ClientTable`          | TanStack Table instance: sticky header, sortable columns, avatar-initials name cell, horizontal-scroll wrapper                                 |
| `ClientTableSkeleton`  | Table-shaped loading skeleton                                                                                                                  |
| `ClientRowActionsMenu` | Primary "View Transactions" icon button + secondary Review/Edit/Delete dropdown                                                                |
| `ClientFormDialog`     | Reusable Add/Edit dialog (Name, Client Type [disabled in edit mode], Company, Email, Phone, Status, Notes)                                     |
| `ClientDrawer`         | The 7-section review drawer, composes `EntityReviewDrawer`                                                                                     |

No new generic/shared components were needed — `EntityReviewDrawer`, `ActiveFilterBanner`, `KPICard`, `FilterChip`, `getBankInitials`, and every shadcn primitive were already in place from Modules 6/8/9.

## Components/architecture reused (not duplicated)

- `EntityReviewDrawer` / `EntityReviewDrawerFooter` (Module 6) — reused verbatim; the drawer shell is identical across Merchant/Account/Credit-Card/Client.
- `ActiveFilterBanner`, `KPICard` (incl. its `valueClassName` prop), `QueryBoundary`, `EmptyState`, `Pagination`, `ConfirmDialog`, `Toast`, `FilterChip`, `Avatar`/`AvatarFallback`, `Skeleton`, `Select`/`Input`/`Label`/`Textarea`/`Dialog`/`DropdownMenu`/`Badge`/`Button` — all reused unmodified.
- `getBankInitials` (`src/utils/bank.ts`, Module 8) — reused for the client-name avatar, same visual treatment as bank/card logos.
- `useTransactionsList` / `useStatementsList` — reused inside the drawer for Recent Transactions / Statements, filtered by `clientId` (a field that already existed on both filter types before this module).
- `useTransactionCategories` — reused for the Category filter's option list (a client's top spending category), same "shared master data" reasoning Merchants/Categories already established.
- `formatINR` — reused for every currency value.
- `downloadCsv` + `rowsToCsv` — reused as-is; `clientsToCsv` added alongside `transactionsToCsv`/`categoriesToCsv`/`merchantsToCsv` through the same shared helper.

## Domain models reused / extended

- `Client` (`{id, name}`, pre-existing) — left untouched; still embedded in `Transaction.client`/`Statement.client` and returned by `TransactionRepository.listClients()`.
- **`ClientRecord`** (new, same file) — the full master-data row: `id, name, clientType, company, email, phone, status, notes, totalSpend, transactionCount, linkedAccountsCount, linkedCreditCardsCount, linkedStatementsCount, topCategories, topMerchants, firstTransactionAt, lastTransactionAt, createdAt`.
- `ClientType` (`personal | family_member | company | business_unit | trust`), `ClientRecordStatus` (`active | pending | suspended` — matching the Stitch reference exactly), `ClientCategorySpend`, `ClientMerchantSpend`, `ClientFilters`, `ClientSort`, `ClientListParams`, `ClientListResult`, `ClientSummary`, `ClientCreateInput`, `ClientUpdateInput` — new, following the exact interface set every prior module establishes.
- `TransactionFilters.clientId` / `StatementFilters.clientId` — already existed before this module; no change needed, just consumed.
- `BankAccountRecord.clientId` / `CreditCardRecord.clientId` and their `Filters.clientId` — new, see "Cross-module extension" above.

## Drawer behaviour

Identical interaction model to Merchant/Account/Credit-Card drawers, per the explicit "shell must remain identical" instruction:

- Opens via row click, name click, or "Review Client" menu item — all three funnel through the same `handleReviewClient`, matching Merchant Center's precedent.
- Row clicks on interactive cells (row action buttons, the "..." menu) do not also open the drawer — the row's own `onClick` checks `event.target.closest('button, [role="combobox"], [role="menuitem"]')`.
- Section 1's Name/Company/Email/Phone/Status are live-editable `Input`/`Select` fields seeded from props (the drawer body only mounts while `open && client`, so switching clients or reopening after a cancelled edit always starts from a fresh, correctly-seeded instance — no reset-via-`useEffect`).
- "Save Changes" calls the existing `useUpdateClient()` mutation, closes the drawer, and shows a `Toast` — no drawer-specific mutation or endpoint.
- "Cancel" / Escape / click-outside all discard the draft without saving (inherited from `EntityReviewDrawer`/Base UI's `Dialog` primitive underlying `Sheet`).
- Focus restoration to the triggering row, and scroll-position preservation across open/close, both use the same pattern documented in `MODULE8_REPORT.md`/Merchants' report: a captured client **id** (not a DOM ref, since re-renders remount table cells) resolved back to a live `[data-client-row-trigger]` element in `onClosed`, plus an explicitly saved/restored `window.scrollY` (Base UI's own Sheet scroll-lock clamps it and never un-clamps).
- The reviewed row stays visually highlighted (`bg-accent/60`) via a `selectedClientId` prop, same as Merchant/Account/Credit-Card tables/cards.

## Navigation behaviour

Every "View X" action in the drawer navigates via `react-router`'s `useNavigate`, appending a query param the destination page's existing drill-down mechanism already reads on mount:

| Drawer action                                                                       | Destination     | Query param |
| ----------------------------------------------------------------------------------- | --------------- | ----------- |
| View Transactions (row icon + drawer)                                               | `/transactions` | `clientId`  |
| View All Statements                                                                 | `/statements`   | `clientId`  |
| View Accounts (Financial Summary, shown only when `linkedAccountsCount > 0`)        | `/accounts`     | `clientId`  |
| View Credit Cards (Financial Summary, shown only when `linkedCreditCardsCount > 0`) | `/credit-cards` | `clientId`  |

Each destination page reads the param once on mount, applies it as a filter, and renders `ActiveFilterBanner` with a "Clear" action that removes both the applied filter and the URL param (`replace: true`, so it doesn't add a back-button entry). No new drill-down implementation was written — `clientId` is one more entry in Transactions.tsx's existing `DRILL_DOWN_PARAMS` map and Statements.tsx's now-generalized one (see "Architecture decisions"), and the same small map pattern was newly applied (not redesigned) to Accounts.tsx/CreditCards.tsx.

## Repository interfaces

```ts
export interface ClientRepository {
  list(params: ClientListParams): Promise<ClientListResult>
  getSummary(): Promise<ClientSummary>
  create(input: ClientCreateInput): Promise<ClientRecord>
  update(id: string, input: ClientUpdateInput): Promise<ClientRecord>
  delete(id: string): Promise<void>
}
```

`MockClientRepository` implements this over an in-memory array seeded from `mockClientRecords` (`generate-clients.ts`), with the same `withLatency()` simulated-network-delay pattern every other mock repository uses. `delete()` is a hard removal in the mock (per-spec, "Soft Delete" is an explicit future placeholder, not built now) — the UI-level warning in `ConfirmDialog` is informational, not a repository-level block.

## Testing results

| Check                                                              | Result                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                              | ✔ Pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npx eslint .`                                                     | ✔ 0 errors (7 pre-existing-class benign warnings: `useReactTable` React Compiler notices on every table incl. the new `ClientTable`, `react-refresh/only-export-components` on `badge.tsx`/`button.tsx`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run build`                                                    | ✔ Pass — `Clients` builds as its own lazy-loaded chunk                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npx vitest run`                                                   | ✔ 14/14 (pre-existing suite, unaffected)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npx playwright test tests/e2e/clients.spec.ts --project=chromium` | ✔ 23/23 (search, KPI row, table columns, row actions, Add/Edit/Delete dialogs, sorting, and 11 drawer specs incl. all 4 drill-down destinations)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npx playwright test --project=chromium` (full suite)              | ✔ 94/94 clean once the Vite dev-server cache was warm. Root-caused (not just re-run until green): the first pass after this module's edits landed showed several `accounts.spec.ts` tests timing out in `beforeEach` at exactly 30s. Measured directly — a single cold `/accounts` load (Vite transforming that route's dependency graph for the first time after the source changes) took ~13s; with 8 parallel workers each cold-compiling a different route against the same single-threaded dev server, whichever test landed first could exceed the 30s budget. Re-running after one warm-up navigation: 12/12 passed, then the full 94-test suite passed clean in one pass. Not an app regression — a Vite-dev-mode/parallel-E2E interaction, reproducible and explained, not merely dismissed |
| Responsive                                                         | ✔ Table wrapped in the existing horizontal-scroll container (same pattern as Merchant/Category/Statement/Transaction tables); dialog/drawer widths use the corrected numbered spacing scale from the Module 8/9 UI refinement pass                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Drill-down end-to-end                                              | ✔ All four destinations (Transactions/Statements/Accounts/Credit Cards) verified: correct query param, correct banner label, "Clear" removes the filter and the URL param                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Keyboard / accessibility                                           | ✔ Inherited from Base UI's accessible primitives — same pattern as every prior module                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Dark mode                                                          | ✔ Only mode exercised (consistent with all prior modules)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

Two test-authoring bugs (not app bugs) were caught while writing `clients.spec.ts`: `.innerText()` on a name cell picked up the avatar-initials text ahead of the client name (fixed by scoping to the name `<button>` specifically), and a drill-down test tried to use `page.goBack()` to restore the drawer's open state after navigating to Accounts — local component state isn't part of the URL, so it doesn't survive a route change; split into two independent fresh-navigation tests instead.

## Future Supabase integration points

1. Implement `SupabaseClientRepository implements ClientRepository`, backed by a future `clients` table and a `vw_clients`/`vw_client_summary` view per CLAUDE.md Part 3 (spend/transaction aggregates computed server-side, same "never calculate inside React" rule the mock repository's in-memory aggregation stands in for today).
2. Change one line in `src/services/clients.service.ts` to construct it instead of `MockClientRepository`.
3. Soft Delete is an explicit future placeholder — today's `delete()` is a hard removal; when scoped, it should set a `deletedAt`/`status`-style flag instead and the list query should exclude soft-deleted rows server-side.
4. Client Rules / Default Categories / Automation Rules are explicit future placeholders per the spec — no fields exist on `ClientRecord` for them yet; deliberately not built as disabled UI placeholders in the drawer, since the Module 8/9 UI refinement pass established that unused disabled placeholders should be removed, not added (see `MODULE8_REPORT.md`/`MODULE9_REPORT.md`'s "UI Refinement Pass" sections) — Notes is the drawer's only Section 7 field.
5. `BankAccountCreateInput`/`CreditCardCreateInput` have no Client field yet (see "Cross-module extension" above) — add one if/when Add Account/Add Credit Card need to assign a client at creation time rather than only via drill-down-eligible pre-seeded data.

## Commits

This module's commit: `feat(module-7): implement clients module` (report included in the same commit, per the Module Completion Git Protocol).

Stopping here per instruction. Not beginning Module 10; awaiting explicit approval before any further module.
