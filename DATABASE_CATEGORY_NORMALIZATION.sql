-- ============================================================================
-- DATABASE_CATEGORY_NORMALIZATION.sql
-- Finance Command Center — Category Vocabulary Reconciliation, Phase 1
--
-- Purpose: apply the canonical category mapping approved by Purvak on
-- 2026-08-19 (see CATEGORY_VOCABULARY_RECONCILIATION.md) to merchant_memory
-- and statement_transactions. Closes the 8-value vocabulary gap between
-- Workflow C Parser's categorization enum and Workflow D's categorization
-- enum, documented in that report.
--
-- Approved mapping:
--   Taxi          -> Transport        (merge into existing category)
--   Airlines      -> Travel           (merge into existing category)
--   Bank Charges  -> Fees & Charges   (merge into existing category)
--   Dining        -> Food             (merge into existing category)
--   Food Delivery -> Food             (merge into existing category)
--   Software      -> SaaS Software    (new category)
--   EMI           -> Loans & EMI      (new category)
--   Income        -> Income           (new category)
--
-- Scope: category-vocabulary normalization ONLY.
--   - Does NOT touch amount, date, merchant, account, client, or statement
--     columns on any table.
--   - Does NOT change transaction direction/type.
--   - Does NOT delete or fabricate any row.
--   - Does NOT touch statement_transactions.statement_id linkage (deferred
--     to Module 12B per prior decision).
--   - Does NOT modify n8n workflows.
--
-- Idempotency: every UPDATE is a plain `SET category = target WHERE
-- category = source` — after the first successful run, no row will match
-- `source` again, so re-running this file is a safe no-op. The 3 category
-- INSERTs are guarded with `WHERE NOT EXISTS`.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1 — Create the 3 new canonical categories
-- ============================================================================
-- Colors chosen from the same token set already used by the seeded
-- categories (src/domain/Category.ts CATEGORY_COLORS), avoiding
-- reassigning a color already dominant among conceptually-adjacent
-- categories where reasonable.
INSERT INTO public.categories (name, description, status, color, icon)
SELECT v.name, v.description, 'active', v.color, v.icon
FROM (VALUES
  ('SaaS Software', 'Software and SaaS subscriptions/purchases (e.g. Anthropic Claude, hosting/VPS).', 'violet', 'code'),
  ('Loans & EMI',    'Loan and credit EMI repayments.',                                                'amber',  'landmark'),
  ('Income',         'Incoming payments/credits — not an expense category.',                           'emerald','arrow-down-circle')
) AS v(name, description, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.name = v.name
);

-- ============================================================================
-- STEP 2 — Normalize merchant_memory.category (text) per approved mapping
-- ============================================================================
UPDATE public.merchant_memory SET category = 'Transport'     WHERE category = 'Taxi';
UPDATE public.merchant_memory SET category = 'Travel'        WHERE category = 'Airlines';
UPDATE public.merchant_memory SET category = 'Fees & Charges' WHERE category = 'Bank Charges';
UPDATE public.merchant_memory SET category = 'Food'          WHERE category = 'Dining';
UPDATE public.merchant_memory SET category = 'Food'          WHERE category = 'Food Delivery';
UPDATE public.merchant_memory SET category = 'SaaS Software' WHERE category = 'Software';
UPDATE public.merchant_memory SET category = 'Loans & EMI'   WHERE category = 'EMI';
UPDATE public.merchant_memory SET category = 'Income'        WHERE category = 'Income';

-- ============================================================================
-- STEP 3 — Resolve merchant_memory.default_category_id for rows now matching
-- a canonical category name (this repeats the same exact-name-match backfill
-- DATABASE_SEED.sql already used; it only touches rows still NULL).
-- ============================================================================
UPDATE public.merchant_memory mm
SET default_category_id = c.id
FROM public.categories c
WHERE mm.default_category_id IS NULL
  AND mm.category = c.name;

-- ============================================================================
-- STEP 4 — Normalize statement_transactions.category (text) per the same
-- approved mapping. statement_transactions has no category_id FK column
-- (confirmed absent from schema) — this is a text-only normalization.
-- Rows whose category is already canonical are untouched (WHERE clause only
-- matches the 8 legacy values).
-- ============================================================================
UPDATE public.statement_transactions SET category = 'Transport'      WHERE category = 'Taxi';
UPDATE public.statement_transactions SET category = 'Travel'         WHERE category = 'Airlines';
UPDATE public.statement_transactions SET category = 'Fees & Charges' WHERE category = 'Bank Charges';
UPDATE public.statement_transactions SET category = 'Food'           WHERE category = 'Dining';
UPDATE public.statement_transactions SET category = 'Food'           WHERE category = 'Food Delivery';
UPDATE public.statement_transactions SET category = 'SaaS Software'  WHERE category = 'Software';
UPDATE public.statement_transactions SET category = 'Loans & EMI'    WHERE category = 'EMI';
UPDATE public.statement_transactions SET category = 'Income'         WHERE category = 'Income';

COMMIT;
