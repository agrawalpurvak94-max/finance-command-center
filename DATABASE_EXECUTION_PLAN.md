# DATABASE_EXECUTION_PLAN.md

Approval gate for the Database Foundation phase. **Nothing described here has been executed.** No table, view, row, policy, or grant on the live Supabase project (`cnxfrlirhycbqnwfxvpm`) has been modified in the course of producing this phase's deliverables.

---

## Capability note

A direct Postgres connection string was provided and verified working (see `PHASE0_VERIFICATION.md`): connected via a disposable Node script (the `pg` driver), reading the connection string once from a local file outside the git repository, never logged or echoed. Docker couldn't reach the host (Supabase's direct connection is IPv6-only; Docker Desktop's network on this machine doesn't route IPv6) — the native host connection worked instead. Execution is technically possible from this session, gated only on your explicit approval.

---

## What was generated this phase

| File                                                                                                                                                                                                                     | Purpose                                                                                                                                                                                                                                                                                                                                                                                 | Executed?                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| [SUPABASE_AUDIT.md](SUPABASE_AUDIT.md) / [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) / [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md) / [DATABASE_READINESS.md](DATABASE_READINESS.md) / [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Original read-only REST audit and gap analysis                                                                                                                                                                                                                                                                                                                                          | N/A — read-only                                                  |
| [PHASE0_VERIFICATION.md](PHASE0_VERIFICATION.md)                                                                                                                                                                         | Direct-connection verification of RLS/indexes/triggers/constraints against the live DB                                                                                                                                                                                                                                                                                                  | N/A — read-only                                                  |
| [MIGRATION_CHANGELOG.md](MIGRATION_CHANGELOG.md)                                                                                                                                                                         | What changed in the migration after Phase 0 findings, and why (Decisions 1–6)                                                                                                                                                                                                                                                                                                           | N/A — documentation                                              |
| [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql)                                                                                                                                                                       | Additive schema changes: transaction linkage, master-data completeness, ownership model (`user_id` on `accounts`/`clients`/`statements`, backfilled + `NOT NULL`), `updated_at` triggers, 3 new tables, trimmed indexes, one view-lockdown `REVOKE`, 24 required views, and **RLS policies for all 6 previously-unpolicied tables plus the `transactions` INSERT correction (Phase 8)** | ❌ Not executed                                                  |
| [DATABASE_SEED.sql](DATABASE_SEED.sql)                                                                                                                                                                                   | Idempotent seed data — no fabricated accounts/merchants/statements                                                                                                                                                                                                                                                                                                                      | ❌ Not executed                                                  |
| [RLS_POLICY_PLAN.md](RLS_POLICY_PLAN.md)                                                                                                                                                                                 | Full reasoning behind Phase 8's policies — the SQL itself now lives in `DATABASE_MIGRATIONS.sql`, not here                                                                                                                                                                                                                                                                              | ❌ Not executed — no longer a separate execution step, see below |
| [N8N_DATABASE_MAPPING.md](N8N_DATABASE_MAPPING.md) / [N8N_NODE_DEPENDENCY_MAP.md](N8N_NODE_DEPENDENCY_MAP.md)                                                                                                            | Node-by-node analysis of both live n8n workflow exports                                                                                                                                                                                                                                                                                                                                 | N/A — documentation only, no workflow edited                     |
| [BACKWARD_COMPATIBILITY.md](BACKWARD_COMPATIBILITY.md)                                                                                                                                                                   | Compatibility review against workflows/frontend/REST endpoints                                                                                                                                                                                                                                                                                                                          | N/A — documentation                                              |
| [REPOSITORY_IMPLEMENTATION_PLAN.md](REPOSITORY_IMPLEMENTATION_PLAN.md) / [VIEW_USAGE_MATRIX.md](VIEW_USAGE_MATRIX.md) / [FUTURE_VIEWS.sql](FUTURE_VIEWS.sql)                                                             | Per-repository Supabase-swap plan; view classification; deferred views                                                                                                                                                                                                                                                                                                                  | N/A / ❌ Not executed                                            |
| This file                                                                                                                                                                                                                | Execution order, safety review, approval gate                                                                                                                                                                                                                                                                                                                                           | —                                                                |

---

## Safety review

| Constraint                            | Status                                                                                                                                                                                                                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Preserve existing data                | ✅ No `DROP TABLE`, `DROP COLUMN`, `DELETE`, `TRUNCATE`, or destructive `ALTER` anywhere                                                                                                                                                                                  |
| Extend existing tables where possible | ✅ Every schema change is `ALTER TABLE ... ADD COLUMN` on an existing table                                                                                                                                                                                               |
| Never recreate existing tables        | ✅ No `CREATE TABLE` for any of the 10 existing tables — only 3 genuinely new ones                                                                                                                                                                                        |
| Avoid destructive changes             | ✅ Only non-additive statements: the `REVOKE` on `vw_dashboard_accounts` (permissions, reversible) and 7 `DROP POLICY IF EXISTS` (RLS metadata, not data, reversible, and 6 of the 7 are immediately followed by `CREATE POLICY` re-adding an equivalent-or-narrower one) |
| Idempotent (safe to run twice)        | ✅ `IF NOT EXISTS`, `CREATE OR REPLACE VIEW`/`FUNCTION`/`TRIGGER`, and `DROP POLICY IF EXISTS` + `CREATE POLICY` pairs throughout                                                                                                                                         |
| Do not fabricate financial data       | ✅ No placeholder accounts, balances, merchants, or statements anywhere — Phase 2.6's backfill labels _existing_ rows with their owner, it does not create rows                                                                                                           |
| RLS status                            | ✅ Confirmed via direct connection — now fully addressed: all 10 tables will have policies after this migration (was 4 of 10)                                                                                                                                             |
| `owner_type` duplication              | ✅ Resolved, not added — `MIGRATION_CHANGELOG.md` Decision 1                                                                                                                                                                                                              |
| Duplicate indexes                     | ✅ Resolved, trimmed — `MIGRATION_CHANGELOG.md` Decision 2                                                                                                                                                                                                                |
| **Ownership architecture**            | ✅ **Approved and implemented** — `accounts`/`clients`/`statements` now get `user_id`, verified against the single real `auth.users` row, not invented                                                                                                                    |
| **`transactions` INSERT policy gap**  | ✅ **Fixed** — the unrestricted `Allow authenticated inserts` policy is dropped in Phase 8.3; `service_role`/n8n access is preserved and documented as unaffected                                                                                                         |

**Open items not resolved by this phase** (carried forward, not blocking):

- Whether `transactions`/`accounts`/`clients`/`statements` should support soft delete (`deleted_at`).
- `BankAccountRepository.syncAll()` and `StatementRepository.reprocess()` have no backing mechanism yet.
- `getRecurringMerchants`/`getRefundAnalysis`/`getInsights` (Analytics) have no backing view.
- `statement_transactions.statement_id` linkage is broken at the source (Workflow D) — Module 12B dependency, documented not patched (Decision 6). Now 7,800 rows as of this update's verification query, still growing, `statements` still at 0.
- One fact that needs your human confirmation, not a technical check: the verified `auth.users` owner's email (`agrawalpurvak94@gmail.com`) differs from this session's account email. Supporting evidence (sole row in `auth.users`, referenced by 100% of existing owned data, name matches the git commit author "Purvak") is strong but not conclusive — see `MIGRATION_CHANGELOG.md`.

---

## Execution order (nothing has changed hands yet)

```
1. Phase 0 verification — DONE (PHASE0_VERIFICATION.md).
2. Ownership architecture decision — DONE, approved 2026-08-18, implemented
   in DATABASE_MIGRATIONS.sql Phase 2.6 + Phase 8 (RLS_POLICY_PLAN.md).
3. Your confirmation of the auth.users owner identity (see above) — the one
   remaining human judgment call before execution.
4. DATABASE_MIGRATIONS.sql — run as one transaction (wraps every phase,
   including the new ownership/RLS phases, in a single BEGIN/COMMIT).
   Recommend a Supabase branch/staging project first if available.
5. Verify immediately after: spot-check accounts/clients rows have user_id
   populated and NOT NULL; confirm the 7 RLS policies exist via
   pg_policies; confirm "Allow authenticated inserts" is gone from
   transactions and own_tx_insert/service_role_bypass remain.
6. DATABASE_SEED.sql — run after step 4/5 is confirmed clean.
7. Backfill strategy SELECTs (category_id/merchant_id/account_id on
   transactions) from DATABASE_MIGRATIONS.sql's "BACKFILL STRATEGY"
   comment block — reviewed SELECTs first, not blind UPDATEs. No backfill
   for statement_transactions.statement_id (Decision 6).
8. Re-run the direct-connection audit to confirm the live schema matches
   intent.
9. Only after 1–8: begin Module 12A repository implementation per
   REPOSITORY_IMPLEMENTATION_PLAN.md — Categories first (fully RLS-ready
   today), then whichever of Merchants/Transactions is next per that
   document's RLS-readiness table.
10. Separately, not blocking step 9: hand N8N_DATABASE_MAPPING.md's
    Module 12B section (statements-table + account_id gaps) to whoever
    owns the n8n workflows.
```

---

## Approval requested

`DATABASE_MIGRATIONS.sql` now contains everything through Phase 8 (RLS) in one file, one transaction. See the static safety review reported alongside this update for the full column/FK/policy/index inventory.

**No SQL has been executed. No further action will be taken until you respond.**
