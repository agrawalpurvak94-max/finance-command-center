# DATABASE_SCHEMA.md

Reference schema documentation for the live Supabase project (`cnxfrlirhycbqnwfxvpm`), as observed via PostgREST introspection on 2026-08-07. This is a structural reference, not an audit narrative — see [SUPABASE_AUDIT.md](SUPABASE_AUDIT.md) for methodology and raw findings, [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md) for how these columns map to frontend domain models.

**Coverage note:** derived from PostgREST's OpenAPI output, which does not expose indexes, RLS policies, or triggers. Those are marked **Not Available via REST** where relevant. Do not treat the absence of an index/trigger/policy note below as confirmation that none exists — it means it is unverified by this method.

---

## Entity Overview

| Table                          | Purpose                                                                        | Rows |
| ------------------------------ | ------------------------------------------------------------------------------ | ---- |
| `transactions`                 | Primary transaction ledger (Workflow A output)                                 | 14   |
| `statement_transactions`       | Transactions extracted from statement PDFs (Workflow B output)                 | 100  |
| `merchant_memory`              | Merchant → category learning table (Workflow C)                                | 69   |
| `accounts`                     | Bank accounts and credit cards (single table, discriminated by `account_type`) | 7    |
| `categories`                   | Transaction category master data                                               | 9    |
| `clients`                      | Client/owner master data                                                       | 3    |
| `statements`                   | Bank/card statement records                                                    | 0    |
| `banks`                        | Bank reference data                                                            | 0    |
| `email_sources`                | Gmail source address reference data                                            | 0    |
| `processed_messages`           | Gmail message dedup ledger                                                     | 0    |
| `monthly_summaries` (view)     | Monthly spend aggregate                                                        | 1    |
| `vw_dashboard_summary` (view)  | Dashboard KPI aggregate                                                        | 1    |
| `vw_dashboard_accounts` (view) | Dashboard account list projection                                              | 7    |

---

## Relationships

