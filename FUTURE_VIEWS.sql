-- ============================================================================
-- FUTURE_VIEWS.sql
-- Finance Command Center — Database Foundation phase (pre-Module 12A)
--
-- STATUS: NOT EXECUTED. Not part of the initial migration.
--
-- These 10 views were originally drafted as part of DATABASE_MIGRATIONS.sql
-- Phase 7 but were moved here after a review against actual repository
-- interface methods and built frontend components (see
-- VIEW_USAGE_MATRIX.md — this file corresponds exactly to its
-- "Future / Optional" tier). None of them are consumed by any current
-- `*.repository.ts` interface method or any already-built component file.
--
-- This file is intentionally NOT run as part of DATABASE_MIGRATIONS.sql.
-- Apply it (still additive, still CREATE OR REPLACE, still safe) only once
-- a real consumer exists — e.g. when a specific screen/component that needs
-- one of these is actually being built. Depends on DATABASE_MIGRATIONS.sql
-- having already run (all of these reference columns/tables it adds).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- vw_dashboard_cashflow — Dashboard (Module 2)
-- Not referenced by dashboard.service.ts's own comment (which names only
-- vw_dashboard_summary/vw_dashboard_accounts/vw_dashboard_due_cards/
-- vw_ai_review_summary) and no CashFlowChart-equivalent component exists in
-- src/components/dashboard today. CLAUDE.md Part 3 lists it under Module 2,
-- so build this when that widget is actually scoped.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_dashboard_cashflow AS
SELECT
  date_trunc('month', t.transaction_date)::date AS month,
  SUM(CASE
        WHEN t.transaction_type ILIKE '%credit%' OR t.payment_mode ILIKE '%credit%'
          OR t.transaction_type ILIKE '%refund%' OR t.transaction_type ILIKE '%cashback%'
        THEN t.amount ELSE 0
      END) AS inflow,
  SUM(CASE
        WHEN NOT (t.transaction_type ILIKE '%credit%' OR t.payment_mode ILIKE '%credit%'
          OR t.transaction_type ILIKE '%refund%' OR t.transaction_type ILIKE '%cashback%')
        THEN t.amount ELSE 0
      END) AS outflow,
  SUM(CASE
        WHEN t.transaction_type ILIKE '%credit%' OR t.payment_mode ILIKE '%credit%'
          OR t.transaction_type ILIKE '%refund%' OR t.transaction_type ILIKE '%cashback%'
        THEN t.amount ELSE -t.amount
      END) AS net
FROM public.transactions t
WHERE t.transaction_date IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.vw_dashboard_cashflow IS
  'FUTURE — see FUTURE_VIEWS.sql header. Monthly inflow/outflow/net for a Dashboard cash-flow widget that does not exist yet in src/components/dashboard. Debit/credit split is a provisional heuristic — see DATABASE_MIGRATIONS.sql Phase 7 header comment for why.';

-- ---------------------------------------------------------------------------
-- vw_transactions_review — Transactions (Module 3)
-- No ReviewPanel component exists in src/components/transactions today
-- (CLAUDE.md's original Module 3 spec named one, but the actually-built
-- module handles review state via TransactionTable + StatusBadge +
-- TransactionFilters.status instead). Build this if/when a dedicated review
-- queue screen is scoped; until then, `vw_transactions WHERE status = ...`
-- covers the same need.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_transactions_review AS
SELECT v.*
FROM public.vw_transactions v
WHERE v.status IN ('pending_review', 'uncategorized', 'flagged')
   OR v.category_id IS NULL
   OR v.merchant_id IS NULL
   OR v.account_id IS NULL;

COMMENT ON VIEW public.vw_transactions_review IS
  'FUTURE — see FUTURE_VIEWS.sql header. Transactions needing human review: unmapped status, or missing category/merchant/account FK resolution.';

-- ---------------------------------------------------------------------------
-- vw_transactions_duplicates — Transactions (Module 3)
-- Same reasoning as vw_transactions_review — no DuplicatePanel component
-- exists in the built module. Also has little to show today regardless,
-- since duplicate_of_id is unbackfilled (see DATABASE_MIGRATIONS.sql's
-- backfill strategy).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_transactions_duplicates AS
SELECT
  t.id,
  t.duplicate_of_id,
  orig.transaction_date AS original_date,
  orig.amount AS original_amount,
  t.transaction_date AS duplicate_date,
  t.amount AS duplicate_amount,
  t.is_duplicate
FROM public.transactions t
LEFT JOIN public.transactions orig ON orig.id = t.duplicate_of_id
WHERE t.is_duplicate = true OR t.duplicate_of_id IS NOT NULL;

COMMENT ON VIEW public.vw_transactions_duplicates IS
  'FUTURE — see FUTURE_VIEWS.sql header. Pairs each flagged/linked duplicate with the original it duplicates.';

-- ---------------------------------------------------------------------------
-- vw_account_trends — Accounts (Module 8) / Credit Cards (Module 9)
-- CLAUDE.md's original spec named a "BalanceHistory" component; the
-- actually-built src/components/accounts has no trend-chart file today.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_account_trends AS
SELECT
  t.account_id,
  date_trunc('month', t.transaction_date)::date AS month,
  COUNT(*) AS transaction_count,
  SUM(t.amount) AS total_amount
FROM public.transactions t
WHERE t.account_id IS NOT NULL
GROUP BY 1, 2
ORDER BY 1, 2 DESC;

COMMENT ON VIEW public.vw_account_trends IS
  'FUTURE — see FUTURE_VIEWS.sql header. Monthly per-account spend trend for a trend chart that does not exist in the built Accounts module yet.';

