# DOMAIN_ARCHITECTURE_REPORT.md

Pre-Module-4 domain architecture verification.

Generated 2026-08-02.

Result: **all 6 checks pass — no issues found, no fixes required.**

---

## 1. Every business entity exists only once in `src/domain`

```
src/domain/
  Account.ts      — AccountKind, AccountStatus, TransactionAccount, ConnectedAccount
  Category.ts     — Category
  Client.ts       — Client
  CreditCard.ts   — KNOWN_CARD_NETWORKS, CardNetwork
  Dashboard.ts    — TrendDirection, TrendTone, Trend, FinancialSnapshotMetric,
                    ResolutionReason, ResolutionQueueItem, RecentTransactionStatus,
                    RecentTransaction, QuickAction
  Merchant.ts     — Merchant
  Statement.ts    — (intentionally empty placeholder — Module 5 not yet scoped)
  Transaction.ts  — TransactionStatus, OwnerType, TransactionType, Transaction,
                    TransactionFilters, TransactionSort, TransactionListParams,
                    TransactionListResult, TransactionPatch, TransactionCreateInput
```

No entity name is defined in more than one domain file. ✔ Pass.

## 2. No interfaces duplicated anywhere else in the repository

Listed every top-level `export interface` / `export type` / `export enum` outside `src/domain/` and outside `src/components/ui/` (third-party shadcn primitives, not project domain code):

```
src/components/Breadcrumbs.tsx:      BreadcrumbItem
src/repositories/transaction.repository.ts:  TransactionRepository
src/stores/theme.store.ts:           ThemeMode
src/types/nav.ts:                    NavItem
```

None of these names collide with anything in `src/domain/`, and none represent a financial/business entity — they're UI-shell (`NavItem`, `BreadcrumbItem`), app-state (`ThemeMode`), or a repository _contract_ (`TransactionRepository`, which describes behavior, not data shape — it references domain types, it doesn't redefine them). ✔ Pass.

## 3. No components import from `src/types`

```
grep -rl "@/types" src/components/   →   (no matches)
```

Zero files under `src/components/` import from `@/types`. Two files elsewhere still import `NavItem` from `@/types/nav` — `src/layouts/Sidebar.tsx` and `src/lib/navigation.ts` — both outside `src/components/`, and both for a UI-shell nav type that was never part of the financial domain scope (correctly left out of the domain layer). ✔ Pass.

## 4. No unused interfaces, enums, or domain models

Checked every symbol exported from `src/domain/` for usage. Everything is used — either directly by components/hooks/repositories/services outside `domain/` (e.g. `Transaction` in 18 files, `Merchant` in 15, `Client` in 14, `Category` in 13), or as a field type inside another domain interface that is itself consumed externally (e.g. `AccountKind`/`AccountStatus` are field types on `TransactionAccount`/`ConnectedAccount`, which are used in 6 and 3 external files respectively; `TrendDirection`/`TrendTone`/`Trend` are field types on `FinancialSnapshotMetric`, used in 3 external files; `TransactionType` is a field type on `Transaction`/`TransactionFilters`/`TransactionCreateInput`, all used externally). `tsconfig.app.json` also has `noUnusedLocals: true`, and `tsc -b --noEmit` is clean, which independently confirms no dead imports anywhere in the project. ✔ Pass — nothing removed, because nothing was found unused.

## 5. Path aliases resolve correctly

`@/*` → `./src/*` is configured identically in both `tsconfig.json`/`tsconfig.app.json` and `vite.config.ts`'s `resolve.alias`. Verified empirically, not just by reading config:

| Check                                    | Result                                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                    | ✔ Pass (every `@/domain/*` and other alias import resolves)                             |
| `npm run build`                          | ✔ Pass (Vite's resolver agrees — production bundle built clean)                         |
| `npx eslint .`                           | ✔ 0 errors (same 3 pre-existing benign warnings as prior reports, unrelated to aliases) |
| `npx vitest run`                         | ✔ 7/7                                                                                   |
| `npx playwright test --project=chromium` | ✔ 10/10                                                                                 |

✔ Pass.

## 6. Future modules can reuse current domain models without structural changes

Reviewed each upcoming module against what already exists:

| Future module        | Reuses                                                                                  | Why no structural change is needed                                                                                                                                                                                                           |
| -------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Statements** (4)   | `Statement.ts` (empty scaffold)                                                         | File already exists at the stable import path future code will use; no other file depends on it being empty, so populating it is purely additive.                                                                                            |
| **Accounts** (5)     | `Account.ts` (`TransactionAccount`, `ConnectedAccount`, `AccountKind`, `AccountStatus`) | Both a compact reference shape and a richer summary-card shape already exist. A full Accounts module will likely add optional fields (IFSC, opening balance, account nickname) — additive to an existing interface, not a redesign.          |
| **Credit Cards** (6) | `Account.ts` + `CreditCard.ts` (`CardNetwork`)                                          | Credit cards are already modeled as `TransactionAccount`/`ConnectedAccount` with `kind: 'credit_card'`; `CreditCard.ts` is the natural home for card-specific additions (credit limit, statement date, rewards) when scoped — additive only. |
| **Categories** (7)   | `Category.ts`                                                                           | Current `{ id, name }` shape is a strict subset of any richer version (hierarchy, color, budget) a full Categories module would add — additive.                                                                                              |
| **Merchants** (8)    | `Merchant.ts`                                                                           | Same reasoning — CLAUDE.md's Merchant Center wants aliases/confidence score/notes on top of the existing `{ id, name }`, all additive fields.                                                                                                |
| **Clients** (9)      | `Client.ts`                                                                             | Same reasoning — a full Clients module adding contact info, billing details, etc. extends `{ id, name }` without breaking any of the 14 files already consuming it.                                                                          |
| **Analytics** (10)   | `Transaction.ts`, `Category.ts`, `Merchant.ts`, `Account.ts`                            | Analytics aggregates by category/merchant/account — all of which already expose stable `id`/`name` identity fields suitable for grouping; no new domain shape is required to start building charts against existing data.                    |

No future module requires renaming, splitting, or restructuring an existing domain interface — every anticipated addition is additive (new optional fields or new sibling interfaces in the same file), which matches how `domain/Account.ts` and `domain/CreditCard.ts` were already designed to grow. ✔ Pass.

## Fixes applied this pass

None. All 6 checks passed on first verification — no structural drift occurred since the `chore: establish shared domain architecture and project roadmap` commit.
