# PHASE0_VERIFICATION.md

Phase 0 verification (per `DATABASE_EXECUTION_PLAN.md`), run against the live database via a direct Postgres connection for the first time this project — every prior audit (`SUPABASE_AUDIT.md`, `DATABASE_SCHEMA.md`, etc.) was built from PostgREST REST introspection only, which cannot see RLS policies, indexes, triggers, or constraints. This document is what closes that gap.

**Connection method:** a direct `postgresql://` connection string, provided via chat and never echoed back — read once into a local file outside the git repository (`%TEMP%/claude/.../scratchpad/db.env`, not tracked, not committed), used from a disposable Node script. Connected as the `postgres` role (table owner — bypasses RLS, same as the `service_role` REST key does).

**Nothing was modified.** Every query below is read-only (`SELECT` against `pg_catalog`/`information_schema`, or plain row counts). `DATABASE_MIGRATIONS.sql` and `DATABASE_SEED.sql` were **not** executed.

---

## 1. What was found

### RLS status — enabled everywhere, but policy coverage is uneven

All 10 existing tables have `rowsecurity = true`. But policies only exist on **4 of the 10**:

| Table                    | RLS enabled | Policies                                                                 |
| ------------------------ | ----------- | ------------------------------------------------------------------------ |
| `transactions`           | ✅          | 5 policies (see §6 below — one is a real gap)                            |
| `categories`             | ✅          | 2 policies (own rows + a `user_id IS NULL` read-all for shared defaults) |
| `banks`                  | ✅          | 1 policy (own rows, all actions)                                         |
| `email_sources`          | ✅          | 1 policy (own rows, all actions)                                         |
| `accounts`               | ✅          | **0 policies**                                                           |
| `clients`                | ✅          | **0 policies**                                                           |
| `merchant_memory`        | ✅          | **0 policies**                                                           |
| `processed_messages`     | ✅          | **0 policies**                                                           |
| `statement_transactions` | ✅          | **0 policies**                                                           |
| `statements`             | ✅          | **0 policies**                                                           |

RLS enabled + zero policies means **Postgres denies every row to every role except the table owner/superuser** (`postgres`, which is what this connection used, and `service_role`, which bypasses RLS by design). This is why the REST audit — run with the `service_role` key — could read everything and never noticed. It's not a false negative in the earlier audit; it's exactly the unknown `DATABASE_READINESS.md` §1 flagged as unconfirmed.

**Does not block today's migration** (it runs as `postgres`/owner). **Does block Module 12A going live**: the moment a repository uses an `anon` or `authenticated` key against `accounts`, `clients`, `merchant_memory`, `processed_messages`, `statement_transactions`, or `statements`, every query returns zero rows — not an error, just silently empty. This needs policies added (mirroring the `own_*_all` pattern already used on `banks`/`email_sources`/`categories`) before those repositories can go live, not before this migration runs.

### Indexes — mostly already exist, under different names than the migration assumes

`DATABASE_MIGRATIONS.sql` Phase 5a would create several indexes that are **functionally redundant** with ones that already exist under different names:

| Migration's planned index                 | Already covered by                                                                                  | Column                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `idx_transactions_account_id`             | `idx_transactions_account` (existing)                                                               | `transactions.account_id`             |
| `idx_transactions_client_id`              | `idx_transactions_client` (existing)                                                                | `transactions.client_id`              |
| `idx_transactions_statement_id`           | `idx_transactions_statement` (existing)                                                             | `transactions.statement_id`           |
| `idx_transactions_transaction_date`       | `idx_transactions_date` **and** `idx_tx_date` (existing, and already duplicated between themselves) | `transactions.transaction_date`       |
| `idx_merchant_memory_normalized_merchant` | `idx_merchant_memory` (existing)                                                                    | `merchant_memory.normalized_merchant` |

Running Phase 5a as written wouldn't error (`CREATE INDEX IF NOT EXISTS` only checks the _index name_, not whether an equivalent index exists on the same column) — it would just create duplicate indexes maintaining the same lookups twice.

