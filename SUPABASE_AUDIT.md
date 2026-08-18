# SUPABASE_AUDIT.md

Read-only audit of the live Supabase project. No writes, no migrations, no schema or application code changes were performed at any point in this exercise.

- **Project ref:** `cnxfrlirhycbqnwfxvpm`
- **Date:** 2026-08-07
- **Method:** PostgREST OpenAPI introspection (`GET /rest/v1/`) using a `service_role` key, plus a small number of read-only `GET` samples against individual tables to verify real data shape. No direct Postgres connection, no `psql`, no Supabase Management API token was used.
- **Companion documents:** this file is the raw inventory only. See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for a clean reference data dictionary, [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md) for domain-model-to-column mapping, [DATABASE_READINESS.md](DATABASE_READINESS.md) for the Module 12A go/no-go assessment, and [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for the prioritized plan of changes (no SQL — planning only).
- **Security note:** the `service_role` key used for this audit was shared in plaintext in chat earlier in this session. It bypasses RLS entirely. Recommend rotating it from Supabase Dashboard → Settings → API.

---

## What PostgREST introspection can and cannot see

PostgREST's OpenAPI output (`GET /rest/v1/`) exposes: tables/views in the `public` schema, their columns, types, defaults, NOT NULL-ness, and — usefully — inline Primary Key / Foreign Key notes embedded in column descriptions. It does **not** expose indexes, RLS policies, trigger definitions, or functions that aren't already exposed as `/rpc/*` endpoints. Those require a direct Postgres connection (connection string/password) or a Supabase personal access token (`sbp_...`) for the Management API — neither was provided, so those sections below are marked **Not Available via REST** rather than guessed at.

---

## 1–4. Tables, Columns, Primary Keys, Foreign Keys

13 relations are exposed under the `public` schema: 10 read/write tables, 3 views (`monthly_summaries`, `vw_dashboard_summary`, `vw_dashboard_accounts`).

### `merchant_memory`

| Column              | Type        | Nullable | Default             | Notes            |
| ------------------- | ----------- | -------- | ------------------- | ---------------- |
| id                  | uuid        | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY**  |
| normalized_merchant | text        | NOT NULL |                     |                  |
| category            | text        | NOT NULL |                     | free text, no FK |
| confidence          | integer     | nullable | 100                 |                  |
| user_id             | uuid        | nullable |                     |                  |
| display_name        | text        | nullable |                     |                  |
| created_at          | timestamptz | nullable | `now()`             |                  |
| updated_at          | timestamptz | nullable |                     |                  |

### `accounts`

| Column               | Type      | Nullable | Default             | Notes                                                                       |
| -------------------- | --------- | -------- | ------------------- | --------------------------------------------------------------------------- |
| id                   | uuid      | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY**                                                             |
| account_name         | text      | NOT NULL |                     |                                                                             |
| institution_name     | text      | NOT NULL |                     |                                                                             |
| account_type         | text      | NOT NULL |                     | observed: `Savings`, `Current`, `Credit Card` — no CHECK constraint visible |
| account_number_last4 | text      | nullable |                     |                                                                             |
| currency             | text      | NOT NULL | `INR`               |                                                                             |
| opening_balance      | numeric   | nullable |                     |                                                                             |
| current_balance      | numeric   | nullable |                     |                                                                             |
| available_credit     | numeric   | nullable |                     |                                                                             |
| credit_limit         | numeric   | nullable |                     |                                                                             |
| minimum_due          | numeric   | nullable |                     |                                                                             |
| payment_due_date     | date      | nullable |                     |                                                                             |
| statement_day        | integer   | nullable |                     |                                                                             |
| card_network         | text      | nullable |                     |                                                                             |
| logo_url             | text      | nullable |                     |                                                                             |
| color_hex            | text      | nullable |                     |                                                                             |
| is_active            | boolean   | nullable | true                |                                                                             |
| notes                | text      | nullable |                     |                                                                             |
| created_at           | timestamp | nullable | `now()`             |                                                                             |
| updated_at           | timestamp | nullable | `now()`             |                                                                             |
| bank_code            | text      | nullable |                     |                                                                             |
| display_order        | integer   | nullable | 1                   |                                                                             |
| include_in_dashboard | boolean   | nullable | true                |                                                                             |
| sync_status          | text      | nullable | `Manual`            |                                                                             |
| account_owner        | text      | nullable |                     |                                                                             |
| statement_cycle_day  | integer   | nullable |                     |                                                                             |
| account_status       | text      | nullable | `Active`            |                                                                             |
| source_bank_name     | text      | nullable |                     |                                                                             |
| source_card_last4    | text      | nullable |                     |                                                                             |
| source_account_last4 | text      | nullable |                     |                                                                             |
| account_holder_name  | text      | nullable |                     |                                                                             |
| bank_display_name    | text      | nullable |                     |                                                                             |
| card_last4           | text      | nullable |                     |                                                                             |
| account_last4        | text      | nullable |                     |                                                                             |
| account_nickname     | text      | nullable |                     |                                                                             |
| account_category     | text      | nullable | `Personal`          |                                                                             |

No FK columns present on `accounts` itself (other tables FK _into_ it — see below).

### `banks` — 0 rows

| Column     | Type        | Nullable | Default                         | Notes           |
| ---------- | ----------- | -------- | ------------------------------- | --------------- |
| id         | uuid        | NOT NULL | `extensions.uuid_generate_v4()` | **PRIMARY KEY** |
| user_id    | uuid        | nullable |                                 |                 |
| bank_name  | text        | NOT NULL |                                 |                 |
| card_last4 | text        | nullable |                                 |                 |
| label      | text        | nullable |                                 |                 |
| created_at | timestamptz | nullable | `now()`                         |                 |

### `processed_messages` — 0 rows

| Column            | Type        | Nullable | Default             | Notes           |
| ----------------- | ----------- | -------- | ------------------- | --------------- |
| id                | uuid        | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY** |
| user_id           | uuid        | NOT NULL |                     |                 |
| source_message_id | text        | NOT NULL |                     |                 |
| thread_id         | text        | nullable |                     |                 |
| processed_at      | timestamptz | NOT NULL | `now()`             |                 |

### `statement_transactions` — 100 rows

| Column              | Type        | Nullable | Default             | Notes                                                                        |
| ------------------- | ----------- | -------- | ------------------- | ---------------------------------------------------------------------------- |
| id                  | uuid        | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY**                                                              |
| user_id             | uuid        | NOT NULL |                     |                                                                              |
| created_at          | timestamptz | NOT NULL | `now()`             |                                                                              |
| statement_month     | date        | nullable |                     |                                                                              |
| statement_id        | uuid        | nullable |                     | no `<fk/>` annotation reported by PostgREST — not a registered FK constraint |
| bank_name           | text        | nullable |                     |                                                                              |
| source_file         | text        | nullable |                     |                                                                              |
| page_number         | integer     | nullable |                     |                                                                              |
| parser_version      | text        | nullable |                     |                                                                              |
| extraction_method   | text        | nullable |                     |                                                                              |
| card_last4          | text        | nullable |                     |                                                                              |
| account_last4       | text        | nullable |                     |                                                                              |
| card_type           | text        | nullable |                     |                                                                              |
| account_type        | text        | nullable |                     |                                                                              |
| transaction_date    | date        | NOT NULL |                     |                                                                              |
| amount              | numeric     | NOT NULL |                     |                                                                              |
| currency            | text        | nullable | `INR`               |                                                                              |
| merchant            | text        | nullable |                     |                                                                              |
| normalized_merchant | text        | nullable |                     |                                                                              |
| raw_description     | text        | nullable |                     |                                                                              |
| payment_mode        | text        | nullable |                     |                                                                              |
| transaction_type    | text        | nullable |                     |                                                                              |
| reference_number    | text        | nullable |                     |                                                                              |
| category            | text        | nullable | `Other`             | free text                                                                    |
| category_source     | text        | nullable | `ai`                |                                                                              |
| confidence          | numeric     | nullable |                     |                                                                              |
| status              | text        | nullable | `parsed`            | observed value: `merchant_memory`                                            |
| note                | text        | nullable |                     |                                                                              |
| metadata            | jsonb       | nullable |                     |                                                                              |

### `statements` — 0 rows

| Column                 | Type      | Nullable | Default             | Notes                  |
| ---------------------- | --------- | -------- | ------------------- | ---------------------- |
| id                     | uuid      | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY**        |
| account_id             | uuid      | nullable |                     | **FK → `accounts.id`** |
| statement_name         | text      | nullable |                     |                        |
| statement_period_start | date      | nullable |                     |                        |
| statement_period_end   | date      | nullable |                     |                        |
| statement_date         | date      | nullable |                     |                        |
| due_date               | date      | nullable |                     |                        |
| opening_balance        | numeric   | nullable |                     |                        |
| closing_balance        | numeric   | nullable |                     |                        |
| total_debits           | numeric   | nullable |                     |                        |
| total_credits          | numeric   | nullable |                     |                        |
| minimum_due            | numeric   | nullable |                     |                        |
| credit_limit           | numeric   | nullable |                     |                        |
| available_credit       | numeric   | nullable |                     |                        |
| rewards_points         | numeric   | nullable |                     |                        |
| pdf_filename           | text      | nullable |                     |                        |
| pdf_storage_path       | text      | nullable |                     |                        |
| parser_version         | text      | nullable |                     |                        |
| processing_status      | text      | nullable | `Processed`         |                        |
| notes                  | text      | nullable |                     |                        |
| created_at             | timestamp | nullable | `now()`             |                        |
| updated_at             | timestamp | nullable | `now()`             |                        |

### `email_sources` — 0 rows

| Column        | Type        | Nullable | Default                         | Notes           |
| ------------- | ----------- | -------- | ------------------------------- | --------------- |
| id            | uuid        | NOT NULL | `extensions.uuid_generate_v4()` | **PRIMARY KEY** |
| user_id       | uuid        | nullable |                                 |                 |
| email_address | text        | NOT NULL |                                 |                 |
| label         | text        | nullable |                                 |                 |
| created_at    | timestamptz | nullable | `now()`                         |                 |

### `transactions` — 14 rows

| Column              | Type        | Nullable | Default                         | Notes                                                           |
| ------------------- | ----------- | -------- | ------------------------------- | --------------------------------------------------------------- |
| id                  | uuid        | NOT NULL | `extensions.uuid_generate_v4()` | **PRIMARY KEY**                                                 |
| user_id             | uuid        | nullable |                                 |                                                                 |
| created_at          | timestamptz | nullable | `now()`                         |                                                                 |
| transaction_date    | timestamptz | nullable | `now()`                         |                                                                 |
| amount              | numeric     | NOT NULL | 0                               |                                                                 |
| currency            | text        | nullable | `INR`                           |                                                                 |
| merchant            | text        | nullable |                                 | free text, no FK                                                |
| category            | text        | nullable | `Other`                         | free text, no FK                                                |
| card_last4          | text        | nullable |                                 |                                                                 |
| bank_name           | text        | nullable |                                 |                                                                 |
| transaction_type    | text        | nullable | `credit_card`                   |                                                                 |
| payment_mode        | text        | nullable | `debit`                         |                                                                 |
| type                | text        | nullable | `uncategorized`                 | observed as `uncategorized` on every sampled row                |
| note                | text        | nullable |                                 |                                                                 |
| client_name         | text        | nullable |                                 | free text                                                       |
| email_source        | text        | nullable |                                 |                                                                 |
| raw_email_subject   | text        | nullable |                                 |                                                                 |
| is_manually_entered | boolean     | nullable | false                           |                                                                 |
| status              | text        | nullable | `pending_review`                | observed values: `auto`, `needs_review`                         |
| account_last4       | text        | nullable |                                 |                                                                 |
| source_message_id   | text        | nullable |                                 |                                                                 |
| merchant_raw        | text        | nullable |                                 |                                                                 |
| confidence          | numeric     | nullable |                                 |                                                                 |
| category_source     | text        | nullable |                                 |                                                                 |
| processed_at        | timestamptz | nullable |                                 |                                                                 |
| account_id          | uuid        | nullable |                                 | **FK → `accounts.id`** — observed `null` on every sampled row   |
| client_id           | uuid        | nullable |                                 | **FK → `clients.id`** — observed `null` on every sampled row    |
| statement_id        | uuid        | nullable |                                 | **FK → `statements.id`** — observed `null` on every sampled row |
| review_status       | text        | nullable | `Auto Reviewed`                 |                                                                 |
| ai_confidence       | numeric     | nullable |                                 |                                                                 |
| is_recurring        | boolean     | nullable | false                           |                                                                 |
| is_duplicate        | boolean     | nullable | false                           | boolean flag, not a self-referencing FK                         |
| tags                | text[]      | nullable |                                 |                                                                 |
| manually_edited     | boolean     | nullable | false                           |                                                                 |
| edited_at           | timestamp   | nullable |                                 |                                                                 |
| edited_by           | text        | nullable |                                 |                                                                 |

### `clients` — 3 rows

| Column           | Type      | Nullable | Default             | Notes                                        |
| ---------------- | --------- | -------- | ------------------- | -------------------------------------------- |
| id               | uuid      | NOT NULL | `gen_random_uuid()` | **PRIMARY KEY**                              |
| client_name      | text      | NOT NULL |                     | observed: `Personal`, `Business`, `Internal` |
| client_code      | text      | nullable |                     |                                              |
| email            | text      | nullable |                     |                                              |
| phone            | text      | nullable |                     |                                              |
| billing_currency | text      | nullable | `INR`               |                                              |
| notes            | text      | nullable |                     |                                              |
| is_active        | boolean   | nullable | true                |                                              |
| created_at       | timestamp | nullable | `now()`             |                                              |
| updated_at       | timestamp | nullable | `now()`             |                                              |

### `categories` — 9 rows

| Column     | Type        | Nullable | Default                         | Notes                                                                                                               |
| ---------- | ----------- | -------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| id         | uuid        | NOT NULL | `extensions.uuid_generate_v4()` | **PRIMARY KEY**                                                                                                     |
| user_id    | uuid        | nullable |                                 |                                                                                                                     |
| name       | text        | NOT NULL |                                 | observed: `Food`, `Travel`, `Fuel`, `Shopping`, `Utilities`, `Entertainment`, `Medical`, `Office Supplies`, `Other` |
| created_at | timestamptz | nullable | `now()`                         |                                                                                                                     |

---

## 5. Indexes

**Not Available via REST.** Index definitions live in `pg_catalog.pg_indexes` / `information_schema.statistics`, which PostgREST does not expose. Whether any FK columns above are indexed is unconfirmed.

---

## 6. Row Counts

| Table/View                     | Rows |
| ------------------------------ | ---- |
| `merchant_memory`              | 69   |
| `monthly_summaries` (view)     | 1    |
| `accounts`                     | 7    |
| `banks`                        | 0    |
| `processed_messages`           | 0    |
| `statement_transactions`       | 100  |
| `statements`                   | 0    |
| `email_sources`                | 0    |
| `transactions`                 | 14   |
| `clients`                      | 3    |
| `categories`                   | 9    |
| `vw_dashboard_summary` (view)  | 1    |
| `vw_dashboard_accounts` (view) | 7    |

---

## 7. RLS Policies

**Not Available via REST.** `pg_policies` requires direct SQL access. This audit was run with the `service_role` key, which bypasses RLS by design regardless of what policies exist — so successful reads here say nothing about how these tables would behave for the `anon`/`authenticated` roles the frontend will use post-Module-12A.

---

## 8. Functions

PostgREST only exposes functions in `public` as `/rpc/*` when the calling role has `EXECUTE` — functions not exposed this way (e.g. trigger functions, internal functions) are invisible to this method regardless, so this list may be incomplete.

Two RPC endpoints are exposed:

- **`lookup_merchant(p_user_id uuid, p_normalized_merchant text)`** — `GET`/`POST`, returns a merchant-memory match.
- **`upsert_merchant_memory(p_user_id uuid, p_normalized_merchant text, p_display_name text, p_category text, p_confidence integer)`** — `POST` only, writes/updates merchant memory.

Both support Workflow C (merchant learning).

---

## 9. Views

- **`vw_dashboard_summary`** — columns: `total_cash`, `total_credit_outstanding`, `needs_review`, `duplicate_transactions`, `cards_due_this_week`. Read-only (`GET` only). Current value: all zeros.
- **`vw_dashboard_accounts`** — projects a subset of `accounts` columns. Reports as writable (`GET`, `POST`, `PATCH`, `DELETE`) — consistent with being a simple, single-table Postgres view that Postgres treats as automatically updatable.
- **`monthly_summaries`** — read-only (`GET` only), not `vw_`-prefixed. Columns: `user_id`, `month`, `year`, `total_personal`, `total_business`, `total_uncategorized`, `total_spend`, `transaction_count`. Current single row: `month: 7, year: 2026, total_personal: 0, total_business: 0, total_uncategorized: 771106.00, total_spend: 771106.00, transaction_count: 14`.

---

## 10. Triggers

**Not Available via REST.** `pg_trigger` / `information_schema.triggers` require direct SQL access. Whether `updated_at` columns (`accounts`, `clients`, `statements`, `merchant_memory`) are trigger-maintained or left to the application layer is unconfirmed.

---

## Raw Observations from Sampled Data

Factual, as observed — no recommendations here (see [DATABASE_READINESS.md](DATABASE_READINESS.md) and [MIGRATION_PLAN.md](MIGRATION_PLAN.md) for those):

- `transactions.category` sampled values: `Investment`, `Shopping`, `Fuel`, `Food`, `Uncategorized`, `Business`. Of these, only `Shopping`, `Fuel`, `Food` appear in the `categories` table.
- `merchant_memory.category` sampled values include `Groceries`, which also does not appear in `categories`.
- `transactions.status` sampled values: `auto`, `needs_review`. `transactions.type` sampled value: `uncategorized` (every row). `transactions.review_status` default: `Auto Reviewed`.
- `statement_transactions.status` sampled value: `merchant_memory`.
- Every sampled `transactions` row has `account_id`, `client_id`, and `statement_id` all `null`.
- Every `accounts` row has `current_balance` and `credit_limit` both `null` (all 7 rows, including the 3 `Credit Card`-type rows).
- `statement_transactions` has 100 rows; all sampled rows have `statement_id: null`, and `statements` itself has 0 rows.

---

_This audit reflects the database state at the time it was run (2026-08-07) and will drift as data changes. Re-verify before starting Module 12A implementation rather than relying on this snapshot from memory._
