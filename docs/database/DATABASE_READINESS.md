# Database Readiness — Summary for Module 12A Planning

This summarizes [SUPABASE_AUDIT.md](./SUPABASE_AUDIT.md) into an action-oriented punch list. Read the audit for the reasoning; this document is the "what to do about it, in what order" view.

---

## What is ready

- **All 8 built repository interfaces are Supabase-agnostic.** No method signature assumes a table/column/RPC name — the swap can happen entirely inside new `Supabase*Repository` classes without touching hooks, components, or the interfaces themselves. Verified by direct inspection of all 16 repository files (interfaces + mock implementations).
- **The service-layer swap point is real and consistently applied.** 7 of 9 services (`transactions`, `statements`, `categories`, `merchants`, `accounts`, `credit-cards`, `clients`) follow the exact same one-line-swap pattern, each with an explicit comment marking the swap point. `analytics.service.ts` follows a near-identical pattern (bound methods on one repository instance).
- **`src/lib/supabase.ts` already exists and is wired for env-based config** — `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, throws early if missing. Nothing imports it yet, but it's ready to be imported by the first `Supabase*Repository`.
- **CLAUDE.md names every required view and several RPCs explicitly** (Part 3) — a real, if unstarted, checklist exists; this isn't a from-scratch design problem for most of the app.
- **The domain layer is stable and additive-only** (per [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)) — every past module addition (Statements, Credit Cards, etc.) extended existing files without breaking consumers, and the same pattern should hold for whatever Module 12A needs to adjust.

## What is missing

- **No live schema inspection has ever been performed.** This is the single largest blocker — every table/column named in CLAUDE.md is an unverified claim from this repository's point of view.
- **Three new base tables** (`accounts`, `statements`, `clients`) don't exist anywhere (verified: `supabase/migrations/` is empty).
- **The `accounts` table's bank-vs-credit-card discriminator is undecided** — both `BankAccountRecord` and `CreditCardRecord` are proposed to share one table with no named column to tell them apart.
- **`statement_transactions` (claimed existing) vs. the future `statements` table's relationship is undefined** in any document this repo has access to.
- **Most required SQL views (30 named, 0 built) and RPCs (8 named, 0 built) don't exist.**
- **`dashboard.service.ts` has no repository interface** — Module 12A's Dashboard work needs a scoping decision (retrofit an interface, or rewrite the service directly) before it can follow the same pattern as the other 8 modules.
- **RLS strategy is undocumented** anywhere accessible to this repository.

## What should be completed before wiring repositories

In dependency order (each step unblocks the next; see [MIGRATION_PLAN.md](./MIGRATION_PLAN.md) for full detail per step):

1. Live-inspect the actual Supabase project (tables, columns, views, RPCs, RLS policies) — resolves nearly every "unverified" flag in [SUPABASE_AUDIT.md](./SUPABASE_AUDIT.md) in one step, before any code is written.
2. Decide and migrate the `accounts` table shape (including the bank/credit-card discriminator) — blocks both Module 8 and Module 9's Supabase repositories.
3. Migrate `statements` and resolve its relationship to `statement_transactions` — blocks Module 4.
4. Migrate `clients` — blocks Module 7.
5. Build the SQL views each repository's swap-point comment already names (`vw_transactions`, `vw_accounts`, `vw_statements`, `vw_categories`, `vw_merchants`, `vw_clients`, plus the unnamed summary views) — blocks correctness (not compilation) of every `Supabase*Repository`.
6. Build `rpc_recalculate_health` — blocks correct `health` computation for both Accounts and Credit Cards (today computed client-side in the mock repositories; per CLAUDE.md, business logic like this belongs in an RPC, not React).
7. Decide `dashboard.service.ts`'s Module 12A approach (interface retrofit vs. direct rewrite) — blocks Dashboard specifically, doesn't block the other 8 modules.
8. Decide and document an RLS strategy, even if minimal (per CLAUDE.md, this is single-tenant — "not a SaaS platform... only one client" — so RLS may legitimately be simple, but that should be a stated decision, not silence).

## Priority

**High**

- Live schema inspection (step 1) — unblocks everything else and costs nothing to defer further, but every day it's deferred is a day every other estimate in this audit stays unverified.
- `accounts` table + discriminator decision (step 2) — blocks 2 of 5 remaining core modules (8 and 9).
- `statements` table + relationship decision (step 3) — blocks Module 4, one of the four already-shipped modules, meaning its Supabase migration is otherwise ready to start immediately.

**Medium**

- `clients` table (step 4) — blocks Module 7, same shipped-and-ready status as Statements.
- Core SQL views for the 5 relatively low-ambiguity modules (Transaction, Category, Merchant, Client, BankAccount) — mechanical once tables exist.
- `rpc_recalculate_health` — needed for correctness, not for the repository to compile; a `Supabase*Repository` could ship with a temporary client-side health calc (matching current mock behavior) and be corrected once the RPC lands, without an interface change.

**Low**

- `audit_logs` / `notifications` / `application_settings` tables — no built module needs them yet (Settings, Module 11, isn't built).
- RLS strategy documentation — low urgency given the stated single-tenant scope, but should not stay silent indefinitely.
- `dashboard.service.ts` interface retrofit — affects one module's _implementation pattern_, not its feasibility; can be decided during Module 12A itself rather than blocking its start.
