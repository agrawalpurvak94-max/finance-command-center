# BACKWARD_COMPATIBILITY.md

Compatibility review of [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql) against the 5 checks requested for this phase, grounded in [N8N_NODE_DEPENDENCY_MAP.md](N8N_NODE_DEPENDENCY_MAP.md)'s node-by-node read of both live workflows (not assumption). **No SQL has been executed.**

**Updated 2026-08-18, twice.** First pass: `PHASE0_VERIFICATION.md`'s direct-connection findings and the resulting migration revisions (Decisions 1–4). Second pass (this one): the approved ownership architecture (`user_id` on `accounts`/`clients`/`statements` — Phase 2.6) and RLS policies for all 6 previously-unpolicied tables plus the `transactions` INSERT correction (Phase 8). Every figure and claim below reflects the _current_ `DATABASE_MIGRATIONS.sql`, re-verified line-by-line against the file as it stands now.

---

## Check 1 — Existing n8n workflows will continue to function

**Verdict: ✅ Pass, verified against the actual node graph, not inferred.**

`N8N_NODE_DEPENDENCY_MAP.md`'s combined table→node index confirms both workflows only touch `transactions`, `merchant_memory`, `categories`, and `statement_transactions`. Every operation either workflow performs against those tables is a `SELECT`, an `INSERT`, or an `UPSERT` naming an explicit, fixed set of columns — none of them reference `SELECT *` or send a payload built by introspecting the table schema at runtime, so adding new nullable columns cannot change what either workflow sends or receives.

Specifically:

