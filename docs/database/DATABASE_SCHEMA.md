# Database Schema

## Scope and method

This document was produced by inspecting:

1. `supabase/migrations/`, `supabase/views/`, `supabase/rpc/`, `supabase/functions/` in this repository, and
2. CLAUDE.md Part 3 ("DATABASE STANDARDS") and Part 1 ("EXISTING BACKEND"), which are the only written record this repository has of the live database.

**No live Supabase schema inspection was performed as part of this pass** — no Supabase MCP/CLI call was made to list actual tables, columns, or views on the connected project. `SUPABASE_REPORT.md` (see [docs/reports](../reports/) via its move in Step 4, originally at repo root) notes a Supabase MCP was connected during bootstrap specifically so a future session could do this inspection before writing schema-dependent code — that inspection has still not happened as of this pass. Everything below is therefore either **(a) verified present in this repo's `supabase/` folder** or **(b) a name/claim carried from CLAUDE.md, explicitly marked unverified**. Nothing below is invented.

---

## 1. What exists in this repository's `supabase/` folder — verified

```
supabase/
  migrations/   — empty (0 files)
  views/        — empty (0 files)
  rpc/          — empty (0 files)
  functions/    — empty (0 files)
```

There is **no SQL of any kind checked into this repository** — no migration files, no view definitions, no RPC function bodies, no edge functions. This matches `STRUCTURE_REPORT.md`'s bootstrap-time note that these folders were created empty "per rule" (no schema created without an approved module scoping it), and confirms that state has not changed through Module 9.

`src/lib/supabase.ts` exists and exports a configured `supabase` client (reads `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` from env, throws if missing) — but per `SUPABASE_REPORT.md`, this client **is not imported anywhere in the app yet** (confirmed still true: no `src/repositories/*.ts` or `src/services/*.ts` file imports `@/lib/supabase` — every repository today is a `Mock*Repository`, see [REPOSITORY_MAP.md](../architecture/REPOSITORY_MAP.md)).

**Conclusion: zero database schema is defined or verified anywhere in this codebase today.**

---

## 2. Tables named in CLAUDE.md — status unverified

CLAUDE.md Part 3 ("EXISTING DATABASE" / "NEW TABLES") names specific tables and asserts some already exist in production. This repository has no way to confirm that claim (no migration defines them, no live inspection was run). Listed here exactly as CLAUDE.md states them, with each one's claimed status and this repository's evidence level.

### Claimed to already exist in production (per CLAUDE.md, table structure not verified here)

| Table                    | CLAUDE.md's claim                                                                            | Column-level detail available?                                                              |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `transactions`           | Existing production table, written by n8n Workflow A/B                                       | No — CLAUDE.md never lists its columns; only that `Transaction` (domain model) "mirrors" it |
| `statement_transactions` | Existing production table, written by n8n Workflow B                                         | No                                                                                          |
| `processed_messages`     | Existing production table, written by n8n Workflow A                                         | No                                                                                          |
| `merchant_memory`        | Existing production table, written by n8n Workflow A/C, read/written by Module 6 (Merchants) | No                                                                                          |
| `monthly_summaries`      | Existing production table                                                                    | No                                                                                          |
| `banks`                  | Existing production table                                                                    | No                                                                                          |
| `categories`             | Existing production table, read/written by Module 5 (Categories)                             | No                                                                                          |
| `email_sources`          | Existing production table                                                                    | No                                                                                          |

CLAUDE.md is explicit that these "must NOT be redesigned. Only extend them through approved migrations" — this document does not propose column changes to any of them.

### Claimed as future/new tables (per CLAUDE.md, not yet created anywhere)

| Table                  | CLAUDE.md's claim                                                       | Which frontend module needs it                                                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `accounts`             | New table — to hold both bank accounts and credit cards (`AccountKind`) | Module 8 (Accounts), Module 9 (Credit Cards)                                                                                                                                    |
| `statements`           | New table                                                               | Module 4 (Statements)                                                                                                                                                           |
| `clients`              | New table                                                               | Module 7 (Clients)                                                                                                                                                              |
| `audit_logs`           | New table                                                               | Not yet consumed by any built module's repository (no `AuditLog` domain type exists)                                                                                            |
| `notifications`        | New table                                                               | Not yet consumed by any built module's repository (no `Notification` domain type exists; Dashboard's "Notifications" section referenced in `PRODUCT_DECISIONS.md` is not built) |
| `application_settings` | New table                                                               | Module 11 (Settings) — not yet built                                                                                                                                            |

