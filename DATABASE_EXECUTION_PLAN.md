# DATABASE_EXECUTION_PLAN.md

Approval gate for the Database Foundation phase. **Nothing described here has been executed.** No table, view, row, or grant on the live Supabase project (`cnxfrlirhycbqnwfxvpm`) has been modified in the course of producing this phase's deliverables.

---

## Important capability note — read before approving

**There is no Supabase MCP server connected in this environment**, and no direct Postgres connection (no connection string, no `psql`, no Supabase Management API token). Everything in this phase — the schema audit, this plan, and the generated SQL — was produced by read-only `GET` requests against the PostgREST REST API using the `service_role` key shared earlier in this session, plus static analysis of the repo and the two n8n workflow exports.

**This means that even after approval, I cannot execute `DATABASE_MIGRATIONS.sql` or `DATABASE_SEED.sql` myself** — there is no tool available in this session that can run arbitrary DDL/DML against the live database. Approving this plan will not result in me silently running the SQL; it can't happen through this session's tools. Execution requires one of:

1. **You run the SQL yourself** via Supabase Studio's SQL Editor (paste `DATABASE_MIGRATIONS.sql`, run; then `DATABASE_SEED.sql`) — the most direct path, and the one that doesn't require sharing any further credentials.
2. **You connect a Supabase MCP server or provide direct Postgres credentials** (a connection string, or a Management API personal access token `sbp_...`) to this session, at which point I could run it directly, still only after your explicit go-ahead on each phase.

Either way, the "approval" this document asks for is approval _of the SQL's content_, not a trigger that causes automatic execution — that trigger doesn't exist in this environment today.

---

## What was generated this phase

| File                                                                   | Purpose                                                                                                                                                                            | Executed?                                            |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql)                     | Additive schema changes (7 phases: transaction linkage, master-data completeness, accounts integrity, 3 new tables, indexes, one view-lockdown REVOKE, and all required SQL views) | ❌ Not executed                                      |
| [DATABASE_SEED.sql](DATABASE_SEED.sql)                                 | Idempotent seed data (missing categories, client-type backfill, merchant-memory column backfill, application settings defaults) — no fabricated accounts/merchants                 | ❌ Not executed                                      |
| [N8N_DATABASE_MAPPING.md](N8N_DATABASE_MAPPING.md)                     | Node-by-node analysis of both live n8n workflow exports against the new schema                                                                                                     | N/A — documentation only, no workflow edited         |
| [REPOSITORY_IMPLEMENTATION_PLAN.md](REPOSITORY_IMPLEMENTATION_PLAN.md) | Per-repository plan for the eventual Module 12A Supabase swap                                                                                                                      | N/A — documentation only, no repository code touched |
| This file                                                              | Execution order, safety review, approval gate                                                                                                                                      | —                                                    |

