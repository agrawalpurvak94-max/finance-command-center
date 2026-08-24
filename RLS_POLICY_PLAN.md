# RLS_POLICY_PLAN.md

Per-table RLS policy plan for the 6 tables Phase 0 verification found with RLS enabled but zero policies (`PHASE0_VERIFICATION.md` §1), plus the `transactions` policy correction. **No policy described here has been executed against the live database** — the SQL below now lives in `DATABASE_MIGRATIONS.sql` Phase 8 (approved 2026-08-18), which itself has not been run yet. This document is the reasoning behind that phase; treat `DATABASE_MIGRATIONS.sql` as the source of truth for the exact statements.

**Method:** for each table, Phase 0's direct-connection column dump was checked for a real ownership column — `user_id uuid`, ideally with a live `FOREIGN KEY ... REFERENCES auth.users(id)` like the 4 already-policied tables have. Where one existed, a policy mirroring the pattern already live on `banks`/`email_sources`/`categories` (`own_<table>_all`: `auth.uid() = user_id`, permissive, all commands) was proposed. **Where none existed, this document originally stopped rather than inventing an "allow all authenticated" policy** — that would have been unsafe: Supabase Auth allows self-signup by default, so any policy not scoped to a specific owner would let a second registered user read/write the app owner's financial data. That STOP has since been resolved — see below.

---

## Ownership architecture: approved and implemented (2026-08-18)

The 3 tables that had no usable ownership column (`accounts`, `clients`, `statements`) were blocked pending a decision. **Option 1 was approved for all three**: add `user_id uuid REFERENCES auth.users(id)`, backfilled to the single verified application owner. This is now implemented in `DATABASE_MIGRATIONS.sql` Phase 2.6 (columns + backfill + `NOT NULL`) and Phase 8.1 (the resulting policies) — not just proposed.

**Verified before the SQL was written, not invented:**

- `auth.users` has exactly **one row** — this app is genuinely single-tenant, confirmed directly, not assumed.
- That row's `id` (`2f324f4d-1dc3-4ec5-8c23-93da480842c7`) is the same UUID already referenced by every existing `user_id`-populated row in the database (100% of `transactions`, `merchant_memory`), and the same one every n8n workflow node already hardcodes.
- Its email (`agrawalpurvak94@gmail.com`) matches the git commit author identity ("Purvak") — supporting evidence, not proof; **this is the one fact in this whole plan that only you can finally confirm**, since it doesn't match the email of the account driving this session.

**Critical distinction, restated because it's easy to conflate:**

- **`user_id`** = the authenticated application/tenant owner (Supabase Auth identity). One value across the whole single-tenant app today.
- **`client_id`** = the business-level client/stakeholder (Personal/Business/Internal) a financial instrument is associated with — a `clients` row, not an auth identity. Multiple clients can exist under the one `user_id` above.
- Free-text columns (`account_owner`, `account_holder_name`, `client_name`) are **not** used for RLS anywhere in this plan — none of them are identity references, only labels.

---

## Summary table (current state)

| Table                                        | Ownership mechanism                                                                           | Policy                                                                                                                                    | Condition                                           | Schema change              | Status                                 |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------- | -------------------------------------- |
| `merchant_memory`                            | `user_id uuid` (nullable column; verified 0 NULL rows across all 79 live rows)                | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | No                         | Defined in Phase 8.2, not yet executed |
| `processed_messages`                         | `user_id uuid NOT NULL`                                                                       | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | No                         | Defined in Phase 8.2, not yet executed |
| `statement_transactions`                     | `user_id uuid NOT NULL`                                                                       | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | No                         | Defined in Phase 8.2, not yet executed |
| `accounts`                                   | **Added**: `user_id uuid REFERENCES auth.users(id)`, backfilled + `NOT NULL` (Phase 2.6)      | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | **Done in this migration** | Defined in Phase 8.1, not yet executed |
| `clients`                                    | **Added**: same as `accounts`                                                                 | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | **Done in this migration** | Defined in Phase 8.1, not yet executed |
| `statements`                                 | **Added**: same as `accounts` (0 rows today — column/policy still apply, nothing to backfill) | Own-row, all commands                                                                                                                     | `auth.uid() = user_id`                              | **Done in this migration** | Defined in Phase 8.1, not yet executed |
| `transactions` (correction, not a new table) | Already had `user_id NOT NULL`                                                                | Remove the overly-broad `Allow authenticated inserts` policy; `own_tx_insert` (already scoped) becomes the sole authenticated INSERT path | `auth.uid() = user_id` (unchanged, now uncontested) | No                         | Defined in Phase 8.3, not yet executed |

---

## The `transactions` policy correction (Decision, this update)

**Before** (live today, confirmed via Phase 0's direct `pg_policies` read): `transactions` has _two_ INSERT policies — `"Allow authenticated inserts"` (`FOR INSERT TO authenticated, WITH CHECK (true)` — unconditional) and `own_tx_insert` (`FOR INSERT TO public, WITH CHECK (auth.uid() = user_id)` — correctly scoped). Since RLS policies are OR'd permissively, the unconditional one made the scoped one meaningless: any authenticated Supabase user could insert a transaction under _any_ `user_id`, not just their own.

**After** (Phase 8.3): `"Allow authenticated inserts"` is dropped. `own_tx_insert` becomes the only INSERT path for the `authenticated`/`public` role. `service_role_bypass` (`FOR ALL TO service_role, USING/WITH CHECK (true)`) is untouched — that's the intentional, correct exception, not a leftover risk.

**Why this can't break the n8n workflows:** both Workflow C Parser's transaction-insert nodes authenticate with the `service_role` key (confirmed node-by-node in `N8N_NODE_DEPENDENCY_MAP.md`), never an `authenticated`-role session. `service_role` bypasses RLS entirely by Postgres/Supabase design, independent of any policy — removing a policy scoped to `authenticated` has zero effect on it.

---

## Execution status

**Nothing has been executed.** Every statement described above is now written into `DATABASE_MIGRATIONS.sql` (Phase 2.6 for the new columns, Phase 8 for all policies) and is part of that file's single pending transaction — not a separate execution step anymore, per this update's explicit instruction to consolidate. `DATABASE_EXECUTION_PLAN.md` reflects this.