-- ---------------------------------------------------------------------------
-- vw_credit_utilization — Analytics (Module 10)
-- CLAUDE.md Part 3's canonical Analytics-scoped utilization view name.
-- AnalyticsRepository's 14 methods (already built) have no
-- getCreditUtilization-equivalent — getCreditCardSpend returns a $-spend
-- series (AnalyticsCardSeriesResult), a different shape. Distinct from
-- vw_credit_card_utilization (Module 9), which IS required immediately and
-- stays in DATABASE_MIGRATIONS.sql.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_credit_utilization AS
SELECT
  a.id AS account_id,
  a.account_name,
  a.card_network,
  a.credit_limit,
  a.current_balance AS outstanding,
  a.available_credit,
  CASE WHEN a.credit_limit IS NOT NULL AND a.credit_limit > 0
    THEN ROUND(100.0 * COALESCE(a.current_balance, 0) / a.credit_limit, 1)
    ELSE NULL
  END AS utilization_percent
FROM public.accounts a
WHERE a.account_type = 'Credit Card';

COMMENT ON VIEW public.vw_credit_utilization IS
  'FUTURE — see FUTURE_VIEWS.sql header. CLAUDE.md Part 3 canonical Analytics-scoped utilization view; no current AnalyticsRepository method consumes it (compare vw_credit_card_utilization, Module 9, Required immediately, in DATABASE_MIGRATIONS.sql).';

-- ---------------------------------------------------------------------------
-- vw_merchant_details — Merchants (Module 6)
-- MerchantRepository's interface has no getById()/detail method at all
-- today (only list/getSummary/create/update/delete) — nothing to consume a
-- detail-specific view yet. Build if a getById() method is ever added.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_merchant_details AS
SELECT m.*
FROM public.vw_merchants m;

COMMENT ON VIEW public.vw_merchant_details IS
  'FUTURE — see FUTURE_VIEWS.sql header. Currently identical to vw_merchants; kept as a distinct name for when MerchantRepository gains a detail-specific method with its own fields.';

-- ---------------------------------------------------------------------------
-- vw_merchant_analytics — Merchants (Module 6)
-- No confirmed spend-trend chart inside MerchantReviewDrawer today (weaker
-- evidence than vw_merchant_transactions, which IS kept in
-- DATABASE_MIGRATIONS.sql as Required-during-12A based on the drawer's
-- documented "Transaction History" feature).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_merchant_analytics AS
SELECT
  mm.id AS merchant_id,
  mm.display_name,
  date_trunc('month', t.transaction_date)::date AS month,
  COUNT(*) AS transaction_count,
  SUM(t.amount) AS total_spend,
  AVG(t.amount) AS average_transaction
FROM public.merchant_memory mm
JOIN public.transactions t ON t.merchant_id = mm.id
GROUP BY mm.id, mm.display_name, 2;

COMMENT ON VIEW public.vw_merchant_analytics IS
  'FUTURE — see FUTURE_VIEWS.sql header. Monthly per-merchant spend trend, no confirmed current consumer in MerchantReviewDrawer.';

-- ---------------------------------------------------------------------------
-- vw_statement_processing, vw_statement_reconciliation, vw_statement_metrics
-- — Statements (Module 4)
-- CLAUDE.md's original spec named "ReconciliationCard"/"MetricsCard"
-- components; src/components/statements has neither today (only
-- StatementDetailsDrawer, StatementFilters, StatementRowActionsMenu,
-- StatementsHeader, StatementStatusBadge, StatementSummaryWidget,
-- StatementTable, StatementTableSkeleton, UploadStatementDialog).
-- StatementStatusBadge reads statements.processing_status directly and
-- needs no aggregate view. All three are also functionally near-empty until
-- the statements table actually gets rows (see N8N_DATABASE_MAPPING.md).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vw_statement_processing AS
SELECT
  s.id,
  s.statement_name,
  s.processing_status,
  s.created_at,
  s.updated_at,
  (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS rows_extracted
FROM public.statements s
WHERE s.processing_status IS DISTINCT FROM 'Processed';

COMMENT ON VIEW public.vw_statement_processing IS
  'FUTURE — see FUTURE_VIEWS.sql header. In-flight/failed statement processing status feed; no ReconciliationCard/processing-timeline component built yet.';

CREATE OR REPLACE VIEW public.vw_statement_reconciliation AS
SELECT
  s.id AS statement_id,
  s.total_debits,
  s.total_credits,
  (SELECT COALESCE(SUM(st.amount), 0) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS extracted_total,
  s.total_debits - (SELECT COALESCE(SUM(st.amount), 0) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS variance
FROM public.statements s;

COMMENT ON VIEW public.vw_statement_reconciliation IS
  'FUTURE — see FUTURE_VIEWS.sql header. Compares declared statement totals against the sum of linked statement_transactions; meaningless until statement_id linkage is fixed (N8N_DATABASE_MAPPING.md) regardless of whether a component consumes it.';

CREATE OR REPLACE VIEW public.vw_statement_metrics AS
SELECT
  date_trunc('month', s.statement_date)::date AS month,
  COUNT(*) AS statements_count,
  SUM(s.total_debits) AS total_debits,
  SUM(s.total_credits) AS total_credits
FROM public.statements s
WHERE s.statement_date IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.vw_statement_metrics IS
  'FUTURE — see FUTURE_VIEWS.sql header. Monthly statement volume/totals; no MetricsCard component built yet.';

COMMIT;

-- ============================================================================
-- To promote a view from here into the live migration once a real consumer
-- is scoped: move its CREATE OR REPLACE VIEW + COMMENT ON VIEW block back
-- into DATABASE_MIGRATIONS.sql's Phase 7 (replacing the `-- NOTE:` comment
-- left at its original location), and update VIEW_USAGE_MATRIX.md's
-- "Currently Used" column for that row from No to Yes.
-- ============================================================================