- 17 of the 20 new columns in `DATABASE_MIGRATIONS.sql` (`transactions.merchant_id/category_id/duplicate_of_id`, `categories.description/parent_category_id/status/color/icon/updated_at`, `merchant_memory.aliases/default_category_id/status/notes/has_rules`, `clients.client_type`, `accounts.client_id`, `statements.client_id`) are nullable with no `NOT NULL` requirement — an `INSERT` that omits them (which is what both workflows do, since they don't know these columns exist) succeeds exactly as before. (No `owner_type` column exists to check — Decision 1 resolved that without adding one; see `MIGRATION_CHANGELOG.md`.)
- **The remaining 3 (`accounts.user_id`, `clients.user_id`, `statements.user_id` — Phase 2.6) ARE `NOT NULL`, but this cannot break either workflow: neither writes to `accounts`, `clients`, or `statements` at all** (confirmed in the dependency map's reverse-lookup table — zero nodes reference any of the three). A `NOT NULL` constraint on a table nothing inserts into is inert with respect to workflow compatibility, by construction, not by luck.
- **No new `CHECK` constraint is added to any existing column.** Phase 3.1's original draft would have added one to `accounts.account_type` — Phase 0 found an equivalent constraint (using `'OD'` instead of `'Overdraft'`) already live, so this migration no longer touches `accounts.account_type` at all (Decision 3). Moot for this check either way: neither workflow writes to `accounts`.
- The 3 `CHECK` constraints on brand-new columns (`categories.status`, `merchant_memory.status`, `clients.client_type`) only constrain values _if provided_; since no workflow node sets `categories.status` or `merchant_memory.status` (confirmed in the dependency map — `Save Merchant Memory` sets only `user_id, normalized_merchant, display_name, category, confidence`), and no workflow writes to `clients` at all, none of these constraints are ever evaluated against workflow-supplied data.
- The 6 `updated_at` triggers (Decision 4) are additive behavior, not a breaking change. Workflow C Parser's `Save Merchant Memory` node performs an upsert (`Prefer: resolution=merge-duplicates`) against `merchant_memory` — when that resolves as an update-on-conflict, the new `trg_merchant_memory_set_updated_at` trigger will fire and set `updated_at = now()`. Neither workflow reads `updated_at` back, so this is a pure improvement.
- **New: the 7 RLS policy changes (Phase 8) cannot affect either workflow, because both authenticate as `service_role`, which bypasses RLS entirely by Postgres/Supabase design — independent of which policies exist.** This applies to the 6 new `own_<table>_all` policies and to dropping `transactions`'s `"Allow authenticated inserts"` policy alike: `service_role_bypass` (untouched, `FOR ALL TO service_role`) is what actually governs the workflows' access, and nothing in Phase 8 touches it. Verified against `N8N_NODE_DEPENDENCY_MAP.md`'s node-by-node read — every Supabase-facing node in both workflows uses the `service_role` `apikey`/`Authorization` header, never an `authenticated`-role session.
- The 3 new tables (`application_settings`, `audit_logs`, `notifications`) are not referenced by either workflow, so their existence has zero effect on workflow execution.

**One thing this check could not verify directly** (flagged, not assumed away): whether `Build row (from AI)`'s `raw_email` field (which doesn't match any real column, even before this migration) currently causes a silent failure or a hard error on the `Supabase Insert (transactions)` node. This is a **pre-existing** issue independent of this migration — it isn't something the migration introduces or worsens, but it wasn't safe to test directly (would require writing a test row to live `transactions`, which this read-only phase avoids). Recommend the workflow owner check this node's actual execution history/error log directly.

---

## Check 2 — Existing frontend modules (1–11) will not break

**Verdict: ✅ Pass, by construction.**

Every module 1–10 currently reads exclusively from mock repositories (`Mock*Repository` classes over in-memory generated data) — none of them make a Supabase call today. Module 11 (Settings) doesn't exist as code yet. A database-only migration cannot break code that doesn't query the database. This isn't a narrow technicality: it's the entire reason CLAUDE.md sequences "Database Foundation phase" _before_ Module 12A's repository swap — the frontend and the database are fully decoupled until that swap happens.

What **would** need re-verification once Module 12A actually starts wiring a `Supabase*Repository`: that each repository's TypeScript interface (`transaction.repository.ts`, `category.repository.ts`, etc.) is satisfied by the views this migration adds — that check is exactly what `REPOSITORY_IMPLEMENTATION_PLAN.md` and `VIEW_USAGE_MATRIX.md` (this same phase) are for. No repository interface file was modified to produce any part of this phase.

---

## Check 3 — Existing Supabase REST endpoints remain compatible

**Verdict: ✅ Pass.**

PostgREST auto-generates REST endpoints from table/view definitions. Confirmed effects of this migration on existing endpoints:

- `GET/POST/PATCH/DELETE /rest/v1/transactions`, `/categories`, `/merchant_memory`, `/clients`, `/accounts`, `/statements`, `/statement_transactions`, `/banks`, `/email_sources`, `/processed_messages` — all keep working identically for any request that doesn't reference the new columns; PostgREST does not require a request to specify every column.
- `/rest/v1/vw_dashboard_summary`, `/rest/v1/vw_dashboard_accounts`, `/rest/v1/monthly_summaries` — **explicitly not touched** by this migration (see `DATABASE_MIGRATIONS.sql` Phase 7's header note). Their full definitions **have** now been read directly (`PHASE0_VERIFICATION.md`, via the same connection used for Phase 0) — `monthly_summaries`'s definition is in fact what drove Decision 1 — and confirms this migration still correctly leaves all three alone rather than redefining them.
- `/rest/v1/rpc/lookup_merchant`, `/rest/v1/rpc/upsert_merchant_memory` — untouched; no function signature is modified anywhere in this migration.
- New endpoints appear (`/rest/v1/application_settings`, `/rest/v1/audit_logs`, `/rest/v1/notifications`, and one endpoint per new view) — additive only, cannot collide with or shadow an existing endpoint since every new name is checked against the existing 13-relation list from `SUPABASE_AUDIT.md` and none overlap.
- One endpoint's _permissions_ change: `vw_dashboard_accounts` loses `INSERT`/`UPDATE`/`DELETE` grants (Phase 6). `GET` is untouched. This is the one item in the whole migration that isn't purely additive — see the dedicated note below.

---

## Check 4 — Existing Workflow A/B/C (CLAUDE.md's conceptual names) remain backward compatible

**Verdict: ✅ Pass — same evidence as Check 1.**

Per `N8N_DATABASE_MAPPING.md`'s naming reconciliation, CLAUDE.md's "Workflow A/B/C" map onto the two actual files (`Workflow C Parser` covers both A and C's concepts; `Workflow D` covers B's concept) — there is no fourth, separately-named workflow to check. Check 1's analysis covers both files exhaustively.

---

## Check 5 — Extend rather than replace/rename

**Verdict: ✅ Already compliant — confirmed by a full statement-by-statement re-read of the revised `DATABASE_MIGRATIONS.sql`.**

| Statement type                                             | Count                                                                                                                                | Renames/removals?                                                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`                 | 20 columns across 5 existing tables (17 + 3 `user_id` — Phase 2.6)                                                                   | 0 — no `DROP COLUMN`, no `RENAME COLUMN`, no `ALTER COLUMN ... TYPE` anywhere in the file                                                                           |
| `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL`            | 3 (`accounts.user_id`, `clients.user_id`, `statements.user_id` — Phase 2.6, only after this same migration's own backfill `UPDATE`s) | Not a retype, not destructive — every existing row is populated before this runs, in the same transaction                                                           |
| `UPDATE` (backfill)                                        | 3 (`accounts`, `clients`, `statements` — Phase 2.6)                                                                                  | Not a rename/removal — labels existing rows with their verified owner; 0 rows deleted or overwritten in any other column                                            |
| `ALTER TABLE ... ADD CONSTRAINT`                           | 0 (Phase 3.1's attempt was removed once Phase 0 found an equivalent constraint already live; see Decision 3)                         | N/A                                                                                                                                                                 |
| `CREATE TABLE IF NOT EXISTS`                               | 3 (`application_settings`, `audit_logs`, `notifications`)                                                                            | 0 — none of the 10 existing tables are touched by a `CREATE TABLE`                                                                                                  |
| `CREATE OR REPLACE FUNCTION`                               | 1 (`set_updated_at()` — Decision 4)                                                                                                  | 0 — no existing function is touched                                                                                                                                 |
| `CREATE OR REPLACE TRIGGER`                                | 6 (`accounts`, `clients`, `statements`, `merchant_memory`, `categories`, `application_settings` — Decision 4)                        | 0 — no existing trigger existed to rename or remove (Phase 0 found zero)                                                                                            |
| `CREATE INDEX IF NOT EXISTS`                               | 9 in Phase 5a (revised down from 14 — Decision 2) + 2 in Phase 4 (`audit_logs`, `notifications`)                                     | 0                                                                                                                                                                   |
| `CREATE OR REPLACE VIEW`                                   | 24 (revised down from an original 34 — 10 moved to `FUTURE_VIEWS.sql`)                                                               | 0 for new views. 0 for the 3 pre-existing views                                                                                                                     |
| `REVOKE`                                                   | 1 (`vw_dashboard_accounts` write grants)                                                                                             | Permissions tightening, reversible via a documented `GRANT`                                                                                                         |
| `DROP POLICY IF EXISTS` + `CREATE POLICY`                  | 6 pairs (`accounts`, `clients`, `statements`, `merchant_memory`, `processed_messages`, `statement_transactions` — Phase 8)           | Each pair redefines its own policy for idempotency (Postgres has no `CREATE POLICY IF NOT EXISTS`) — not a rename, doesn't touch any other table's policy           |
| `DROP POLICY IF EXISTS` (standalone, no matching `CREATE`) | 1 (`"Allow authenticated inserts"` on `transactions` — Phase 8.3)                                                                    | Intentional removal of an overly-broad policy, not a rename — `own_tx_insert` (already correctly scoped, untouched) remains as the `authenticated`-role INSERT path |

No column this migration adds duplicates the _meaning_ of an old one without keeping the old one — e.g. `transactions.merchant_id`/`category_id` are added **alongside**, not instead of, the existing free-text `merchant`/`category` columns. Same pattern for `categories.status` (new) vs. nothing being removed, `clients.client_type` (new) vs. `client_name` (untouched). **No `owner_type` column exists anywhere in this migration** — Decision 1 confirmed the existing `transactions.type` column already serves that purpose. **`accounts.user_id`/`clients.user_id`/`statements.user_id` are a distinct concept from `client_id`** — the former identifies the Supabase Auth tenant/application owner (one value today, single-tenant), the latter identifies a business-level client record; neither this migration nor any prior one conflates them (see `MIGRATION_CHANGELOG.md`).

---

## Backfill-before-code-change confirmation

`DATABASE_MIGRATIONS.sql`'s own "BACKFILL STRATEGY" section already sequences backfill as a separate, reviewed step _after_ the migration and _before_ any repository code is written — this phase doesn't change that sequencing, it confirms it's already correct: `DATABASE_EXECUTION_PLAN.md`'s execution order has backfill strictly before "begin Module 12A repository implementation." No backfill is proposed for `statement_transactions.statement_id` at all (Decision 6) — the existing values aren't deterministically recoverable, so this isn't a sequencing question for that column, it's a "don't" (Module 12B territory).

---

## Deprecation candidates — explicitly NOT acted on until Module 12B is complete

Per this phase's instruction ("Recommend deprecation only after Module 12B is complete"), the following are identified as _eventually_ redundant but are **not deprecated, marked for removal, or hidden in this phase**:

| Candidate                                                                                            | Why it looks redundant                                                                                 | Why it's not touched yet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transactions.merchant` / `.category` (free text)                                                    | Superseded in principle by the new `merchant_id`/`category_id` FKs                                     | Both workflows still write only the free-text columns (`N8N_NODE_DEPENDENCY_MAP.md`) — removing them would break every current INSERT. Revisit once Module 12B updates the workflows to populate the FK columns directly.                                                                                                                                                                                                                                                                                                |
| `accounts.account_number_last4` / `.card_last4` / `.account_last4` (three overlapping last4 columns) | `DATABASE_MIGRATIONS.sql` Phase 3.2 already documents a precedence rule across all three               | No workflow or frontend code writes to `accounts` at all yet (Check 1) — there's no current writer to migrate off any of the three, so picking one to deprecate now would be premature. Revisit once Module 8/9's Supabase repository is live and its actual write pattern is known.                                                                                                                                                                                                                                     |
| `transactions.status` / `.review_status` (two status-like columns)                                   | Their relationship to each other is undocumented upstream                                              | Their true intended meaning was never confirmed with whoever owns Workflow C Parser — deprecating a column before understanding why it exists risks losing information silently. Revisit after that conversation happens, which is naturally a Module 12B activity. **Note:** `transactions.type` is removed from this list as of this update — Decision 1 established it's the confirmed, understood OwnerType storage column (not mysterious, not a deprecation candidate), per `monthly_summaries`'s live definition. |
| `monthly_summaries` (non-`vw_`-prefixed view)                                                        | `vw_monthly_spend` (this phase) covers the same concept with the naming convention CLAUDE.md specifies | Its full definition has now been read directly (`PHASE0_VERIFICATION.md`) — it's actively load-bearing (it's what proved Decision 1), not just legacy cruft. Revisit only once something has actually migrated off reading it.                                                                                                                                                                                                                                                                                           |

None of these rows should be interpreted as a to-do for this phase or the next — they're recorded here so the _reasoning_ isn't lost by the time Module 12B is far enough along to revisit them.

---

## Net effect of this review

The original pass found `DATABASE_MIGRATIONS.sql` already additive-only and reduced its view scope (34 → 24 views, 10 deferred to `FUTURE_VIEWS.sql`). The Phase 0 update removed one column (`owner_type`, never executed), removed one redundant constraint attempt, trimmed 5 duplicate indexes, and added a purely additive trigger phase. This update adds the approved ownership architecture — 3 new `NOT NULL` columns with an in-transaction backfill (the one genuinely new risk surface this file has introduced; verified safe because neither workflow writes to the 3 affected tables) — and 7 RLS policy changes across 6 tables plus one security-tightening `DROP POLICY` on `transactions` (verified safe because both workflows authenticate as `service_role`, which none of Phase 8 touches). All 5 checks still pass. Every check above was re-verified against the current file, not assumed to still hold from either prior pass.
