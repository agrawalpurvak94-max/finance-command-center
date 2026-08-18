# REPOSITORY_IMPLEMENTATION_PLAN.md

Plan for how each `Mock*Repository` will be replaced by a `Supabase*Repository` in Module 12A, once the schema in [DATABASE_MIGRATIONS.sql](DATABASE_MIGRATIONS.sql) has been applied and verified. **No repository code is written or changed by this document** — this is planning only, per the Database Foundation phase's Step 7. Per CLAUDE.md's service-layer rule, every `Supabase*Repository` implements the same `*Repository` interface the mock does; hooks/components do not change.

All current mock repositories share the same shape, confirmed by reading `mock-transaction.repository.ts`: pure in-memory arrays (`mock-data/generate-*.ts`), a `withLatency()` helper that wraps every method in an artificial `setTimeout` (~350ms) to simulate network latency, and client-side `matchesFilters`/sort/paginate logic. None persist across a page reload — every mock repository re-seeds from its generator module on each session. This is true for all 8 repositories below unless noted otherwise.

---

## TransactionRepository

**Current mock implementation** (`mock-transaction.repository.ts`): in-memory array from `generate-transactions.ts`, cross-referencing `mockAccounts`/`mockCategories`/`mockClients`/`mockMerchants` from `reference-data.ts` to build fully-embedded `Transaction` objects (`merchant`/`category`/`client`/`account` as full nested objects, never just IDs). Filtering/sorting/pagination all happen in JS over the full in-memory array.

**Future Supabase query:**

