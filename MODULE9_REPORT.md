# MODULE9_REPORT.md

Module 9 — Credit Cards

Generated 2026-08-05. Updated 2026-08-05 with a UI refinement pass (bug-fix/usability only — see "UI Refinement Pass" below). Built together with Module 8 (Accounts) in the same delivery pass, per explicit instruction. See `MODULE8_REPORT.md`'s "Combined build / Financial Accounts tab conflict" section for the full explanation of why this shipped as its own page/route rather than a tab inside Financial Accounts — short version: `PRODUCT_DECISIONS.md` explicitly requires Credit Cards to stay standalone ("Do not merge it into Accounts"), that decision was already reflected in the sidebar (`src/lib/navigation.ts`), and the project owner confirmed keeping them separate when the conflict was flagged before building anything.

---

## Spec compliance summary

- Page header: title "Credit Cards", subtitle "Real-time overview of all connected credit cards.", action Add Credit Card.
- KPI row: Total Credit Cards, Total Credit Limit, Total Outstanding, Total Available Credit, Statements Imported This Month — computed by the mock repository, not in React.
- Search: bank name / card name / nickname / last 4 digits.
- Responsive tile grid: 1 col mobile, 2 col tablet, 3 col laptop, 4 col desktop — same breakpoints as Module 8's grid, scales naturally.
- **Supports 16+ cards**: the existing `reference-data.ts` mock dataset already had exactly 16 credit cards across 10 issuers/3 networks (VISA/Mastercard/AMEX) from Module 3 — verified rendering all 16 as tiles, confirmed via a dedicated Playwright assertion (`toHaveCount(16)`).
- Each tile: bank logo (initials avatar), card name, network, last 4, credit limit, outstanding, available credit, utilization % (with a colored progress bar — green/amber/red by threshold), statement date, due date, minimum due, monthly spend, top merchant, last transaction, health badge.
- Clicking a tile opens the shared Entity Drawer — no navigation, no modal.
- Drawer sections: Card Summary (Bank/Card Name/Network/Last 4-masked/Status-editable/Nickname-editable), Financial Overview (Credit Limit, Outstanding, Available Credit, Utilization, Statement Date, Due Date, Minimum Due), Latest Transactions (10, "View All Transactions" → `/transactions?creditCardId=...`), Statements ("View All Statements" → `/statements?accountId=...`), Notes (editable + disabled placeholders for Rewards / Offers / AutoPay / Card Rules).
- Add Credit Card dialog: Bank, Card Name, Network, Last 4 Digits, Credit Limit, Statement Date, Due Date, Status.
- Drill-down reuses the existing `ActiveFilterBanner` mechanism.
- Data layer: `CreditCardRepository` interface + `MockCreditCardRepository`, mock-only, designed so Module 12A only swaps the implementation behind `credit-cards.service.ts`.

## Components created

**Page-level**

- `src/pages/CreditCards.tsx` — composition only, replaces the Module 2-era placeholder stub.

**Credit-Cards-specific (`src/components/credit-cards/`)**

| Component                 | Responsibility                                                                                               |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `CreditCardsHeader`       | Title, subtitle, Add Credit Card                                                                             |
| `CreditCardSummaryWidget` | The 5 spec'd KPI cards, built on the existing `KPICard`                                                      |
| `CreditCardHealthBadge`   | Healthy / Due Soon / High Utilization / Payment Overdue badge                                                |
| `CreditCardTile`          | The premium responsive grid tile — full field list above, network badge, utilization bar, hover/focus states |
| `CreditCardFormDialog`    | Add Credit Card dialog                                                                                       |
| `CreditCardDrawer`        | The 5-section review drawer, composes `EntityReviewDrawer`                                                   |

## Components/architecture reused (not duplicated)

