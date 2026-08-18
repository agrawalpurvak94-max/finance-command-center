# MIGRATION_PLAN.md

Prioritized plan for closing the gaps identified in [DATABASE_READINESS.md](DATABASE_READINESS.md) and [SUPABASE_MAPPING.md](SUPABASE_MAPPING.md).

**This is a planning document only.** Per instruction, no SQL DDL, no actual migration files, and no database changes were produced or applied — this describes _what_ should change and in _what order_, for whoever authors the real migrations later (following CLAUDE.md's Migration Rules: every schema change goes through a reviewed, reversible migration, never a direct production edit).

---

## Phase 0 — Verification (no schema change, must happen first)

Blocks every other phase because it determines whether anything below is even safe to build against.

| #   | Item                                                                                                                                  | Why first                                                                                                                                                           | Requires                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 0.1 | Confirm RLS status on all 10 writable tables                                                                                          | Unknown today (audit ran under `service_role`, which bypasses RLS regardless of config) — could be a silent data-exposure risk or a silent access-denial regression | Direct DB access or Supabase dashboard |
| 0.2 | Confirm whether `updated_at` columns are trigger-maintained                                                                           | Determines whether the repository layer needs to set `updated_at` manually on every write                                                                           | Direct DB access                       |
| 0.3 | Confirm index coverage on FK/filter columns (`transactions.account_id/client_id/statement_id`, `merchant_memory.normalized_merchant`) | Cheap to check now while volume is low (14 rows); expensive to discover as a performance problem after volume grows                                                 | Direct DB access                       |

---

## Phase 1 — Transaction linkage (unblocks Modules 2, 3, 8, 9)

The `transactions` table is the hub every other module's "linked" data depends on. Nothing downstream is worth building until this is addressed.

| #   | Item                                                                                                                     | Rationale                                                                                                                                                                                                                                                                                   | Depends on                       |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| 1.1 | Resolve why `account_id`/`client_id`/`statement_id` are `null` on every live row                                         | This is a data/automation question first, not necessarily a schema one — could be a Workflow A gap (Module 12B territory) or a mapping-layer gap (Module 12A territory). Needs a decision before adding any more columns to a table whose existing FKs aren't even being used.              | —                                |
| 1.2 | Add `merchant_id uuid REFERENCES merchant_memory(id)` and `category_id uuid REFERENCES categories(id)` to `transactions` | Domain model expects `Merchant`/`Category` objects, not free text; live free-text values (`Investment`, `Business`, `Uncategorized`) don't exist in `categories`, so backfill will need either a text-normalization pass or leave those rows' FK null with the text preserved as a fallback | 1.1 (understand data flow first) |
| 1.3 | Add `owner_type text` to `transactions` (personal/business)                                                              | No current column represents this; `monthly_summaries` proves it's unpopulated today                                                                                                                                                                                                        | —                                |
| 1.4 | Add `duplicate_of_id uuid REFERENCES transactions(id)`                                                                   | `is_duplicate` boolean can't say _which_ row is duplicated; needed for `vw_transactions_duplicates`                                                                                                                                                                                         | —                                |
| 1.5 | Reconcile `status` / `type` / `review_status` into one documented lifecycle                                              | Three overlapping columns today with unclear relationships; may turn out to be a documentation fix rather than a schema change once the intent behind each is confirmed with whoever owns Workflow A/C                                                                                      | —                                |

---

## Phase 2 — Master data completeness (unblocks Modules 5, 6, 7)

Modules 5–7 are already built against mock data with the fuller shape below — this phase is about giving them somewhere real to read from.

| #   | Item                                                                                                                                                                                                          | Rationale                                                                                                                                                                                    | Depends on                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 2.1 | Extend `categories`: `description`, `parent_category_id` (self-FK), `status`, `color`, `icon`                                                                                                                 | `CategoryRecord` needs all 5; none exist today                                                                                                                                               | —                                                                      |
| 2.2 | Extend `merchant_memory`: `aliases text[]` (or a separate `merchant_aliases` table if one row per alias is intentional), `default_category_id uuid REFERENCES categories(id)`, `status`, `notes`, `has_rules` | `MerchantRecord` needs all 5; the current one-row-per-alias pattern (`DECATHLON SPORTS`, `DECATHLON SPORTS ON` → same `display_name`) should be an explicit design decision, not backed into | Decide array-column vs. join-table shape before writing this migration |
| 2.3 | Add `client_type text` to `clients`                                                                                                                                                                           | `ClientRecord.clientType` has no backing column; seeded values (`Personal`/`Business`/`Internal`) currently live only in the label field                                                     | —                                                                      |
| 2.4 | Add `client_id uuid REFERENCES clients(id)` to `accounts` and `statements`                                                                                                                                    | Needed for `linkedAccountsCount`/`linkedCreditCardsCount` on `ClientRecord`, and for `Statement.client`                                                                                      | —                                                                      |

---

## Phase 3 — Accounts/Credit Cards data integrity (unblocks Modules 8, 9)

| #   | Item                                                                                                                                                                                              | Rationale                                                                                                                                            | Depends on |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 3.1 | Populate `current_balance`, `credit_limit`, `card_network` for existing 7 `accounts` rows                                                                                                         | All `null` today — this is a data-entry/backfill task, not a schema change                                                                           | —          |
| 3.2 | Add a CHECK constraint (or enum type) on `accounts.account_type`                                                                                                                                  | No constraint today; two frontend repositories (bank accounts, credit cards) will both filter on this value, so its vocabulary should be locked down | —          |
| 3.3 | Define a precedence rule for the three overlapping "last4" columns (`account_number_last4`, `card_last4`, `account_last4`) and the two overlapping status columns (`account_status`, `is_active`) | Ambiguous today; needed before the repository mapping layer can pick one deterministically                                                           | —          |

---

## Phase 4 — New tables (unblocks Module 11, audit/notification features)

| #   | Item                          | Rationale                                                                                                             |
| --- | ----------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 4.1 | Create `application_settings` | Blocks Module 11 (Settings) entirely — CLAUDE.md lists it as an approved new table but it doesn't exist               |
| 4.2 | Create `audit_logs`           | Blocks the "Audit History" feature already promised in the Transactions (Module 3) and Merchants (Module 6) contracts |
| 4.3 | Create `notifications`        | Referenced by the Dashboard's notification area concept                                                               |

---

## Phase 5 — View/RPC layer (unblocks Modules 2, 3, 4, 6, 8, 9, 10, 11)

The largest phase by volume — ~27 of the ~30 views CLAUDE.md Part 3 requires don't exist yet. **Recommend building these incrementally, one per module, alongside each module's repository swap** rather than as a single upfront pass — this matches CLAUDE.md's "one module at a time" philosophy and means each view can be validated against that module's actual query needs instead of being speculative.

| Module           | Views needed                                                                                                                                                                                                      | Status                                                                                                 |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 2 — Dashboard    | `vw_dashboard_cashflow`, `vw_dashboard_due_cards`                                                                                                                                                                 | Missing (`vw_dashboard_summary`, `vw_dashboard_accounts` already exist)                                |
| 3 — Transactions | `vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_transactions_review`, `vw_transactions_duplicates`                                                                                      | All missing                                                                                            |
| 4 — Statements   | `vw_statements`, `vw_statement_summary`, `vw_statement_transactions`, `vw_statement_processing`, `vw_statement_reconciliation`, `vw_statement_metrics`                                                            | All missing                                                                                            |
| 6 — Merchants    | `vw_merchants`, `vw_merchant_details`, `vw_merchant_transactions`, `vw_merchant_analytics`                                                                                                                        | All missing                                                                                            |
| 8 — Accounts     | `vw_accounts`, `vw_account_summary`, `vw_account_transactions`, `vw_account_trends`, `vw_account_health`                                                                                                          | All missing                                                                                            |
| 10 — Analytics   | `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_account_analytics`, `vw_credit_utilization`, `vw_transaction_trends`                                                             | All missing                                                                                            |
| 11 — Settings    | `vw_settings_general`, `vw_settings_accounts`, `vw_settings_categories`, `vw_settings_merchants`, `vw_settings_ai`, `vw_settings_integrations`, `vw_system_health`                                                | All missing                                                                                            |
| Cross-cutting    | `rpc_search`, `rpc_merge_merchants`, `rpc_detect_duplicates`, `rpc_generate_monthly_summary`, `rpc_dashboard_summary`, `rpc_recalculate_health`, `rpc_refresh_materialized_views`, `rpc_statement_reconciliation` | All missing (only `lookup_merchant`/`upsert_merchant_memory` exist, both Workflow C support functions) |

---

## Phase 6 — Cleanup

| #   | Item                                                                | Rationale                                                                                                                                                                        |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1 | Revoke `INSERT`/`UPDATE`/`DELETE` grants on `vw_dashboard_accounts` | Currently writable as a side effect of being a simple auto-updatable Postgres view; should be read-only to prevent it becoming an undocumented second write path into `accounts` |

---

## Suggested Sequencing

```
Phase 0 (verify) ──► Phase 1 (transaction linkage) ──┬─► Phase 2 (master data)
                                                       ├─► Phase 3 (accounts/cards data)
                                                       └─► Phase 5 (views, per-module, ongoing)
                                                             │
Phase 4 (new tables) ──────────────────────────────────────┘ (independent, can run anytime)
Phase 6 (cleanup) ──────────────────────────────────────────  (independent, low-risk, anytime)
```

Phase 0 gates everything. Phase 1 gates Phases 2/3/5 because those all read `transactions` linkage. Phase 4 and Phase 6 have no dependencies and can be scheduled whenever convenient.

---

_Every item above requires a reviewed, reversible migration per CLAUDE.md's Migration Rules (Migration → Review → Test → Deployment) — none should be applied directly to the production schema. This document does not authorize or perform any of them._