| Method                   | Backing view/table                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list(params)`           | `vw_transactions` — filter with `.eq`/`.ilike`/`.gte`/`.lte` per `TransactionFilters`, paginate with `.range()`, sort with `.order()`                                                                                                                                                                                                                                          |
| `getById(id)`            | `vw_transaction_details` — `.eq('id', id).single()`                                                                                                                                                                                                                                                                                                                            |
| `create(input)`          | `INSERT INTO transactions` (base table, not the view)                                                                                                                                                                                                                                                                                                                          |
| `update(id, patch)`      | `UPDATE transactions WHERE id = :id` (base table)                                                                                                                                                                                                                                                                                                                              |
| `bulkUpdate(ids, patch)` | `UPDATE transactions WHERE id = ANY(:ids)`                                                                                                                                                                                                                                                                                                                                     |
| `delete` / `bulkDelete`  | `DELETE FROM transactions WHERE id = ...` — confirm this is actually desired; CLAUDE.md's Part 3 favors soft deletes ("Never physically delete important financial data") but `transactions` has no `deleted_at` column today. **Flagged, not resolved**: either add `deleted_at` in a follow-up migration, or confirm hard delete is intentional for this table specifically. |
| `listCategories()`       | `SELECT id, name FROM categories WHERE status = 'active'`                                                                                                                                                                                                                                                                                                                      |
| `listClients()`          | `SELECT id, client_name AS name FROM clients WHERE is_active`                                                                                                                                                                                                                                                                                                                  |
| `listMerchants()`        | `SELECT id, display_name AS name FROM merchant_memory WHERE status = 'active'`                                                                                                                                                                                                                                                                                                 |
| `listAccounts()`         | `SELECT id, ... FROM vw_accounts` mapped to `TransactionAccount` shape                                                                                                                                                                                                                                                                                                         |

**Required joins:** `vw_transactions` already resolves merchant/category/client/account (see `DATABASE_MIGRATIONS.sql`) — the repository should not re-join in application code, per CLAUDE.md's "Avoid: React → Join Multiple Tables."

**Required views:** `vw_transactions`, `vw_transaction_details`, `vw_transaction_search` (for a future search-specific method if one is added), `vw_transactions_review`, `vw_transactions_duplicates`.

**Mapping logic:**

- `status`: `vw_transactions.status` is already normalized to the domain `TransactionStatus` vocabulary by the view's `CASE` expression — no further mapping needed in the repository, which is the correct layer per CLAUDE.md ("Business logic belongs in... SQL Views... Never inside React Components").
- `account`: `Transaction.account: TransactionAccount` is non-nullable, but `vw_transactions.account_id` can be null (per `SUPABASE_AUDIT.md`, every live row is null today). **This is the one field the repository cannot honestly satisfy from current data.** See "Temporary compatibility layer" below.
- `create()`: `TransactionCreateInput` takes `merchantName: string` and `accountId: string`, not full objects — the repository must resolve `merchantName` to a `merchant_memory` row (create one via `upsert_merchant_memory` RPC if it doesn't exist) before inserting, since the base `transactions` table's `merchant_id` FK needs a real id.

**Temporary compatibility layer needed:** Until `transactions.account_id` is backfilled (see `DATABASE_MIGRATIONS.sql`'s backfill strategy) or Workflow A/D is fixed to populate it (`N8N_DATABASE_MAPPING.md`), `SupabaseTransactionRepository.list()`/`.getById()` will receive rows with `account_id IS NULL`. Since `Transaction.account` is non-nullable, the repository needs one of:

1. A fallback synthetic `TransactionAccount` (e.g. resolved from the free-text `bank_name`/`card_last4` columns against `accounts` at read time, matching the same heuristic `DATABASE_MIGRATIONS.sql`'s backfill SELECT proposes), or
2. Filter out unresolvable rows from `list()` results with a visible count/banner ("N transactions missing account data"), or
3. Widen the domain model to make `account` nullable.

Option 3 changes `src/domain/Transaction.ts`, which is frozen architecture per CLAUDE.md — not decided here; flagged for the project owner. Option 1 is the least invasive and is recommended as the default, but is explicitly a **temporary** layer that should be removed once account linkage is fixed at the source.

---

## CategoryRepository

**Current mock implementation** (interface only reviewed; `mock-category.repository.ts` follows the same in-memory/`withLatency` pattern as Transactions, backed by `generate-categories.ts`).

**Future Supabase query:**

| Method              | Backing view/table                                                                                                                                                                                                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(params)`      | `vw_categories`                                                                                                                                                                                                                                                                         |
| `getSummary()`      | Aggregate query over `vw_categories` (`count(*)`, `count(*) filter (where status='active')`, etc.) — small enough not to need its own view                                                                                                                                              |
| `create(input)`     | `INSERT INTO categories`                                                                                                                                                                                                                                                                |
| `update(id, input)` | `UPDATE categories WHERE id = :id`                                                                                                                                                                                                                                                      |
| `delete(id)`        | `DELETE FROM categories WHERE id = :id` — check for FK references from `transactions.category_id`/`merchant_memory.default_category_id` first; CLAUDE.md favors extend-not-break, so consider a soft "retire" (`status = 'inactive'`) instead of hard delete when referenced rows exist |

**Required joins:** `vw_categories` already resolves `parent_category_id` → name and computes `transaction_count`/`merchants_assigned`.

**Required views:** `vw_categories`.

**Mapping logic:** `CategoryRecord.parentCategory: Category | null` maps from `vw_categories.parent_category_id` + `.parent_category_name` — repository composes the nested `{id, name}` object from those two flat columns.

**Temporary compatibility layer needed:** None structurally — once `DATABASE_MIGRATIONS.sql` Phase 2.1 runs, every `CategoryRecord` field has a real column. The only soft gap is `transaction_count`/`merchants_assigned` reading low/zero until `transactions.category_id` and `merchant_memory.default_category_id` are backfilled — same underlying cause as Transactions' gap, not a Categories-specific issue.

---

## MerchantRepository

**Current mock implementation**: in-memory, same pattern, backed by `generate-merchants.ts`.

**Future Supabase query:**

| Method              | Backing view/table                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `list(params)`      | `vw_merchants`                                                                                                     |
| `getSummary()`      | Aggregate over `vw_merchants`                                                                                      |
| `create(input)`     | `INSERT INTO merchant_memory`                                                                                      |
| `update(id, input)` | `UPDATE merchant_memory WHERE id = :id`                                                                            |
| `delete(id)`        | `DELETE FROM merchant_memory WHERE id = :id` — same FK-reference caveat as Categories (`transactions.merchant_id`) |

