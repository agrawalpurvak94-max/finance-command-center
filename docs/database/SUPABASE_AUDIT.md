# Supabase Audit — Frontend vs. Database

Compares what the frontend (9 repositories, per [REPOSITORY_MAP.md](../architecture/REPOSITORY_MAP.md)) needs against what actually exists in this repository's `supabase/` folder (per [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)). **No live database was inspected for this audit** — "existing" below means "present in `supabase/migrations|views|rpc|functions`", which is empty; it does not mean "confirmed absent from the live production database," since CLAUDE.md claims several tables already exist there. This distinction is preserved throughout.

---

## Existing tables (verified in this repo)

**None.** `supabase/migrations/` is empty — this repository defines zero tables.

## Existing tables (claimed by CLAUDE.md, unverified here)

`transactions`, `statement_transactions`, `processed_messages`, `merchant_memory`, `monthly_summaries`, `banks`, `categories`, `email_sources` — per CLAUDE.md Part 3. Whether these actually exist on the connected Supabase project, and with what columns, has not been checked in this pass.

## Missing tables (needed by a built frontend module, not present anywhere)

| Table        | Needed by                                    | Confirmed missing (no migration exists) | CLAUDE.md status       |
| ------------ | -------------------------------------------- | --------------------------------------- | ---------------------- |
| `accounts`   | Module 8 (Accounts), Module 9 (Credit Cards) | Yes                                     | Listed as "NEW TABLES" |
| `statements` | Module 4 (Statements)                        | Yes                                     | Listed as "NEW TABLES" |
| `clients`    | Module 7 (Clients)                           | Yes                                     | Listed as "NEW TABLES" |

These three are the highest-priority gap: three built, approved, feature-complete frontend modules (4, 7, 8, 9) have no table to write to at all.

## Missing tables (named in CLAUDE.md, not yet needed by any built module)

| Table                  | CLAUDE.md status       | Needed by                                                                   |
| ---------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `audit_logs`           | Listed as "NEW TABLES" | No frontend module reads/writes this yet — no `AuditLog` domain type exists |
| `notifications`        | Listed as "NEW TABLES" | No frontend module reads/writes this yet                                    |
| `application_settings` | Listed as "NEW TABLES" | Module 11 (Settings) — not yet built                                        |

## Existing columns

Not assessable — no column-level schema is available anywhere in this repository (see [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) §4).

## Missing columns

Not assessable for the same reason — cannot enumerate what's "missing" from a schema this repo cannot see. [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md) proposes candidate columns per entity; every one of them should be treated as a "needed" column pending verification, not a confirmed gap.

One column IS flagged with higher confidence as possibly missing even on the claimed-existing `transactions` table: **`payment_mode`** — `Transaction.paymentMode` (domain field) is explicitly documented as a "Module 10 (Analytics) addition," i.e. added to the frontend's domain model _after_ `transactions` was already claimed to exist in production. If the live table predates this field, it needs a migration even though the table itself doesn't.

## Missing relationships / foreign keys

Every FK implied by the domain model (catalogued in [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md)) is unverified. The ones with the most structural risk, because two currently-separate frontend domain concepts are proposed to collapse into one shared table:

- `BankAccountRecord` and `CreditCardRecord` both map to a single proposed `accounts` table (per CLAUDE.md), but **no discriminator column is named anywhere** — `AccountKind` (`'bank' | 'credit_card'`) exists in the frontend domain layer (`src/domain/Account.ts`) but CLAUDE.md never states the equivalent DB column exists or is named the same thing. This should be resolved (confirmed or added) before Module 12A writes `SupabaseBankAccountRepository`/`SupabaseCreditCardRepository`, since both would otherwise be querying the same table with no way to tell rows apart.
- `Statement.account` → the future `accounts` table, and separately `statement_transactions` (claimed existing) presumably relates to `transactions` — but CLAUDE.md never states how (or whether) `statement_transactions` and the future `statements` table relate to each other. This is a real open question, not a naming nit: Module 4's `StatementRepository.create()` needs an `account_id` FK target, but the _existing_ `statement_transactions` table's relationship to a _not-yet-created_ `statements` table is undefined.

## Missing indexes

Not assessable — CLAUDE.md's naming convention (`idx_<table>_<column>`) is documented as a rule, but no index list or migration exists to check compliance against.

## Missing constraints

Not assessable directly, but one is inferable with high confidence: `CategoryRecord.color` is constrained to exactly 7 values in the frontend (`CATEGORY_COLORS` const array in `src/domain/Category.ts`) — a real `categories` table (claimed existing) would need a matching `CHECK` constraint (or enum type) for the frontend and database to agree on valid values; whether one exists is unverified.

## Missing RLS

Not assessable — no policy is defined anywhere in this repo, and CLAUDE.md does not describe an RLS strategy beyond the general instruction to use Supabase Auth. Given "Application is NOT a SaaS platform... only one client" (CLAUDE.md Part 1), RLS complexity may be intentionally minimal (single-tenant), but this is not stated explicitly enough to document as fact — flagged as an open question for whoever scopes Module 12A's auth work.

## Repository compatibility

Every one of the 8 built repository interfaces (Transaction, Statement, Category, Merchant, BankAccount, CreditCard, Client, Analytics — see [REPOSITORY_MAP.md](../architecture/REPOSITORY_MAP.md)) is written as a **plain interface with no Supabase-specific assumptions baked in** — no method signature references a table name, column name, or Supabase-specific type. This is a genuine strength: whatever the real schema turns out to be, a `Supabase*Repository` class can adapt to it entirely inside its own method bodies without needing interface changes, _provided_ the two structural gaps above (accounts discriminator, statements/statement_transactions relationship) are resolved first — those are the only two places where "the interface can't be satisfied without a schema decision" risk currently exists.

`dashboard.service.ts` is the one outlier: it has no interface to check compatibility against, because it was never given one (see [REPOSITORY_MAP.md](../architecture/REPOSITORY_MAP.md)'s "Dashboard (no repository)" section). Module 12A's Dashboard work will need to either retrofit a `DashboardRepository` interface first, or rewrite the service's method bodies directly — a scoping decision, not a compatibility problem.

## Migration recommendations

See [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for the ordered plan. Summary of what's needed, not how: 3 new base tables (`accounts`, `statements`, `clients`), the accounts-kind-discriminator decision, ~9+ SQL views per the "Missing tables" priorities above (Categories'/Merchants'/Clients'/Credit-Cards' summary/detail views aren't even named yet in CLAUDE.md, only described), and the RPC functions CLAUDE.md names (`rpc_recalculate_health` in particular, since both BankAccount and CreditCard health fields depend on it per [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md)).

## Readiness score for Module 12A

**Low — not ready to begin without a live-schema inspection step first.**

Rationale:

- Zero verified schema exists in this repository (§ "Existing tables (verified)").
- Three built modules (Statements, Clients, Accounts — and Credit Cards sharing Accounts' table) have no confirmed table to target at all.
- The one structural ambiguity most likely to force an interface change if unresolved (accounts kind-discriminator) has not been decided.
- No live inspection of the claimed-existing tables (`transactions`, `categories`, `merchant_memory`, etc.) has been performed, so even the "safe" modules (Transaction, Category, Merchant) are building against an assumed shape, not a confirmed one.

This is a **process readiness** finding, not a code-quality one — the frontend side (repository interfaces, service swap points, hook/component isolation from the mock implementation) is itself in good shape for the swap, per "Repository compatibility" above. The gap is entirely on the database-visibility side. See [DATABASE_READINESS.md](./DATABASE_READINESS.md) for the prioritized punch list.