Genuinely missing and worth keeping from the migration: `idx_transactions_merchant_id`, `idx_transactions_category_id`, `idx_transactions_duplicate_of_id` (all for new columns — can't already exist), `idx_merchant_memory_default_category_id` (new column), `idx_statement_transactions_statement_id` (**confirmed missing** — no index on `statement_id` exists on `statement_transactions` today, despite that table now having 2,746 rows), `idx_statements_account_id`, `idx_statements_client_id`, `idx_accounts_client_id`, `idx_categories_parent_category_id` (all new columns/tables).

Already well-indexed and not touched by the migration either way: `transactions.status`, `.type`, `.review_status`, `.merchant`, `.category`, `.source_message_id`, `.user_id` all have existing indexes.

### Triggers — none exist anywhere in `public`

Zero rows from `information_schema.triggers`. This means `updated_at` columns (`accounts`, `clients`, `statements`, `merchant_memory`) are **insert-only** — `DEFAULT now()` sets them once on `INSERT` and nothing ever touches them again on `UPDATE`. `merchant_memory.updated_at` doesn't even have an insert default (`column_default: null`) — it starts `NULL` unless a writer sets it explicitly.

`DATABASE_MIGRATIONS.sql`'s own Phase 2.1 addition of `categories.updated_at DEFAULT now()` has the identical problem — it would never self-update either, matching the existing (broken) pattern rather than fixing it.

### Constraints — mostly consistent, one real conflict

Full constraint list was pulled from `pg_constraint`. Two things worth flagging:

1. **`accounts_account_type_check` already exists**, with allowed values `('Savings', 'Current', 'OD', 'Credit Card')` — note **`OD`, not `Overdraft`**. `DATABASE_MIGRATIONS.sql` Phase 3.1 tries to add a constraint with the _same name_ but different allowed values (`'Overdraft'` instead of `'OD'`). Its `DO` block guard checks for an existing constraint by that name first, so it will silently no-op rather than error — but the migration's stated intent ("include Overdraft for domain-model compatibility") doesn't actually happen, and the real, live-enforced vocabulary uses `'OD'`. The `BankAccountType` domain enum uses `'overdraft'` — a repository mapping-layer translation (`'overdraft'` ↔ `'OD'`) is required regardless of what this migration does.
2. **`accounts_account_category_check`** already exists too (`'Personal', 'Business', 'Joint', 'Other'`) — not something any prior audit or the migration touches; noted for completeness since it wasn't visible via REST.
3. **Foreign keys already exist** that the REST audit could only describe as "unregistered/unconfirmed": `transactions.account_id/client_id/statement_id` are real, enforced FKs (matches what the migration assumed). Also newly visible: `transactions.user_id`, `categories.user_id`, `banks.user_id`, `email_sources.user_id` all have `FOREIGN KEY ... REFERENCES auth.users(id) ON DELETE CASCADE`. This means the hardcoded `user_id` (`2f324f4d-...`) every n8n workflow node writes must already exist as a real `auth.users` row — consistent with inserts having succeeded, but worth keeping in mind for Module 12A's auth design (deleting that auth user would cascade-delete every transaction/category/bank/email-source row).
4. `merchant_memory` has **two duplicate unique constraints** on the identical column pair (`user_id, normalized_merchant)`: `merchant_memory_user_merchant_key` and `merchant_memory_user_normalized_unique`. Cosmetic — redundant, not conflicting, not blocking — but worth a cleanup note for whoever owns this schema going forward.

### Row counts — have grown since the original audit

| Table                               | `SUPABASE_AUDIT.md` (2026-08-07) | Now       | Change    |
| ----------------------------------- | -------------------------------- | --------- | --------- |
| `statement_transactions`            | 100                              | **2,746** | +2,646    |
| `merchant_memory`                   | 69                               | **79**    | +10       |
| `transactions`                      | 14                               | 14        | unchanged |
| `statements`                        | 0                                | **0**     | unchanged |
| `accounts`, `categories`, `clients` | 7 / 9 / 3                        | 7 / 9 / 3 | unchanged |

Workflow D has clearly been running and accumulating real statement data — but `statements` is still at 0. Every one of those 2,746 `statement_transactions` rows is still unlinked to a parent statement, exactly as `N8N_DATABASE_MAPPING.md` described, just at ~27x the volume it was audited at. This raises the priority of that workflow fix — it's no longer a theoretical gap, it's active, growing backlog.

### Existing view definitions — now visible for the first time

`SUPABASE_AUDIT.md` could only describe `vw_dashboard_summary`/`vw_dashboard_accounts`/`monthly_summaries` by their output columns, not their logic. Full definitions were pulled. `vw_dashboard_accounts` and `vw_dashboard_summary` match what the REST audit inferred — no surprises, confirms `account_type = 'OD'` (not `'Overdraft'`) is what production logic already expects. `monthly_summaries` contains the one finding that matters most — see §2 below.

---

## 2. The discrepancy that changes a design decision

`monthly_summaries`'s real definition:

```sql
SELECT user_id,
  EXTRACT(month FROM transaction_date)::integer AS month,
  EXTRACT(year FROM transaction_date)::integer AS year,
  COALESCE(sum(CASE WHEN type = 'personal' THEN amount ELSE NULL END), 0) AS total_personal,
  COALESCE(sum(CASE WHEN type = 'business' THEN amount ELSE NULL END), 0) AS total_business,
  COALESCE(sum(CASE WHEN type = 'uncategorized' THEN amount ELSE NULL END), 0) AS total_uncategorized,
  ...
FROM transactions GROUP BY user_id, month, year;
```

**`transactions.type` is the real personal/business/uncategorized column** — the schema owner clearly designed it to carry exactly that split. `SUPABASE_MAPPING.md` and `DATABASE_MIGRATIONS.sql` (Phase 1.4) both concluded `type` was "a categorization-status leftover, distinct from OwnerType" — that conclusion was based on every _sampled_ row happening to say `'uncategorized'` (true), but misread _why_: it's not that `type` is the wrong column, it's that Workflow C Parser's transaction-insert nodes never write anything to it except the literal string `'uncategorized'` (confirmed in `N8N_DATABASE_MAPPING.md` — neither insert path sets `type` at all, so it just falls through to the column default). The column's _purpose_, per the view that already depends on it, is exactly the frontend's `OwnerType` concept.

`DATABASE_MIGRATIONS.sql` Phase 1.2 adds a **new** `transactions.owner_type` column for this. Running it as-is would create a fourth status-like column (alongside `status`, `type`, `review_status`) carrying a concept `type` was already designed to hold — the exact "overlapping status columns" problem this whole phase's analysis has been warning about, just with one more column added to the pile instead of resolved.

**This needs a decision before execution, not a silent fix.** Two reasonable paths:

- **(a) Drop Phase 1.2 entirely.** Map the domain `OwnerType` (`'business' | 'personal'`) directly onto the existing `type` column in the repository layer (`vw_transactions` already has a `type`-adjacent slot to extend). Document `type`'s real purpose with a `COMMENT ON COLUMN`. This is the smaller, more consistent change, and it's what `monthly_summaries` already assumes.
- **(b) Keep `owner_type` as a new column, but only as a _migration target_** — backfill it from `type` where `type` is already `'personal'`/`'business'`, treat `type` as legacy/deprecated going forward, and update Workflow C Parser to write `owner_type` instead of `type` (Module 12B territory). More invasive, only worth it if `type`'s current 3-value domain (`personal`/`business`/`uncategorized`) needs to diverge from `OwnerType`'s clean 2-value one for some reason not yet identified.

Recommend (a) — it's smaller, and it's what the database itself was already designed to do.

---

## 3. Migration risk summary

| Item                                                                                         | Would it break execution?                                                         | Action needed                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| RLS policy gaps on 6 tables                                                                  | No — this migration runs as table owner                                           | Not blocking _this_ migration; blocks Module 12A repository go-live for those 6 tables. Needs policies added as a follow-up, separately reviewed.                                                                                          |
| Redundant indexes (5 planned indexes duplicate existing ones)                                | No — `IF NOT EXISTS` guards the _name_, so it would just succeed and create waste | **Trim Phase 5a** before running — remove the 5 listed above, keep the genuinely new ones                                                                                                                                                  |
| `accounts_account_type_check` name collision                                                 | No — the `DO` block already guards against this and will no-op                    | Harmless as written, but the comment explaining _why_ is now wrong (says 'Overdraft' is being added; it isn't). Update the comment, and note the real value is `'OD'` for the mapping layer                                                |
| `owner_type` vs. existing `type`                                                             | No — adding the column doesn't fail                                               | **Decide (a) or (b) above before running** — this is a real design choice, not a bug                                                                                                                                                       |
| No `updated_at` triggers anywhere, including the migration's own new `categories.updated_at` | No — doesn't fail, just doesn't self-maintain                                     | Recommend adding one small `set_updated_at()` trigger function + triggers on the 4 affected tables, OR explicitly documenting that every repository `update()` method must set it manually. Either is fine; leaving it undecided isn't.    |
| `merchant_memory` duplicate unique constraints                                               | No                                                                                | Cosmetic, no action required for this migration                                                                                                                                                                                            |
| `transactions` "Allow authenticated inserts" policy (`with_check: true`, unrestricted)       | No — pre-existing, not touched by the migration                                   | Not part of this migration, but flagging: any authenticated Supabase user (not just the app's owner) can currently insert a transaction under any `user_id`. Worth fixing before Module 12A widens authentication beyond the single owner. |

---

## 4. What must change before execution

In priority order:

1. **Decide `owner_type` vs. `type`** (§2) — this changes what Phase 1.2 of `DATABASE_MIGRATIONS.sql` should actually contain.
2. **Trim the 5 redundant index statements** from Phase 5a (§1, indexes).
3. **Update the `accounts_account_type_check` comment** to stop claiming `'Overdraft'` is being added, and note `'OD'` as the real value for the repository mapping layer.
4. **Decide on `updated_at` maintenance** — add trigger(s), or document manual-set-required and move on.

None of these are things I've changed yet — `DATABASE_MIGRATIONS.sql` is exactly as it was when you last saw it. I can apply all four once you confirm the `owner_type` decision (the only one that's a real judgment call; the other three are mechanical once you say go).

Not required before execution, but flagged for a separate follow-up: RLS policies for the 6 unpoliced tables, and the `transactions` insert-policy gap.

---

## 5. Stopping here

Per instruction: no SQL has been executed, `DATABASE_MIGRATIONS.sql`/`DATABASE_SEED.sql` are unchanged, and nothing on the live database was modified. Waiting for explicit approval on §2's decision and the rest of §4 before touching either the migration file or the database.