Foreign keys registered as actual constraints (confirmed via PostgREST's FK annotations):

```
accounts.id ──┬── statements.account_id
              └── transactions.account_id

clients.id ──── transactions.client_id

statements.id ── transactions.statement_id
```

Relationships that are **implied by naming/purpose but not registered as FK constraints** (unconfirmed, possibly enforced only at the application/workflow level, or not enforced at all):

```
categories.id  ⇢  transactions.category      (transactions.category is free text, no category_id column)
merchant_memory.id / normalized_merchant  ⇢  transactions.merchant   (free text, no merchant_id column)
statements.id  ⇢  statement_transactions.statement_id   (column exists, no <fk/> annotation reported)
clients.id  ⇢  accounts / statements   (no client_id column on either table)
```

No table has a foreign key pointing at `categories.id` or `merchant_memory.id` today. `categories` and `merchant_memory` are currently leaf tables from a referential-integrity standpoint, despite being conceptually central to `transactions`.

---

## Table Definitions

### `transactions`

Primary key: `id` (uuid, default `extensions.uuid_generate_v4()`)

| Column              | Type                      | Nullable | Default                         |
| ------------------- | ------------------------- | -------- | ------------------------------- |
| id                  | uuid                      | NOT NULL | `extensions.uuid_generate_v4()` |
| user_id             | uuid                      | nullable |                                 |
| created_at          | timestamptz               | nullable | `now()`                         |
| transaction_date    | timestamptz               | nullable | `now()`                         |
| amount              | numeric                   | NOT NULL | 0                               |
| currency            | text                      | nullable | `INR`                           |
| merchant            | text                      | nullable |                                 |
| category            | text                      | nullable | `Other`                         |
| card_last4          | text                      | nullable |                                 |
| bank_name           | text                      | nullable |                                 |
| transaction_type    | text                      | nullable | `credit_card`                   |
| payment_mode        | text                      | nullable | `debit`                         |
| type                | text                      | nullable | `uncategorized`                 |
| note                | text                      | nullable |                                 |
| client_name         | text                      | nullable |                                 |
| email_source        | text                      | nullable |                                 |
| raw_email_subject   | text                      | nullable |                                 |
| is_manually_entered | boolean                   | nullable | false                           |
| status              | text                      | nullable | `pending_review`                |
| account_last4       | text                      | nullable |                                 |
| source_message_id   | text                      | nullable |                                 |
| merchant_raw        | text                      | nullable |                                 |
| confidence          | numeric                   | nullable |                                 |
| category_source     | text                      | nullable |                                 |
| processed_at        | timestamptz               | nullable |                                 |
| account_id          | uuid (FK → accounts.id)   | nullable |                                 |
| client_id           | uuid (FK → clients.id)    | nullable |                                 |
| statement_id        | uuid (FK → statements.id) | nullable |                                 |
| review_status       | text                      | nullable | `Auto Reviewed`                 |
| ai_confidence       | numeric                   | nullable |                                 |
| is_recurring        | boolean                   | nullable | false                           |
| is_duplicate        | boolean                   | nullable | false                           |
| tags                | text[]                    | nullable |                                 |
| manually_edited     | boolean                   | nullable | false                           |
| edited_at           | timestamp                 | nullable |                                 |
| edited_by           | text                      | nullable |                                 |

Indexes: Not Available via REST. Triggers: Not Available via REST. RLS: Not Available via REST.

---

### `statement_transactions`

Primary key: `id` (uuid, default `gen_random_uuid()`)

| Column              | Type        | Nullable | Default             |
| ------------------- | ----------- | -------- | ------------------- |
| id                  | uuid        | NOT NULL | `gen_random_uuid()` |
| user_id             | uuid        | NOT NULL |                     |
| created_at          | timestamptz | NOT NULL | `now()`             |
| statement_month     | date        | nullable |                     |
| statement_id        | uuid        | nullable |                     |
| bank_name           | text        | nullable |                     |
| source_file         | text        | nullable |                     |
| page_number         | integer     | nullable |                     |
| parser_version      | text        | nullable |                     |
| extraction_method   | text        | nullable |                     |
| card_last4          | text        | nullable |                     |
| account_last4       | text        | nullable |                     |
| card_type           | text        | nullable |                     |
| account_type        | text        | nullable |                     |
| transaction_date    | date        | NOT NULL |                     |
| amount              | numeric     | NOT NULL |                     |
| currency            | text        | nullable | `INR`               |
| merchant            | text        | nullable |                     |
| normalized_merchant | text        | nullable |                     |
| raw_description     | text        | nullable |                     |
| payment_mode        | text        | nullable |                     |
| transaction_type    | text        | nullable |                     |
| reference_number    | text        | nullable |                     |
| category            | text        | nullable | `Other`             |
| category_source     | text        | nullable | `ai`                |
| confidence          | numeric     | nullable |                     |
| status              | text        | nullable | `parsed`            |
| note                | text        | nullable |                     |
| metadata            | jsonb       | nullable |                     |

Indexes / Triggers / RLS: Not Available via REST.

---

### `merchant_memory`

Primary key: `id` (uuid, default `gen_random_uuid()`)

| Column              | Type        | Nullable | Default             |
| ------------------- | ----------- | -------- | ------------------- |
| id                  | uuid        | NOT NULL | `gen_random_uuid()` |
| normalized_merchant | text        | NOT NULL |                     |
| category            | text        | NOT NULL |                     |
| confidence          | integer     | nullable | 100                 |
| user_id             | uuid        | nullable |                     |
| display_name        | text        | nullable |                     |
| created_at          | timestamptz | nullable | `now()`             |
| updated_at          | timestamptz | nullable |                     |

Indexes / Triggers / RLS: Not Available via REST.

---

### `accounts`

Primary key: `id` (uuid, default `gen_random_uuid()`)

| Column               | Type      | Nullable | Default             |
| -------------------- | --------- | -------- | ------------------- |
| id                   | uuid      | NOT NULL | `gen_random_uuid()` |
| account_name         | text      | NOT NULL |                     |
| institution_name     | text      | NOT NULL |                     |
| account_type         | text      | NOT NULL |                     |
| account_number_last4 | text      | nullable |                     |
| currency             | text      | NOT NULL | `INR`               |
| opening_balance      | numeric   | nullable |                     |
| current_balance      | numeric   | nullable |                     |
| available_credit     | numeric   | nullable |                     |
| credit_limit         | numeric   | nullable |                     |
| minimum_due          | numeric   | nullable |                     |
| payment_due_date     | date      | nullable |                     |
| statement_day        | integer   | nullable |                     |
| card_network         | text      | nullable |                     |
| logo_url             | text      | nullable |                     |
| color_hex            | text      | nullable |                     |
| is_active            | boolean   | nullable | true                |
| notes                | text      | nullable |                     |
| created_at           | timestamp | nullable | `now()`             |
| updated_at           | timestamp | nullable | `now()`             |
| bank_code            | text      | nullable |                     |
| display_order        | integer   | nullable | 1                   |
| include_in_dashboard | boolean   | nullable | true                |
| sync_status          | text      | nullable | `Manual`            |
| account_owner        | text      | nullable |                     |
| statement_cycle_day  | integer   | nullable |                     |
| account_status       | text      | nullable | `Active`            |
| source_bank_name     | text      | nullable |                     |
| source_card_last4    | text      | nullable |                     |
| source_account_last4 | text      | nullable |                     |
| account_holder_name  | text      | nullable |                     |
| bank_display_name    | text      | nullable |                     |
| card_last4           | text      | nullable |                     |
| account_last4        | text      | nullable |                     |
| account_nickname     | text      | nullable |                     |
| account_category     | text      | nullable | `Personal`          |

Indexes / Triggers / RLS: Not Available via REST.

---

### `categories`

Primary key: `id` (uuid, default `extensions.uuid_generate_v4()`)

| Column     | Type        | Nullable | Default                         |
| ---------- | ----------- | -------- | ------------------------------- |
| id         | uuid        | NOT NULL | `extensions.uuid_generate_v4()` |
| user_id    | uuid        | nullable |                                 |
| name       | text        | NOT NULL |                                 |
| created_at | timestamptz | nullable | `now()`                         |

Indexes / Triggers / RLS: Not Available via REST.

---

### `clients`

Primary key: `id` (uuid, default `gen_random_uuid()`)

| Column           | Type      | Nullable | Default             |
| ---------------- | --------- | -------- | ------------------- |
| id               | uuid      | NOT NULL | `gen_random_uuid()` |
| client_name      | text      | NOT NULL |                     |
| client_code      | text      | nullable |                     |
| email            | text      | nullable |                     |
| phone            | text      | nullable |                     |
| billing_currency | text      | nullable | `INR`               |
| notes            | text      | nullable |                     |
| is_active        | boolean   | nullable | true                |
| created_at       | timestamp | nullable | `now()`             |
| updated_at       | timestamp | nullable | `now()`             |

Indexes / Triggers / RLS: Not Available via REST.

---

### `statements`

Primary key: `id` (uuid, default `gen_random_uuid()`)

| Column                 | Type                    | Nullable | Default             |
| ---------------------- | ----------------------- | -------- | ------------------- |
| id                     | uuid                    | NOT NULL | `gen_random_uuid()` |
| account_id             | uuid (FK → accounts.id) | nullable |                     |
| statement_name         | text                    | nullable |                     |
| statement_period_start | date                    | nullable |                     |
| statement_period_end   | date                    | nullable |                     |
| statement_date         | date                    | nullable |                     |
| due_date               | date                    | nullable |                     |
| opening_balance        | numeric                 | nullable |                     |
| closing_balance        | numeric                 | nullable |                     |
| total_debits           | numeric                 | nullable |                     |
| total_credits          | numeric                 | nullable |                     |
| minimum_due            | numeric                 | nullable |                     |
| credit_limit           | numeric                 | nullable |                     |
| available_credit       | numeric                 | nullable |                     |
| rewards_points         | numeric                 | nullable |                     |
| pdf_filename           | text                    | nullable |                     |
| pdf_storage_path       | text                    | nullable |                     |
| parser_version         | text                    | nullable |                     |
| processing_status      | text                    | nullable | `Processed`         |
| notes                  | text                    | nullable |                     |
| created_at             | timestamp               | nullable | `now()`             |
| updated_at             | timestamp               | nullable | `now()`             |

Indexes / Triggers / RLS: Not Available via REST.

---

### `banks`, `email_sources`, `processed_messages`

Small reference/dedup tables, all currently empty.

| Table                | Primary Key | Notable Columns                                               |
| -------------------- | ----------- | ------------------------------------------------------------- |
| `banks`              | `id` (uuid) | `bank_name` NOT NULL, `card_last4`, `label`                   |
| `email_sources`      | `id` (uuid) | `email_address` NOT NULL, `label`                             |
| `processed_messages` | `id` (uuid) | `user_id` NOT NULL, `source_message_id` NOT NULL, `thread_id` |

---

## Views

| View                    | Read/Write                                  | Columns                                                                                                                                                                                                                              |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `vw_dashboard_summary`  | Read-only                                   | `total_cash`, `total_credit_outstanding`, `needs_review`, `duplicate_transactions`, `cards_due_this_week`                                                                                                                            |
| `vw_dashboard_accounts` | **Read/write** (auto-updatable simple view) | `id`, `display_order`, `account_name`, `institution_name`, `account_holder_name`, `account_type`, `current_balance`, `available_credit`, `credit_limit`, `minimum_due`, `payment_due_date`, `statement_day`, `currency`, `is_active` |
| `monthly_summaries`     | Read-only                                   | `user_id`, `month`, `year`, `total_personal`, `total_business`, `total_uncategorized`, `total_spend`, `transaction_count`                                                                                                            |

Of the ~30 views named in CLAUDE.md Part 3 ("REQUIRED SQL VIEWS"), only the three above exist today.

---

## Functions (RPC-exposed only)

| Function                 | Method    | Parameters                                                                                                       | Purpose                                      |
| ------------------------ | --------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `lookup_merchant`        | GET, POST | `p_user_id uuid`, `p_normalized_merchant text`                                                                   | Look up a merchant-memory match (Workflow C) |
| `upsert_merchant_memory` | POST      | `p_user_id uuid`, `p_normalized_merchant text`, `p_display_name text`, `p_category text`, `p_confidence integer` | Write/update merchant memory (Workflow C)    |

Other functions (trigger functions, internal functions, or anything not granted `EXECUTE` to the auditing role) are **Not Available via REST**.

---

## Indexes, RLS Policies, Triggers

**Not Available via REST** for all tables listed above. These require a direct Postgres connection or Supabase Management API access to enumerate. See [DATABASE_READINESS.md](DATABASE_READINESS.md) for why this matters before Module 12A.
