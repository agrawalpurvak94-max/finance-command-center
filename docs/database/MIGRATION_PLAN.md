# Migration Plan

An ordered plan for the schema/view/RPC work [DATABASE_READINESS.md](./DATABASE_READINESS.md) identifies as needed before/during Module 12A. **No migration file has been created as part of this documentation pass** — per this task's scope, this is a plan to hand to whoever writes the actual SQL, not SQL itself. Every migration below should be written as a real, reversible file in `supabase/migrations/`, per CLAUDE.md's "MIGRATION RULES" (`Migration → Review → Test → Deployment`, "never manually edit production schema").

Ordering rule applied throughout: a migration is only listed after every migration it depends on.

---

## 0. Pre-migration: live schema inspection

- **Purpose:** Establish ground truth before writing any DDL. Every "candidate" column in [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md) and every "claimed existing" table in [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) needs to be checked against the real project.
- **Dependencies:** None — this is the first step.
- **Tables affected:** None (read-only inspection, not a migration).
- **Estimated impact:** None to production; entirely informational. High leverage — corrects every downstream estimate in this plan.
- **Rollback considerations:** N/A (no write performed).

---

## 1. `accounts` table (bank + credit card, shared)

- **Purpose:** Give Module 8 (Accounts) and Module 9 (Credit Cards) a real table to write to. Both `BankAccountRecord` and `CreditCardRecord` map here per CLAUDE.md's "NEW TABLES" list.
- **Dependencies:** Step 0 (confirm no `accounts` table already exists under a different name before creating one).
- **Tables affected:** New table `accounts`. Must include an explicit kind/type discriminator column (e.g. `kind` with values `'bank' | 'credit_card'`, mirroring the frontend's `AccountKind`) — flagged in [SUPABASE_AUDIT.md](./SUPABASE_AUDIT.md) as currently undecided anywhere in this repo's visible documentation. This decision should be made explicitly in this migration's review step, not implicitly by whoever writes the CREATE TABLE statement.
- **Estimated impact:** New table, no existing data affected. Unblocks `SupabaseBankAccountRepository` and `SupabaseCreditCardRepository`.
- **Rollback considerations:** Drop table — safe, since nothing references it yet (`Transaction.account`/`Statement.account` reference it by id today only inside the frontend's mock data, not in any real FK).

## 2. `statements` table

- **Purpose:** Give Module 4 (Statements) a real table. Statements is fully shipped in the frontend and the most immediately unblockable of the three missing-table modules once this exists.
- **Dependencies:** Step 1 (`Statement.account` needs `accounts.id` to reference).
- **Tables affected:** New table `statements`. Must resolve its relationship to the claimed-existing `statement_transactions` table (per [SUPABASE_AUDIT.md](./SUPABASE_AUDIT.md), currently undefined — likely `statement_transactions.statement_id` FK, but this needs confirming against the live table from Step 0, not assumed here).
- **Estimated impact:** New table. If `statement_transactions` already has rows with no `statement_id`, a backfill strategy is needed — cannot be assessed without Step 0.
- **Rollback considerations:** If `statement_transactions` gets a new FK column pointing at this table, that column addition should be its own reversible migration (drop column), separate from `CREATE TABLE statements`, so a rollback of one doesn't force a rollback of the other.

## 3. `clients` table

- **Purpose:** Give Module 7 (Clients) a real table — also shipped and otherwise ready.
- **Dependencies:** Step 0 only (no FK dependency on Steps 1–2).
- **Tables affected:** New table `clients`. `accounts.client_id`, `statements.client_id`, and `transactions.client_id` (if the existing `transactions` table doesn't already have one — per Step 0) would all reference it.
- **Estimated impact:** New table, no existing data affected directly. If `transactions` (existing table) needs a new `client_id` FK column retrofitted, that's a separate, higher-impact migration against a live production table — flag for extra review per CLAUDE.md's "never modify production tables directly" rule.
- **Rollback considerations:** Dropping `clients` before dropping any FK columns added to `accounts`/`statements`/`transactions` referencing it would fail on the FK constraint — rollback order must be the reverse of apply order.

## 4. Core SQL views — Transaction / Category / Merchant (existing tables, no new tables needed)

- **Purpose:** Unblock `SupabaseTransactionRepository`, `SupabaseCategoryRepository`, `SupabaseMerchantRepository` — all three read from tables CLAUDE.md claims already exist, so this step has no table-creation dependency, only a view-creation one.
- **Dependencies:** Step 0 (confirm actual `transactions`/`categories`/`merchant_memory` column names before writing views against them).
- **Tables affected:** None directly (views only) — reads `transactions`, `categories`, `merchant_memory`.
- **Views to create:** `vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_transactions_review`, `vw_transactions_duplicates`, `vw_categories` (name inferred — not in CLAUDE.md's required list, needs confirming during this step), a category-summary view, `vw_merchants`, `vw_merchant_details`, `vw_merchant_transactions`, `vw_merchant_analytics`, a merchant-summary view.
- **Estimated impact:** Read-only views, zero write risk. Can be built and tested independently of Steps 1–3.
- **Rollback considerations:** Drop view — no data risk, views are stateless.

## 5. Core SQL views — BankAccount / CreditCard / Statement / Client (depend on Steps 1–3)

- **Purpose:** Unblock the remaining four Supabase repositories.
- **Dependencies:** Steps 1, 2, 3 (the tables these views select from).
- **Tables affected:** None directly (views only) — reads `accounts`, `statements`, `clients`.
- **Views to create:** `vw_accounts`, `vw_account_summary`, `vw_account_transactions`, `vw_account_trends`, `vw_account_health`, a credit-card-specific view (name TBD — not in CLAUDE.md's list), `vw_statements`, `vw_statement_summary`, `vw_statement_transactions`, `vw_statement_processing`, `vw_statement_reconciliation`, `vw_statement_metrics`, `vw_clients` (name inferred), a client-summary view.
- **Estimated impact:** Read-only, zero write risk, but cannot be meaningfully tested until Steps 1–3's tables have real data.
- **Rollback considerations:** Drop view.

## 6. Analytics materialized views

- **Purpose:** Unblock `SupabaseAnalyticsRepository`. Per CLAUDE.md's "MATERIALIZED VIEWS" section, these should be materialized (refreshed every 5–10 minutes, never synchronously from React) rather than plain views, since they aggregate across potentially the full transaction history.
- **Dependencies:** Step 4 (reads `transactions` and joins `categories`/`merchant_memory`), Step 5 (reads `accounts`).
- **Tables affected:** None directly (materialized views) — reads `transactions`, `accounts`, `categories`, `merchant_memory`.
- **Views to create:** `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_account_analytics`, `vw_credit_utilization`, `vw_transaction_trends` — plus `rpc_refresh_materialized_views` (named in CLAUDE.md's required-RPC list) to drive the refresh cadence.
- **Estimated impact:** Read-only from the frontend's perspective; refresh cadence needs infra scheduling (cron/Edge Function), which is new operational surface, not just SQL.
- **Rollback considerations:** Drop materialized view + its refresh job together — a dangling scheduled refresh job pointing at a dropped view would error repeatedly if not removed in the same rollback.

## 7. RPC functions

- **Purpose:** Move computed logic (health scores, dashboard summary, search, dedup, reconciliation) into the database per CLAUDE.md's "database is the single source of truth" rule, replacing what the mock repositories currently compute in JS.
- **Dependencies:** Steps 1 (accounts), 4–6 (views the RPCs likely read).
- **Tables affected:** None directly — RPCs read/write existing or newly-created tables via SQL, no new tables of their own.
- **Functions to create (per CLAUDE.md's required-RPC list):** `rpc_search`, `rpc_merge_merchants`, `rpc_detect_duplicates`, `rpc_generate_monthly_summary`, `rpc_dashboard_summary`, `rpc_recalculate_health`, `rpc_refresh_materialized_views` (see Step 6), `rpc_statement_reconciliation`.
- **Estimated impact:** `rpc_recalculate_health` is the highest-priority of these per [DATABASE_READINESS.md](./DATABASE_READINESS.md) — both `BankAccountRecord.health` and `CreditCardRecord.health` currently depend on JS logic in the mock repositories (e.g. `CreditCard`'s update-time health recompute) that has no server-side equivalent yet.
- **Rollback considerations:** Drop function. If any RPC is called from a scheduled job (`rpc_refresh_materialized_views`), the job must be unscheduled in the same rollback, same reasoning as Step 6.

## 8. Deferred: `audit_logs`, `notifications`, `application_settings`

- **Purpose:** These three "NEW TABLES" from CLAUDE.md's Part 3 have no consuming frontend module yet (Settings, Module 11, is unbuilt; no `AuditLog`/`Notification` domain type exists per [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)).
- **Dependencies:** None technically, but no reason to build ahead of the module that needs them — per CLAUDE.md's "Feature Development Rules": "Do not introduce new abstractions unless reused by multiple modules" / build one module at a time.
- **Tables affected:** New tables, when their owning module is scoped.
- **Estimated impact:** None until scoped — intentionally deferred, not overlooked.
- **Rollback considerations:** N/A until designed.

## 9. RLS policies

- **Purpose:** Per CLAUDE.md Part 1, this is a single-tenant app ("NOT a SaaS platform... only one client") — RLS is likely simple, but no policy exists anywhere in this repo, and CLAUDE.md doesn't specify one.
- **Dependencies:** Steps 1–3 (tables must exist before policies can attach to them), Supabase Auth being wired up (Module 12A's own scope — "Authentication" is explicitly part of that module's goal).
- **Tables affected:** All new and existing tables, per whatever policy is decided.
- **Estimated impact:** Unknown until a decision is made — could be as simple as "authenticated user can read/write everything" given the single-tenant scope, or could need per-table policies if any future multi-user support (explicitly called "optional" future work in CLAUDE.md) is anticipated.
- **Rollback considerations:** Disabling RLS on a table with existing policies vs. dropping individual policies are different operations with different blast radius — should be decided explicitly when this step is actually planned, not deferred to migration-time judgment.

---

## Summary order

```
0. Live schema inspection
1. accounts table (+ kind discriminator)
2. statements table (+ statement_transactions relationship)
3. clients table
4. Views: Transaction / Category / Merchant  (parallel with 1–3, needs only 0)
5. Views: BankAccount / CreditCard / Statement / Client  (needs 1, 2, 3)
6. Analytics materialized views  (needs 4, 5)
7. RPC functions  (needs 1, 4, 5, 6)
8. audit_logs / notifications / application_settings  (deferred, module-triggered)
9. RLS policies  (needs 1-3 + Module 12A's Auth work)
```

This plan does not itself authorize or schedule Module 12A — per this session's stop condition, it is handed off for approval alongside the rest of this documentation pass.
