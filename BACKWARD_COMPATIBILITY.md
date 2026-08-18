# BACKWARD_COMPATIBILITY.md

Compatibility review of [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql) against the 5 checks requested for this phase, grounded in [N8N_NODE_DEPENDENCY_MAP.md](N8N_NODE_DEPENDENCY_MAP.md)'s node-by-node read of both live workflows (not assumption). **No SQL has been executed.** This review was performed against the migration file as already generated; where it found the file already compliant, no rewrite was needed — where it identified an opportunity to reduce risk further (the view-scope reduction), that's applied in the same pass as this document, per the "minimize the initial migration" instruction.

---

## Check 1 — Existing n8n workflows will continue to function

**Verdict: ✅ Pass, verified against the actual node graph, not inferred.**

`N8N_NODE_DEPENDENCY_MAP.md`'s combined table→node index confirms both workflows only touch `transactions`, `merchant_memory`, `categories`, and `statement_transactions`. Every operation either workflow performs against those tables is a `SELECT`, an `INSERT`, or an `UPSERT` naming an explicit, fixed set of columns — none of them reference `SELECT *` or send a payload built by introspecting the table schema at runtime, so adding new nullable columns cannot change what either workflow sends or receives.

Specifically:

- All 12 new/changed columns in `DATABASE_MIGRATIONS.sql` Phases 1–3 (`transactions.merchant_id/category_id/owner_type/duplicate_of_id`, `categories.description/parent_category_id/status/color/icon/updated_at`, `merchant_memory.aliases/default_category_id/status/notes/has_rules`, `clients.client_type`, `accounts.client_id`, `statements.client_id`) are nullable with no `NOT NULL` requirement — an `INSERT` that omits them (which is what both workflows do, since they don't know these columns exist) succeeds exactly as before.
- The one `CHECK` constraint added to an _existing_ column (`accounts.account_type`, Phase 3.1) cannot be violated by either workflow, because neither workflow ever writes to `accounts` at all (confirmed in the dependency map's reverse-lookup table — zero nodes reference `/accounts` or `tableId: "accounts"`).
- The two `CHECK` constraints on brand-new columns (`transactions.owner_type`, `categories.status`, `merchant_memory.status`) only constrain values _if provided_; since no workflow node sets these fields, they stay at their column default and the constraint is never evaluated against workflow-supplied data.
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
- `/rest/v1/vw_dashboard_summary`, `/rest/v1/vw_dashboard_accounts`, `/rest/v1/monthly_summaries` — **explicitly not touched** by this migration (see `DATABASE_MIGRATIONS.sql` Phase 7's header note) precisely because their current query definitions were never inspected via direct SQL access, only their output columns via this same REST introspection. Redefining them without seeing `pg_get_viewdef` output first would be guessing, not extending.
- `/rest/v1/rpc/lookup_merchant`, `/rest/v1/rpc/upsert_merchant_memory` — untouched; no function signature is modified anywhere in this migration.
- New endpoints appear (`/rest/v1/application_settings`, `/rest/v1/audit_logs`, `/rest/v1/notifications`, and one endpoint per new view) — additive only, cannot collide with or shadow an existing endpoint since every new name is checked against the existing 13-relation list from `SUPABASE_AUDIT.md` and none overlap.
- One endpoint's _permissions_ change: `vw_dashboard_accounts` loses `INSERT`/`UPDATE`/`DELETE` grants (Phase 6). `GET` is untouched. This is the one item in the whole migration that isn't purely additive — see the dedicated note below.

---

## Check 4 — Existing Workflow A/B/C (CLAUDE.md's conceptual names) remain backward compatible

**Verdict: ✅ Pass — same evidence as Check 1.**

Per `N8N_DATABASE_MAPPING.md`'s naming reconciliation, CLAUDE.md's "Workflow A/B/C" map onto the two actual files (`Workflow C Parser` covers both A and C's concepts; `Workflow D` covers B's concept) — there is no fourth, separately-named workflow to check. Check 1's analysis covers both files exhaustively.

---

## Check 5 — Extend rather than replace/rename

**Verdict: ✅ Already compliant — confirmed by a full statement-by-statement re-read of `DATABASE_MIGRATIONS.sql`.**

| Statement type                                    | Count                                                     | Renames/removals?                                                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`        | 16 columns across 5 existing tables                       | 0 — no `DROP COLUMN`, no `RENAME COLUMN`, no `ALTER COLUMN ... TYPE` anywhere in the file                                                                  |
| `ALTER TABLE ... ADD CONSTRAINT` (via `DO` block) | 1 (`accounts_account_type_check`)                         | 0 — additive constraint on an existing column, not a retype                                                                                                |
| `CREATE TABLE IF NOT EXISTS`                      | 3 (`application_settings`, `audit_logs`, `notifications`) | 0 — none of the 10 existing tables are touched by a `CREATE TABLE`                                                                                         |
| `CREATE INDEX IF NOT EXISTS`                      | 14                                                        | 0                                                                                                                                                          |
| `CREATE OR REPLACE VIEW`                          | 34 (pre-pruning; see below)                               | 0 for new views. 0 for the 3 pre-existing views, since none are redefined                                                                                  |
| `REVOKE`                                          | 1 (`vw_dashboard_accounts` write grants)                  | Not a rename/removal of data or schema — a permissions tightening, reversible with a documented `GRANT` (see `DATABASE_MIGRATIONS.sql`'s rollback section) |

No column this migration adds duplicates the _meaning_ of an old one without keeping the old one — e.g. `transactions.merchant_id`/`category_id` are added **alongside**, not instead of, the existing free-text `merchant`/`category` columns, exactly per this phase's "keep old columns temporarily for backward compatibility" instruction. Same pattern for `categories.status` (new) vs. nothing being removed, `clients.client_type` (new) vs. `client_name` (untouched).

---

## Backfill-before-code-change confirmation

`DATABASE_MIGRATIONS.sql`'s own "BACKFILL STRATEGY" section already sequences backfill as a separate, reviewed step _after_ the migration and _before_ any repository code is written — this phase doesn't change that sequencing, it confirms it's already correct: `DATABASE_EXECUTION_PLAN.md`'s execution order has backfill (step 5) strictly before "begin Module 12A repository implementation" (step 7).

---

## Deprecation candidates — explicitly NOT acted on until Module 12B is complete

Per this phase's instruction ("Recommend deprecation only after Module 12B is complete"), the following are identified as _eventually_ redundant but are **not deprecated, marked for removal, or hidden in this phase**:

| Candidate                                                                                            | Why it looks redundant                                                                                                   | Why it's not touched yet                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `transactions.merchant` / `.category` (free text)                                                    | Superseded in principle by the new `merchant_id`/`category_id` FKs                                                       | Both workflows still write only the free-text columns (`N8N_NODE_DEPENDENCY_MAP.md`) — removing them would break every current INSERT. Revisit once Module 12B updates the workflows to populate the FK columns directly.                                                            |
| `accounts.account_number_last4` / `.card_last4` / `.account_last4` (three overlapping last4 columns) | `DATABASE_MIGRATIONS.sql` Phase 3.2 already documents a precedence rule across all three                                 | No workflow or frontend code writes to `accounts` at all yet (Check 1) — there's no current writer to migrate off any of the three, so picking one to deprecate now would be premature. Revisit once Module 8/9's Supabase repository is live and its actual write pattern is known. |
| `transactions.status` / `.type` / `.review_status` (three status-like columns)                       | `type` and `review_status` don't cleanly correspond to any domain concept (`DATABASE_MIGRATIONS.sql` Phase 1.4 comments) | Their true intended meaning was never confirmed with whoever owns Workflow C Parser — deprecating a column before understanding why it exists risks losing information silently. Revisit after that conversation happens, which is naturally a Module 12B activity.                  |
| `monthly_summaries` (non-`vw_`-prefixed view)                                                        | `vw_monthly_spend` (this phase) covers the same concept with the naming convention CLAUDE.md specifies                   | `monthly_summaries`'s actual query definition was never inspected (Check 3) — it may have callers or behavior not yet accounted for. Revisit only after reading its real definition via direct DB access.                                                                            |

None of these four rows should be interpreted as a to-do for this phase or the next — they're recorded here so the _reasoning_ isn't lost by the time Module 12B is far enough along to revisit them.

---

## Net effect of this review

No changes were required to `DATABASE_MIGRATIONS.sql`'s Phases 1–6 (schema changes) — they were already additive-only. The one change this review directly produced is the view-scope reduction requested alongside it: 10 of the file's 34 views, identified as not consumed by any current repository interface method or built frontend component, are moved to `FUTURE_VIEWS.sql` — see `VIEW_USAGE_MATRIX.md` for the per-view evidence. This reduces the initial migration's surface area without weakening any of the 5 checks above (view additions were already the lowest-risk statement type in the file).