(Building on this phase's earlier read-only audit: [SUPABASE_AUDIT.md](SUPABASE_AUDIT.md), [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md), [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md), [DATABASE_READINESS.md](DATABASE_READINESS.md), [MIGRATION_PLAN.md](MIGRATION_PLAN.md).)

---

## Safety review

Self-check against the constraints this phase was given:

| Constraint                                         | Status                                                                                                                                                                                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve existing data                             | ✅ No `DROP`, no `DELETE`, no destructive `ALTER` anywhere in either SQL file                                                                                                                                                      |
| Extend existing tables where possible              | ✅ Every Phase 1–3 change is `ALTER TABLE ... ADD COLUMN` on an existing table                                                                                                                                                     |
| Never recreate existing tables                     | ✅ No `CREATE TABLE` for any of the 10 existing tables — only 3 genuinely new ones (`application_settings`, `audit_logs`, `notifications`)                                                                                         |
| Avoid destructive changes                          | ✅ Reviewed line-by-line; the only non-additive statement is the Phase 6 `REVOKE` on `vw_dashboard_accounts`'s write grants, which is a permissions change, not a data or schema change, and is reversible (rollback SQL provided) |
| Use `ALTER TABLE` instead of `DROP`/`CREATE`       | ✅                                                                                                                                                                                                                                 |
| Idempotent (safe to run twice)                     | ✅ Every statement uses `IF NOT EXISTS`, `CREATE OR REPLACE VIEW`, or a `DO` block guard around constraints                                                                                                                        |
| Comments explaining every migration                | ✅ Every `ALTER`/`CREATE` in `DATABASE_MIGRATIONS.sql` has an inline comment or `COMMENT ON` citing the audit finding that motivates it                                                                                            |
| Seed: only insert missing records, never duplicate | ✅ Every `INSERT` in `DATABASE_SEED.sql` is `WHERE NOT EXISTS`; every `UPDATE` is scoped to `WHERE <column> IS NULL`                                                                                                               |
| Do not fabricate financial data                    | ✅ Deliberately did **not** seed placeholder accounts, fake balances, or invented merchants — see `DATABASE_SEED.sql`'s Accounts/Merchant Defaults sections for the reasoning                                                      |

**Open items not resolved by this phase** (carried forward from `REPOSITORY_IMPLEMENTATION_PLAN.md`, not blocking but worth tracking):

- Whether `transactions`/`accounts`/`clients`/`statements` should support soft delete (`deleted_at`) — CLAUDE.md recommends it, no column was added since it wasn't in `MIGRATION_PLAN.md`'s original scope.
- `BankAccountRepository.syncAll()` and `StatementRepository.reprocess()` have no backing mechanism yet (need an RPC or Edge Function, not just schema).
- `getRecurringMerchants`/`getRefundAnalysis`/`getInsights` (Analytics) have no backing view — flagged as needing their own scoping pass.
- RLS status is still unconfirmed (`DATABASE_READINESS.md` §1) — **this should be checked before Phase 6's `REVOKE` is run**, since a REVOKE's effect depends on what RLS is already doing.

---

## Execution order (once approved and a way to run SQL exists)

```
1. Phase 0 verification (from DATABASE_READINESS.md) — NOT part of either
   SQL file, must happen first, manually, via Supabase Studio:
     a. Confirm RLS status on all 10 existing writable tables.
     b. Confirm whether updated_at columns are trigger-maintained.
     c. Confirm actual index coverage (pg_indexes) on the tables/columns
        DATABASE_MIGRATIONS.sql Phase 5a is about to index — so you know
        whether you're adding new indexes or duplicating existing ones.

2. DATABASE_MIGRATIONS.sql — run as one transaction (it already wraps
   Phases 1–7 in BEGIN/COMMIT). Recommended: run in a Supabase branch /
   staging project first if one is available; this project's setup wasn't
   inspected for whether that's an option here.

3. Verify Phase 2 immediately after: spot-check a few rows of
   categories/merchant_memory/clients to confirm the new columns exist
   and defaulted correctly (see DATABASE_SEED.sql's own verification
   queries at the bottom of that file for exact SELECTs to run).

4. DATABASE_SEED.sql — run after step 2/3 is confirmed clean. Safe to
   run even if step 2 was run days earlier (fully idempotent).

5. Run the backfill strategy SELECTs from DATABASE_MIGRATIONS.sql's
   "BACKFILL STRATEGY" comment block as SELECTs first (they're written
   as SELECTs, not UPDATEs, specifically so this step is a review, not
   an automatic write) — only convert to UPDATE once the matches look
   right on inspection.

6. Re-run this phase's audit (re-fetch the PostgREST OpenAPI schema and
   spot-check row samples, the same method used to produce
   SUPABASE_AUDIT.md) to confirm the live schema now matches what
   DATABASE_MIGRATIONS.sql intended — don't assume success from "no
   error returned."

7. Only after 1–6 are confirmed: begin Module 12A repository
   implementation per REPOSITORY_IMPLEMENTATION_PLAN.md, one repository
   at a time, per CLAUDE.md's "one module at a time" rule. Recommended
   order, per that document's own guidance: Categories and Merchants
   first (least data-dependent), Analytics last (most exposed to every
   other gap).

8. Separately, and not blocking step 7: hand N8N_DATABASE_MAPPING.md's
   "What this means for Module 12A / 12B" section to whoever owns the
   n8n workflows, so the statements-table and account_id gaps get fixed
   at the source in parallel with the repository build-out.
```

---

## Approval requested

Per Step 8 of this phase: if `DATABASE_MIGRATIONS.sql` and `DATABASE_SEED.sql` look safe and internally consistent on your review, please confirm before either is run. Given the capability note above, that confirmation should come with a decision on **how** they'll be run — you executing them via Supabase Studio, or connecting credentials/an MCP server so I can run them directly (still gated on your explicit go-ahead per phase, not a one-time blanket approval).

**No SQL has been executed. No further action will be taken until you respond.**