No migration for any of these exists in `supabase/migrations/`.

---

## 3. SQL Views named in CLAUDE.md — none exist

CLAUDE.md Part 3 ("REQUIRED SQL VIEWS") lists 30 views across Dashboard, Transactions, Accounts, Statements, Analytics, Merchant, AI, Search, and System categories, plus a small number of RPC functions (`rpc_search`, `rpc_merge_merchants`, `rpc_detect_duplicates`, `rpc_generate_monthly_summary`, `rpc_dashboard_summary`, `rpc_recalculate_health`, `rpc_refresh_materialized_views`, `rpc_statement_reconciliation`) and materialized views for Dashboard/Analytics aggregates.

**None of these are defined in `supabase/views/` or `supabase/rpc/` (both empty).** Every repository/service comment referencing a `vw_*` name (catalogued in [REPOSITORY_MAP.md](../architecture/REPOSITORY_MAP.md)) is a **forward reference to a view that does not exist yet** — the mock repositories simulate what querying that view would return, nothing more.

Full required-view list, reproduced from CLAUDE.md for traceability (status: **none created**):

- Dashboard: `vw_dashboard_summary`, `vw_dashboard_accounts`, `vw_dashboard_cashflow`, `vw_dashboard_due_cards`
- Transactions: `vw_transactions`, `vw_transaction_details`, `vw_transaction_search`, `vw_transactions_review`, `vw_transactions_duplicates`
- Accounts: `vw_accounts`, `vw_account_summary`, `vw_account_transactions`, `vw_account_trends`, `vw_account_health`
- Statements: `vw_statements`, `vw_statement_summary`, `vw_statement_transactions`, `vw_statement_processing`, `vw_statement_reconciliation`, `vw_statement_metrics`
- Analytics: `vw_monthly_spend`, `vw_cashflow`, `vw_category_spend`, `vw_merchant_spend`, `vw_account_analytics`, `vw_credit_utilization`, `vw_transaction_trends`
- Merchant: `vw_merchants`, `vw_merchant_details`, `vw_merchant_transactions`, `vw_merchant_analytics`
- AI (deferred module — see CLAUDE.md "DEFERRED MODULES"): `vw_ai_review`, `vw_ai_review_summary`, `vw_ai_accuracy`
- Search (deferred module): `vw_global_search`
- System: `vw_system_health`

Note: Categories (Module 5) and Clients (Module 7) repository comments reference "a category-summary view" / "a client-summary view" without a fixed `vw_*` name — those two are not in CLAUDE.md's required-view list at all, meaning their exact view name is undecided, not just unbuilt.

---

## 4. Columns, types, nullability, defaults, PKs, FKs, indexes, constraints, RLS, functions, triggers

**Not documented — cannot be, without inventing it.** No column-level schema exists anywhere this repository can inspect (no migrations, no live inspection performed). Per this task's explicit "Do NOT invent schema" instruction, this section is intentionally left as a gap rather than filled with plausible-looking guesses.

What CAN be stated without inventing: the **frontend's own domain types** (`src/domain/*.ts`, fully catalogued in [DOMAIN_MODEL.md](../architecture/DOMAIN_MODEL.md)) describe the shape every repository method currently returns, and several domain file comments state explicit intent to mirror a real table 1:1 (e.g. `Transaction`: "Field names here are camelCase for the frontend; merchantId/categoryId/clientId/accountId map 1:1 to the table's FK columns"). [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md) uses these domain shapes to propose a **candidate** column mapping — explicitly labeled as a proposal for Module 12A to validate against the real schema via live inspection, not as a statement of present fact.

---

## 5. Recommended immediate next step (informational — not part of this documentation pass's scope)

Before Module 12A begins, `SUPABASE_REPORT.md`'s original recommendation still stands and has not been acted on: use the connected Supabase MCP/CLI to list the actual tables/views/columns on the live project, so [SUPABASE_MAPPING.md](./SUPABASE_MAPPING.md)'s candidate mapping can be checked against reality before any repository is written. This document does not perform that inspection — it is out of scope for a documentation-only pass and the CLAUDE.md phase this session operates under.