**Required joins:** `vw_merchants` resolves `default_category_id` → name.

**Required views:** `vw_merchants`, `vw_merchant_details`, `vw_merchant_transactions` (detail-page drill-down), `vw_merchant_analytics` (detail-page trend chart).

**Mapping logic:**

- `MerchantRecord.aliases: readonly string[]` maps directly from `merchant_memory.aliases` (the new array column) — but per `N8N_DATABASE_MAPPING.md`, Workflow C currently creates one row per alias variant rather than populating this array. Until that's fixed at the workflow level, `aliases` will read as `[]` for every merchant even though semantically-equivalent rows exist elsewhere in the table. **The repository should not attempt to auto-detect and merge these at read time** — that's a data-quality/dedup decision (see MergeDialog in Module 6's UI, which already exists for exactly this) — surfacing empty `aliases` honestly is correct until a real merge happens.
- `hasRules: boolean` maps from the new `has_rules` column, defaulted `false`.

**Temporary compatibility layer needed:** None beyond the `aliases` honesty note above — no fallback needed, just don't paper over it.

---

## ClientRepository

**Current mock implementation**: in-memory, backed by `generate-clients.ts`.

**Future Supabase query:**

| Method              | Backing view/table                                                                                                                                                                                 |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list(params)`      | `vw_client_summary`                                                                                                                                                                                |
| `getSummary()`      | Aggregate over `vw_client_summary`                                                                                                                                                                 |
| `create(input)`     | `INSERT INTO clients` — note `ClientCreateInput.clientType` is required at create time (unlike update, which omits it — clients aren't allowed to change type after creation per the domain model) |
| `update(id, input)` | `UPDATE clients WHERE id = :id` (excludes `client_type`, matching `ClientUpdateInput`)                                                                                                             |
| `delete(id)`        | `DELETE FROM clients WHERE id = :id` — check `accounts.client_id`/`statements.client_id`/`transactions.client_id` references first                                                                 |

**Required joins:** `vw_client_summary` aggregates `transactions`/`accounts`/`statements` by `client_id`; `topCategories`/`topMerchants` come from the separate `vw_client_top_categories`/`vw_client_top_merchants` views (kept apart since they're one-to-many per client, unlike the rest of `ClientRecord`).

**Required views:** `vw_client_summary`, `vw_client_top_categories`, `vw_client_top_merchants`.

**Mapping logic:** `ClientRecord.topCategories`/`.topMerchants` require two extra queries per client (or a batched query filtered to `rank <= 5`) beyond the main `vw_client_summary` row — the repository's `list()` should decide whether to N+1 this per row or batch-fetch top-N for all listed client ids in one query and zip client-side; recommend the latter for a `list()` call, the former is fine for `getById`-style single-client reads (note: `ClientRepository` interface has no `getById` today — only `list`/`getSummary`/`create`/`update`/`delete` — so this only matters if the frontend later adds a client detail page needing single-client depth).

**Temporary compatibility layer needed:** `linkedAccountsCount`/`linkedCreditCardsCount`/`linkedStatementsCount` will read `0` for every client until `accounts.client_id`/`statements.client_id` are populated (both new, both null on every existing row — no workflow writes them, and they're out of scope for backfill since there's no reliable source data to infer client ownership from). This is an honest `0`, not a bug — no compatibility shim should hide it.

---

## BankAccountRepository / CreditCardRepository

Both interfaces map onto the same physical `accounts` table (discriminated by `account_type`), so they're planned together.

**Current mock implementation**: `mock-bank-account.repository.ts` / `mock-credit-card.repository.ts`, in-memory, backed by `generate-bank-accounts.ts` / `generate-credit-cards.ts`. Both share the same `id` space with the Transactions/Statements mock reference data by design (per `DOMAIN_MODEL.md`'s note on `BankAccountRecord`/`CreditCardRecord`) — the Supabase equivalent of this is simply that both repositories read from the same `accounts` table filtered by kind, so id-sharing is automatic, not something the repository needs to engineer.

**Future Supabase query:**

| Method                            | Backing view/table                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `BankAccountRepository.list()`    | `vw_accounts WHERE account_kind = 'bank'`                                                                                                                                                                                                                                                                                           |
| `CreditCardRepository.list()`     | `vw_accounts WHERE account_kind = 'credit_card'` (or `vw_credit_card_utilization` for the utilization-specific fields)                                                                                                                                                                                                              |
| `getSummary()` (both)             | `vw_account_summary WHERE account_kind = ...`                                                                                                                                                                                                                                                                                       |
| `create(input)` (both)            | `INSERT INTO accounts` — repository sets `account_type` to the right one of `'Savings'/'Current'/'Overdraft'` (bank) or `'Credit Card'` (credit card) so the CHECK constraint in `DATABASE_MIGRATIONS.sql` Phase 3.1 passes                                                                                                         |
| `update(id, input)` (both)        | `UPDATE accounts WHERE id = :id` — both `*UpdateInput` types are narrow (nickname/status/notes, +creditLimit for cards), matching the fact that balance/type/bank aren't editable post-creation per the domain model                                                                                                                |
| `delete(id)` (both)               | `DELETE FROM accounts WHERE id = :id` — check `transactions.account_id`/`statements.account_id` references first                                                                                                                                                                                                                    |
| `BankAccountRepository.syncAll()` | No current backing — this method has no n8n counterpart that "syncs" account balances on demand. Needs either a new RPC (`rpc_sync_accounts`, not in CLAUDE.md's required list) or should call something that updates `accounts.updated_at`/`sync_status` at minimum. **Flagged as needing a product decision**, not resolved here. |

**Required joins:** `vw_accounts` resolves `client_id` → name and the last4/status precedence rules from `DATABASE_MIGRATIONS.sql` Phase 3.2.

**Required views:** `vw_accounts`, `vw_account_summary`, `vw_account_transactions`, `vw_account_trends`, `vw_account_health`, `vw_credit_utilization` (Analytics-facing) / `vw_credit_card_utilization` (Credit-Cards-module-facing).

**Mapping logic:**

- `last4`: repository reads `vw_accounts.resolved_last4` (already applies the `account_number_last4 > card_last4 > account_last4` precedence) rather than picking a column itself.
- `status`: reads `vw_accounts.resolved_is_active` similarly.
- `health` (`BankAccountHealth`/`CreditCardHealth`): reads from `vw_account_health` — a second query per list, or a join the repository does itself since `vw_accounts` doesn't currently include health (kept separate because the threshold logic in `vw_account_health` is explicitly marked provisional in `DATABASE_MIGRATIONS.sql` and may need to change independently of the base account projection).
- `topMerchant`/`topCategory` (both records): not backed by any view in this phase — would need a `vw_account_top_merchant`/`vw_account_top_category` pair analogous to the Clients ones, which wasn't in `MIGRATION_PLAN.md`'s scope. **Gap carried forward, not closed in this phase.**

**Temporary compatibility layer needed:** Every balance/limit/network field (`current_balance`, `available_credit`, `credit_limit`, `card_network`) is `NULL` on all 7 live rows (`SUPABASE_AUDIT.md`). The repository should render these as explicit "not yet synced" states in the UI layer (already partially supported — `BankAccountHealth` includes `sync_required`), not coerce nulls to `0`, since a real `0` balance and an unknown balance are different facts.

---

## StatementRepository

**Current mock implementation**: in-memory, backed by `generate-statements.ts`.

**Future Supabase query:**

| Method          | Backing view/table                                                                                                                                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `list(params)`  | `vw_statements`                                                                                                                                                                                                                                                                                              |
| `getById(id)`   | `vw_statements WHERE id = :id` (single)                                                                                                                                                                                                                                                                      |
| `getSummary()`  | `vw_statement_summary`                                                                                                                                                                                                                                                                                       |
| `create(input)` | `INSERT INTO statements` — this is the one repository method that would give the frontend an _actual_ path to populate `statements`, independent of fixing Workflow D (see `N8N_DATABASE_MAPPING.md`'s top recommendation)                                                                                   |
| `reprocess(id)` | No current backing — there's no RPC or workflow re-trigger mechanism reachable from Supabase alone; this likely needs to call an n8n webhook or Edge Function, which is out of scope for a schema-only phase. **Flagged, not resolved.**                                                                     |
| `delete(id)`    | `DELETE FROM statements WHERE id = :id` — cascades conceptually to `statement_transactions.statement_id`, but there's no `ON DELETE` behavior defined on that FK relationship (it isn't even a registered FK today, per `SUPABASE_AUDIT.md`) — worth deciding cascade behavior when/if that FK is formalized |

**Required joins:** `vw_statements` resolves `account_id`/`client_id` and computes a live `transactions_extracted` count from `statement_transactions`.

**Required views:** `vw_statements`, `vw_statement_summary`, `vw_statement_transactions`, `vw_statement_processing`, `vw_statement_reconciliation`, `vw_statement_metrics`.

**Mapping logic:** `Statement.statementPeriodLabel: string` is a single formatted label the domain model expects, but the table stores `statement_period_start`/`statement_period_end` as two separate dates — the repository (not the view, per the view's own comment) is the right layer to format this into a label string, since it's a presentation concern, not business logic.

**Temporary compatibility layer needed:** This is the module most blocked by live data, not schema. Every view above will return zero/empty results until Workflow D actually creates `statements` rows (see `N8N_DATABASE_MAPPING.md`). The repository itself needs no special-casing — it's structurally correct — but the module's empty state (already required per CLAUDE.md: "Every module should have... Empty State") will be what every user actually sees until that's fixed, so make sure the empty-state copy doesn't imply "no statements have ever been imported" when the real situation is "statements aren't being linked yet."

---

## AnalyticsRepository

**Current mock implementation** (`mock-analytics.repository.ts`, 672 lines — by far the largest mock repository, computing every aggregate client-side over the full mock transaction set).

**Future Supabase query:**

| Method                                                    | Backing view/table                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getSummary(filters)`                                     | Aggregate over `vw_transactions` filtered per `AnalyticsFilters`, plus `vw_monthly_spend` for the trend comparison fields                                                                                                                                                                                                                                                                          |
| `getSpendTrend(filters, granularity)`                     | `vw_transaction_trends`, re-bucketed from daily to the requested `AnalyticsGranularity` with `date_trunc(:granularity, day)` at query time                                                                                                                                                                                                                                                         |
| `getOwnerTypeSpend(filters)`                              | `vw_monthly_spend` grouped by `owner_type` — will read all-personal-and-business-zero until `transactions.owner_type` is populated (same gap as `monthly_summaries` today)                                                                                                                                                                                                                         |
| `getCategorySpend(filters)`                               | `vw_category_spend`                                                                                                                                                                                                                                                                                                                                                                                |
| `getMerchantSpend(filters)`                               | `vw_merchant_spend`                                                                                                                                                                                                                                                                                                                                                                                |
| `getClientSpend(filters)`                                 | New — not in `MIGRATION_PLAN.md`'s view list; can reuse `vw_client_summary` filtered/sorted into `AnalyticsRankedRow` shape, or a small dedicated view if the repository-side reshaping proves awkward                                                                                                                                                                                             |
| `getCreditCardSpend(filters)`                             | `vw_account_analytics WHERE account_kind = 'credit_card'`, reshaped into `AnalyticsCardSeriesResult`'s per-card-column pivot — this pivot (one column per card) is naturally a repository-side transform of a long/tidy view result, not something to force into the view itself                                                                                                                   |
| `getBankAccountActivity(filters)`                         | `vw_account_analytics WHERE account_kind = 'bank'` for the `byAccount` ranked list; the `credits`/`debits`/`net` point series needs the same debit/credit heuristic flagged as provisional in `DATABASE_MIGRATIONS.sql`'s Phase 7 header                                                                                                                                                           |
| `getHighestTransactions` / `getLargestExpenses` (filters) | `vw_transactions ORDER BY amount DESC LIMIT N` — these two methods look identical in shape; check with the mock implementation whether they're meant to differ (e.g. by owner_type or date window) before assuming they can share one query                                                                                                                                                        |
| `getRecurringMerchants(filters)`                          | No current backing — `is_recurring` exists as a column but is never set by either workflow (`N8N_DATABASE_MAPPING.md`); this needs either a recurrence-detection RPC (`rpc_detect_duplicates`-adjacent, not in CLAUDE.md's list under this exact name) or a heuristic view grouping by merchant+amount+~monthly cadence. **Not designed in this phase** — flagged as needing its own scoping pass. |
| `getRefundAnalysis(filters)`                              | No current backing — needs the same debit/credit-direction signal flagged as provisional throughout this phase; a refund is presumably an inflow on a normally-outflow account, but there's no reliable column to detect that today                                                                                                                                                                |
| `getInsights(filters)`                                    | No current backing — `AnalyticsInsight` (severity/title/description/actionFilter) implies rule-based analysis (e.g. "spending up 20% this month") that belongs in an RPC (`rpc_generate_monthly_summary`-adjacent) rather than a plain view, per CLAUDE.md's "RPC should be used when Business Logic needs Parameters or Requires Complex Processing." Not designed in this phase.                 |
| `listBankNames()`                                         | `SELECT DISTINCT institution_name FROM accounts` (or `bank_name` from `transactions` as a fallback while `account_id` is unbackfilled)                                                                                                                                                                                                                                                             |

**Required joins:** all of the above lean on `vw_transactions`/`vw_category_spend`/`vw_merchant_spend`/`vw_account_analytics` already doing the FK resolution — Analytics should never join raw tables itself.

**Required views:** every Analytics view listed in `DATABASE_MIGRATIONS.sql` Phase 7's Analytics section, plus `vw_client_summary` (reused from Clients) for `getClientSpend`.

**Mapping logic:** `AnalyticsFilters` is a superset of `TransactionFilters` — the repository should build one shared filter-application helper (e.g. a query-builder function taking `AnalyticsFilters` and applying `.eq`/`.gte`/etc. to a Supabase query) reused across every method here, rather than duplicating filter logic 13 times (one per interface method) — this mirrors the "reusable hooks/utility functions" rule in `PRODUCT_DECISIONS.md`.

**Temporary compatibility layer needed:** This is the repository most exposed to every gap documented elsewhere in this phase simultaneously — unbackfilled `account_id`/`merchant_id`/`category_id`, unpopulated `owner_type`/`is_recurring`, and the provisional debit/credit heuristic all compound here. Recommend implementing Analytics _last_ among the 8 repositories in Module 12A's actual build order, once the others have proven the underlying views are correct against real data — not because it's architecturally harder, but because it's the best integration-test surface for everything upstream.

---

## Cross-repository notes

- **No repository should compute aggregates client-side.** Every `*Summary`/`*Analytics` method above resolves to a view or a view-plus-light-reshaping, never a raw table scan with in-JS math — this is the one rule carried through every repository above without exception, per CLAUDE.md's Database Philosophy.
- **Latency simulation (`withLatency`) goes away entirely** — Supabase's real network latency replaces it; no repository needs to reintroduce an artificial delay.
- **No mock repository persists data across a reload; Supabase will.** This is a behavior change worth calling out to whoever tests Module 12A manually — bugs that "go away on refresh" today (because the mock re-seeds) will not go away on refresh once real persistence is live, which may surface issues that were previously masked.
- **Every `delete`/`bulkDelete` method across every repository** currently assumes hard delete (matching the mock's `Array.filter`), but CLAUDE.md Part 3 says "Never physically delete important financial data. Use soft deletes where required." None of the tables gain a `deleted_at` column in this phase's migration (out of `MIGRATION_PLAN.md`'s scope) — this is a real open question for whoever scopes the Module 12A repository implementations, flagged consistently above per-repository rather than assumed away.