- `EntityReviewDrawer` / `EntityReviewDrawerFooter` (Module 6) — reused verbatim.
- `ActiveFilterBanner`, `KPICard`, `QueryBoundary`, `EmptyState`, `Toast`, `Avatar`/`AvatarFallback`, `Skeleton`, `Select`/`Input`/`Label`/`Textarea`/`Dialog`/`Badge`/`Button` — all reused unmodified.
- `getBankInitials` (`src/utils/bank.ts`) — reused as-is from Module 8; this is the second consumer that justified factoring it out as a shared util in the first place rather than duplicating it per-module.
- `useTransactionsList` / `useStatementsList` — reused inside the drawer, filtered by `creditCardId` / `accountId`.
- `KNOWN_CARD_NETWORKS` / `CardNetwork` (pre-existing in `domain/CreditCard.ts`) — reused for the network Select in the Add dialog rather than a new enum.
- `formatINR` — reused for every currency value.

## Domain models reused / extended

- `CardNetwork` / `KNOWN_CARD_NETWORKS` (pre-existing) — untouched.
- **`CreditCardRecord`** (new, same file) — the full master-data row: `id, bankName, cardName, nickname, network, last4, maskedNumber, creditLimit, outstanding, availableCredit, utilizationPercent, statementDate, dueDate, minimumDue, monthlySpend, topMerchant, topCategory, lastTransactionAt, health, status, notes`. Its `id` intentionally shares the same id space as `mockCreditCards`, so Transactions'/Statements' existing `creditCardId`/`accountId` references resolve to the exact same card this module manages.
- `CreditCardRecordStatus`, `CreditCardHealth`, `CreditCardFilters`, `CreditCardSort`, `CreditCardListParams`, `CreditCardListResult`, `CreditCardSummary`, `CreditCardCreateInput`, `CreditCardUpdateInput` — new, following the same interface set every prior module establishes.
- The file's own header comment previously said _"Do not add speculative fields (credit limit, statement date, rewards, etc.) here until Module 6 is actually scoped"_ — that comment referred to what later became Module 9 in the finalized roadmap; this module is exactly that scoping, so the comment was updated rather than left stale.

## Files changed

**New:**

```
src/domain/CreditCard.ts (extended, see above)
src/repositories/credit-card.repository.ts
src/repositories/mock-credit-card.repository.ts
src/repositories/mock-data/generate-credit-cards.ts
src/services/credit-cards.service.ts
src/hooks/useCreditCards.ts
src/components/credit-cards/*.tsx  (6 files, listed above)
tests/e2e/credit-cards.spec.ts
```

**Modified:**

```
src/pages/CreditCards.tsx   — replaced the Module 2-era placeholder stub with the full page
src/pages/Transactions.tsx — DRILL_DOWN_PARAMS extended with `creditCardId`
                              (bankAccountId was added in the same edit — see MODULE8_REPORT.md;
                              both entries were added together since the two modules were built
                              in one pass, per instruction)
src/lib/queryKeys.ts       — added `creditCards` query-key namespace
```

Statements.tsx's `accountId` drill-down and `StatementFilters.accountId` (needed by this module's "View All Statements") were added as part of Module 8's commit — see `MODULE8_REPORT.md`, since Accounts needed the same mechanism first and it's identical infrastructure, not duplicated per module.

## Architecture decisions

