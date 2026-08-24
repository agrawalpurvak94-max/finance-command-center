# DEV_DATA_RESET_VERIFICATION.md

Verification of the approved, scoped dev-data reset. Executed against the live development Supabase project via the same direct-Postgres connection used throughout this engagement.

---

## What was executed

```sql
DELETE FROM public.transactions;
DELETE FROM public.statement_transactions;
DELETE FROM public.merchant_memory;
```

Run inside a single transaction (`BEGIN...COMMIT`), in that order (respecting `transactions.merchant_id → merchant_memory.id` — child deleted before parent, though the earlier dependency audit had already confirmed this FK was unset on every row). **Committed successfully, no errors.**

`public.categories`, `public.accounts`, `public.clients`, `public.application_settings`, `public.statements`, `public.audit_logs`, `public.notifications`, RLS policies, indexes, views, and all other schema objects were not touched by this operation — no other statement was executed.

## Row counts: before → after

| Table                    | Before | After  | Expected | Match                         |
| ------------------------ | ------ | ------ | -------- | ----------------------------- |
| `transactions`           | 14     | **0**  | 0        | ✅                            |
| `statement_transactions` | 89,308 | **0**  | 0        | ✅                            |
| `merchant_memory`        | 83     | **0**  | 0        | ✅                            |
| `statements`             | 0      | 0      | 0        | ✅ (already empty, untouched) |
| `categories`             | 24     | **24** | 24       | ✅ unchanged                  |
| `accounts`               | 7      | **7**  | 7        | ✅ unchanged                  |
| `clients`                | 3      | **3**  | 3        | ✅ unchanged                  |
| `application_settings`   | 9      | **9**  | 9        | ✅ unchanged                  |

Rows actually deleted, confirmed by `DELETE`'s own row count (not just before/after subtraction): `transactions`=14, `statement_transactions`=89,308, `merchant_memory`=83 — matches exactly.

## RLS policies

**All 15 policies present, unchanged** — identical set of table/policy-name/command triples as before the reset, including `own_tx_select/insert/update/delete`, `service_role_bypass`, `own_statement_transactions_all`, `own_merchant_memory_all`, `own_accounts_all`, `own_clients_all`, `own_cat_all`, `read_default_categories`, and the others untouched by this scope (`own_banks_all`, `own_email_all`, `own_processed_messages_all`, `own_statements_all`). Row deletion is data-plane only; nothing here was ever at risk, confirmed regardless.

## Views

All 24 Phase-7 migration views plus the two pre-existing dashboard views execute successfully. Row counts now correctly reflect the reset: views that read `transactions`/`statement_transactions`/`merchant_memory` (`vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_statement_transactions`, `vw_merchants`, `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_transaction_trends`, `vw_account_transactions`, `vw_merchant_transactions`, `vw_client_top_categories`, `vw_client_top_merchants`) now correctly return 0 rows. Views over untouched tables (`vw_accounts`=7, `vw_categories`=24, `vw_client_summary`=3, `vw_account_health`=7, `vw_credit_card_utilization`=3, `vw_statement_summary`=1 row — a zero-row aggregate, not a phantom statement) are unchanged. `vw_dashboard_cashflow`'s "failure" is the same pre-existing, already-documented non-issue from Module 12A (that view name was never created by any migration — confirmed against `DATABASE_MIGRATIONS.sql`'s actual `CREATE VIEW` statements previously; not a regression from this reset).

## Indexes and schema

29 indexes remain present across the 3 reset tables (schema-level objects; a `DELETE` never touches index/constraint/trigger definitions — confirmed directly rather than assumed).

## Category vocabulary integrity

All 24 category names confirmed intact and unchanged — impossible for this operation to have affected them regardless, since `categories` was never referenced by any statement in the executed transaction, but verified directly rather than assumed.

## Account/client reference data

All 7 real accounts confirmed present with unchanged names (HDFC Savings, HDFC Current, Axis Current, ICICI Savings, AMEX Platinum, HDFC Millennia, SBI Cashback).

**Pre-existing test-data pollution found, not part of this reset's scope, not touched**: `clients.client_name` currently reads `Acme Corp QA`, `Internal`, `Personal` — not `Business`, `Internal`, `Personal` as originally seeded. This is almost certainly leftover from an earlier Playwright test run's "edit client" flow (the same class of issue as the account-nickname pollution found and cleaned up during Module 12A's credit-card testing), not something this reset created or is authorized to fix. Flagging for your awareness; left exactly as found since `clients` was explicitly out of scope for this operation.

---

## Summary

Every number you asked me to confirm matches exactly: `transactions=0`, `statement_transactions=0`, `merchant_memory=0`, `statements=0`, `categories=24`, `accounts=7`, `clients=3`, `application_settings=9`. RLS policies (15/15) and views (all executing) confirmed intact. No schema object was modified. No n8n workflow was touched.

**Stopping here, per instruction.** Module 12B has not been started. Waiting for your explicit approval before proceeding — and for your call on the `Acme Corp QA` client-name finding whenever you'd like it addressed.
