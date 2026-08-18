# DATABASE_READINESS.md

Readiness assessment for Module 12A (Supabase Integration) based on [SUPABASE_AUDIT.md](SUPABASE_AUDIT.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), and [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md). This is an assessment only — no schema changes, migrations, or application code changes were made to produce it.

**Bottom line: not ready to start Module 12A as a full cutover.** The blockers below are concentrated enough that a module-by-module, incremental approach (matching CLAUDE.md's own "reuse... one module at a time" philosophy) is the realistic path, not a single big-bang swap.

---

## Readiness by Category

### 1. Security (RLS) — 🔴 Unknown, highest-priority gate

Whether Row Level Security is enabled on any of the 10 writable tables could not be determined via REST (§7 of the audit). This was checked with a `service_role` key, which bypasses RLS regardless of what's configured — so the audit's successful reads prove nothing about how these tables will behave for the `anon`/`authenticated` key the frontend will actually ship with.

**Why this blocks everything else:** if RLS is off, swapping in a live Supabase repository before verifying this could expose all financial data to any holder of the anon key. If RLS is on but misconfigured, the frontend could get empty results everywhere and look like a regression. Either way, this needs to be the _first_ thing confirmed with direct database access — not discovered during Module 12A implementation.

### 2. Structural completeness (schema vs. domain models) — 🟡 Partial, per-entity

Per [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md)'s summary table:

| Entity                                                 | Verdict                                                                                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Transaction` (core ledger)                            | 🔴 Blocked — `account` is non-nullable in the domain model but unpopulated in every live row; `merchant`/`category` have no FK path                                                         |
| `Category` (lightweight)                               | 🟢 Ready                                                                                                                                                                                    |
| `Category` (full `CategoryRecord`, Module 5)           | 🔴 Blocked — 5 of 9 fields have no column                                                                                                                                                   |
| `Merchant` (lightweight)                               | 🟡 Ready with a naming-precedence rule                                                                                                                                                      |
| `Merchant` (full `MerchantRecord`, Module 6)           | 🔴 Blocked — alias model is structurally different from what's stored                                                                                                                       |
| `Client` (lightweight)                                 | 🟢 Ready                                                                                                                                                                                    |
| `Client` (full `ClientRecord`, Module 7)               | 🟡 Partial — `clientType` and company have no column; aggregates need `accounts`/`statements` to carry `client_id`, which they don't                                                        |
| `BankAccountRecord` / `CreditCardRecord` (Modules 8–9) | 🟡 Partial — table can structurally support both, but every balance/limit/network field is `null` in live data and every derived field depends on `transactions.account_id` being populated |
| `Statement` (Module 4)                                 | 🟡 Partial — FK structure is correct; table is empty and its transaction-count derivation is unreachable while `statement_transactions.statement_id` stays unlinked                         |
| Dashboard / Analytics (Modules 2, 10)                  | 🔴 Blocked — depends on ~27 views that don't exist yet                                                                                                                                      |

### 3. Data population — 🔴 Active gap, independent of schema

Even where columns exist and are correctly typed, live data doesn't populate them:

- Every `transactions` row: `account_id`, `client_id`, `statement_id` all `null`.
- Every `accounts` row: `current_balance`, `credit_limit` both `null` (including the 3 credit-card rows).
- `statement_transactions`: 100 rows, all unlinked to any `statements` row (which itself has 0 rows).

This is a data/automation problem (Workflow A/B not writing these fields, or writing them to a different destination than expected), not something a schema migration fixes by itself. It sits squarely in Module 12B's territory ("connect and verify n8n Workflows A/B/C against the live Supabase schema") — Module 12A's repository layer can build the mapping logic, but it will have nothing real to map until this is addressed.

### 4. Vocabulary drift — 🟡 Real but containable

Confirmed with live data, not speculation:

- `transactions.category` has values (`Investment`, `Business`, `Uncategorized`) absent from the `categories` master table.
- `merchant_memory.category` has values (`Groceries`) absent from `categories`.
- `transactions.status` (`auto`, `needs_review`) doesn't match the frontend's 6-value `TransactionStatus` enum at all.

This is fixable with an explicit mapping table in the repository layer (per CLAUDE.md: "the fix is in the repository's mapping layer, not in the workflow") — it doesn't require a schema change, just needs to be designed deliberately rather than discovered as a bug later.

### 5. Performance (indexes) — ⚪ Unknown

Not verifiable via REST. Low risk at current volume (14 transaction rows), but should be confirmed before any production cutover — `transactions` is the table that will see real volume once Workflow A/B population gaps (see §3) are fixed.

### 6. View/RPC layer — 🔴 Largest single gap

Only 2 of ~8 required RPCs and 3 of ~30 required views exist. This is expected pre-Module-12A (CLAUDE.md says modules 5–10 were built against mocks deliberately), but it means the view layer is effectively the majority of the remaining Module 12A implementation work, not a finishing step.

---

## Module-by-Module Readiness Verdict

| Module           | Repository                | Verdict      | Blocking factor                                                                                                                     |
| ---------------- | ------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| 2 — Dashboard    | `dashboard.service.ts`    | 🔴 Not ready | Needs `vw_dashboard_cashflow`, `vw_dashboard_due_cards` (missing); existing `vw_dashboard_summary` returns zeros due to §3          |
| 3 — Transactions | `transactions.service.ts` | 🔴 Not ready | `account` non-nullable but unpopulated; `merchant`/`category` FK gap; status vocabulary mismatch                                    |
| 4 — Statements   | `statements.service.ts`   | 🟡 Partial   | Schema is structurally sound; table is empty and reconciliation is unreachable until `statement_transactions.statement_id` links up |
| 5 — Categories   | `categories.service.ts`   | 🔴 Not ready | `CategoryRecord` missing 5 of 9 fields                                                                                              |
| 6 — Merchants    | `merchant.service.ts`     | 🔴 Not ready | `MerchantRecord` missing 6 of ~11 fields; alias model mismatch                                                                      |
| 7 — Clients      | `clients.service.ts`      | 🟡 Partial   | Core fields ready; `clientType` missing; linked-account/card counts unreachable (`accounts`/`statements` lack `client_id`)          |
| 8 — Accounts     | `accounts.service.ts`     | 🟡 Partial   | Table exists with right shape; every value is `null`                                                                                |
| 9 — Credit Cards | `credit-cards.service.ts` | 🟡 Partial   | Same table, same null-value gap                                                                                                     |
| 10 — Analytics   | `analytics.service.ts`    | 🔴 Not ready | Depends on 7 views, none of which exist                                                                                             |
| 11 — Settings    | `settings.service.ts`     | 🔴 Not ready | `application_settings`, `vw_system_health`, and the other `vw_settings_*` views don't exist                                         |

---

## What "Ready" Would Look Like

Before treating Module 12A as startable in earnest:

1. RLS status confirmed and, if needed, corrected (§1) — direct DB access required.
2. `transactions.account_id`/`client_id` population gap understood and either fixed at the Workflow A level or given a documented mapping-layer fallback (§3).
3. At minimum, the Dashboard and Transactions view/FK gaps closed first, since every other module's "linked" data (accounts, clients, statements per transaction) flows through `transactions`.
4. A written decision on the status/category vocabulary mapping (§4), not an implicit one discovered mid-implementation.

None of this needs to happen all at once — see [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for a suggested order that lets Module 12A proceed incrementally, module by module, rather than waiting for every gap to close first.