1. **Utilization-driven mock health, not independently random.** `generate-credit-cards.ts` first picks a `health` value via a seeded weighted random (mirroring every other `generate-*.ts` file's pattern), then derives `utilizationPercent` and `dueDate` from a range tied to that health (e.g. `high_utilization` → 75–98%, `payment_overdue` → due date in the past) — so the badge and the numbers it's summarizing always agree, rather than being generated independently and occasionally contradicting each other.
2. **Repository pattern, identical shape to Module 8 and every prior module.** `CreditCardRepository` → `MockCreditCardRepository` → `credit-cards.service.ts`.
3. **Card names are hand-authored, not slug-derived**, for all 16 existing card ids (e.g. `cc-hdfc-corp-plat` → "HDFC Corporate Platinum") — reads as real connected cards rather than mechanically generated labels, matching the same "linked to real data" bar Module 8 set for bank accounts.
4. **Same grid/pagination decision as Module 8**: no Pagination UI, the repository's `list()` still accepts `page`/`pageSize` for parity with the future SQL view, and the page renders the full 16-card result set as a responsive grid — matches the spec's explicit "must scale as more cards are added," and 16 cards fit comfortably in a 4-column grid without needing pagination chrome.

## Testing results

| Check                                                 | Result                                                                                                                                                                                                                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx tsc -b --noEmit`                                 | ✔ Pass                                                                                                                                                                                                                                                     |
| `npx eslint .`                                        | ✔ 0 errors (6 pre-existing benign warnings, unrelated to this module)                                                                                                                                                                                      |
| `npm run build`                                       | ✔ Pass — `CreditCards` builds as its own lazy-loaded chunk (28.5kB / 7.4kB gzip)                                                                                                                                                                           |
| `npx vitest run`                                      | ✔ 14/14 (pre-existing suite, unaffected)                                                                                                                                                                                                                   |
| `npx playwright test --project=chromium` (full suite) | ✔ 71/71 (48 pre-existing + 23 new Accounts/Credit Cards specs, including `toHaveCount(16)` on the tile grid)                                                                                                                                               |
| `npx playwright test` (all 3 browsers)                | ✔ 181/213 in one full parallel run; firefox/webkit failures confirmed as sandbox parallel-load flakiness, not a regression — see `MODULE8_REPORT.md`'s Testing table for the isolation re-run details (also affected pre-existing unrelated specs equally) |
| Responsive                                            | ✔ Grid verified at 1/2/3/4-column breakpoints, all 16 tiles render correctly at each                                                                                                                                                                       |
| Drill-down end-to-end                                 | ✔ "View All Transactions"/"View All Statements" navigate with `creditCardId`/`accountId` applied, banner shows the correct card label                                                                                                                      |
| Keyboard / accessibility                              | ✔ Tiles are real `<button>`s with `aria-label`; drawer inherits Base UI's focus trap/Escape/click-outside                                                                                                                                                  |
| Dark mode                                             | ✔ Only mode exercised                                                                                                                                                                                                                                      |

## Future Supabase integration points

1. Implement `SupabaseCreditCardRepository implements CreditCardRepository`, backed by the future `accounts` table (shared with bank accounts, per CLAUDE.md's `accounts`/`credit_cards` distinction being a `kind` discriminator at the data layer, not necessarily two tables) and a credit-card-specific view.
2. Change one line in `src/services/credit-cards.service.ts` to construct it instead of `MockCreditCardRepository`.
3. Rewards / Offers / AutoPay / Card Rules were removed from the drawer's Notes section during the UI refinement pass below (unused placeholders, not part of current product scope) — reintroduce as real fields on `CreditCardRecord` if/when actually designed, rather than restoring disabled placeholders.

## UI Refinement Pass (2026-08-05)

A follow-up bug-fix/usability pass — no new functionality, no business-logic changes, no architectural changes. Full root-cause writeup is in `MODULE8_REPORT.md` (the shared-component fix is identical for both modules); this section covers what's specific to the Credit Cards side.

**Root cause (shared, see `MODULE8_REPORT.md` for detail):** `src/styles/index.css`'s custom `--spacing-*` design tokens shadow Tailwind's named `max-w-xs/sm/md/lg/xl` scale, silently collapsing any dialog/drawer using it to a few pixels of `max-width` at ≥640px viewports — confirmed on Merchant's pre-existing "Add Merchant" dialog, i.e. predates this session and affects the whole app. Fixed in the shared `ui/dialog.tsx`, `EntityReviewDrawer.tsx`, `StatementDetailsDrawer.tsx`, and `TransactionDetailsDrawer.tsx` by switching to the numbered spacing scale (`max-w-96`/`max-w-128`/`max-w-112`) per the codebase's own documented remedy for this exact collision. Approved by the project owner as an intentional expansion beyond the two named modules, since it's a genuine pre-existing defect with a trivial, non-breaking fix (same precedent as Module 6's `KPICard` fix).

**`CreditCardFormDialog` (Add Credit Card)** — this is the actual "dialog too narrow" bug reported for this module. Fixed the same way as `BankAccountFormDialog`: `sm:max-w-lg` (broken — resolved to 24px, not 512px, due to the token collision above) → `sm:max-w-128` (= 32rem / 512px, correct); the three paired-field rows (`Bank`/`Network`, `Last 4 Digits`/`Credit Limit`, `Statement Date`/`Due Date`) changed from unconditional `grid-cols-2` to `grid-cols-1 sm:grid-cols-2` so mobile stacks instead of cramming.

**`CreditCardTile` overflow fixes** (mirrors `BankAccountCard`'s fixes exactly, for "the two modules should feel identical in quality"):

- Health badge (e.g. "PAYMENT OVERDUE", "HIGH UTILIZATION") was getting squeezed/clipped on cards with a longer bank/card name — same root cause as `BankAccountCard`: the avatar+name flex block lacked `min-w-0`. Fixed with `min-w-0 flex-1` + `shrink-0` on the avatar/badge + `truncate` added to the bank-name line.
- `Outstanding` had the same 36px/`break-all` wrapping bug the KPI cards had — fixed with `truncate` + a smaller `text-headline-lg` size + a `title` attribute with the full value.
- Network badge/last-4 row, utilization %, Limit/Available row, the Statement Date/Due Date/Minimum Due/Monthly Spend grid, and the Top-merchant/Last-transaction footer all got `min-w-0`/`truncate`/`shrink-0` added defensively.
- Tile is now `h-full` with `mt-auto` on the footer row, matching `BankAccountCard`'s fix, so all 16 tiles in a row keep consistent height and footer alignment regardless of how much each card's content varies.

**KPI value wrapping** — `CreditCardSummaryWidget` (5-column grid, the densest KPI row in the app) now passes `KPICard`'s new `valueClassName="text-headline-lg sm:text-2xl"` (see `MODULE8_REPORT.md` for the shared `KPICard` fix itself) so values like `₹1,77,18,120` never wrap.

**`CreditCardDrawer`:** removed the Rewards / Offers / AutoPay / Card Rules placeholder section entirely (unused, disabled, "coming soon" — not part of current product scope, and their clipped placeholder text was one of the originally reported bugs). Notes (the one real, editable field) is now the drawer's only Section 5 field.

Playwright: `tests/e2e/credit-cards.spec.ts`'s "shows all five sections with the expected fields" test updated to drop the four removed-placeholder assertions.

**Verification:** re-ran the full quality gate after all fixes — `tsc -b --noEmit` clean, `eslint` 0 errors (same 6 pre-existing benign warnings), `npm run build` clean, `vitest run` 14/14, `playwright --project=chromium` 71/71 (3 incidental failures on the first full-suite run — `accounts.spec.ts`'s drawer-open test, `categories.spec.ts`'s search test, `merchants.spec.ts`'s sort test — all reproduced as sandbox parallel-load flakiness and passed 4/4 when re-run in isolation at reduced worker count, not a regression). Also captured before/after Playwright screenshots at desktop (1600px) / laptop (1280px) / tablet (834px) / mobile (390px) for both modules' pages, dialogs, and drawers; confirmed `document.documentElement.scrollWidth === clientWidth` (no horizontal overflow) at all four breakpoints both before and after.

## Commits

- `feat(module-9): implement credit cards module` (initial)
- `fix(module-8,module-9): ui refinement pass for accounts and credit cards` (this follow-up, report included in the same commit) — one combined commit since the root-cause fix is in shared components (`KPICard`, `ui/dialog.tsx`, `EntityReviewDrawer`, `StatementDetailsDrawer`, `TransactionDetailsDrawer`) used by both modules and beyond; see `MODULE8_REPORT.md` for the identical entry.

Stopping here per instruction. Not beginning Module 7 or Module 10; awaiting explicit approval before any further module.
