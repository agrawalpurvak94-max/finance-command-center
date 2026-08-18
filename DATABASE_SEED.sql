-- ============================================================================
-- DATABASE_SEED.sql
-- Finance Command Center — Database Foundation phase (pre-Module 12A)
--
-- STATUS: NOT EXECUTED. Generated for review only.
-- Depends on DATABASE_MIGRATIONS.sql having already run (references columns
-- — categories.status/color, merchant_memory.status/has_rules,
-- clients.client_type, application_settings — that migration adds).
--
-- Every INSERT below is guarded with WHERE NOT EXISTS so this file is safe
-- to run multiple times and will never duplicate a row. Nothing here
-- deletes or overwrites existing data — UPDATEs are scoped to
-- "backfill this new column only where it is currently NULL".
-- ============================================================================

BEGIN;

-- ============================================================================
-- CATEGORIES
-- ============================================================================
-- The 9 live categories (Food, Travel, Fuel, Shopping, Utilities,
-- Entertainment, Medical, Office Supplies, Other) are left untouched.
--
-- Workflow C/D's "AI Categorize" node (Gemini) is hard-coded with a
-- 19-value category enum (see N8N_DATABASE_MAPPING.md) that is wider than
-- the categories table. Live transactions already contain values from that
-- enum with no matching category row (Investment, Business, Uncategorized
-- — confirmed in SUPABASE_AUDIT.md's raw observations; merchant_memory
-- additionally has "Groceries"). This section adds the remaining values
-- from that enum so the vocabulary gap closes without changing the
-- workflow (out of scope for this phase) or inventing categories the
-- system doesn't actually use.
INSERT INTO public.categories (name, description, status, color, icon)
SELECT v.name, v.description, 'active', v.color, v.icon
FROM (VALUES
  ('Groceries',       'Everyday grocery and household staples.',            'emerald', 'shopping-basket'),
  ('Transport',       'Cabs, ride-hailing, public transit — distinct from Fuel.', 'blue',    'car'),
  ('Education',       'Tuition, courses, books, educational fees.',          'violet',  'graduation-cap'),
  ('Insurance',       'Insurance premiums (health, life, vehicle, etc.).',   'blue',    'shield'),
  ('Rent',             'Rent and housing lease payments.',                   'amber',   'home'),
  ('Subscriptions',   'Recurring software/media/service subscriptions.',    'primary', 'repeat'),
  ('Personal Care',   'Grooming, wellness, personal-care spend.',            'rose',    'sparkles'),
  ('Business',        'Business-related spend not otherwise categorized.',  'tertiary','briefcase'),
  ('Fees & Charges',  'Bank fees, late fees, service charges.',              'rose',    'receipt'),
  ('Transfer',        'Internal transfers between own accounts.',           'primary', 'arrow-left-right'),
  ('Investment',      'Investment purchases (stocks, mutual funds, etc.).', 'emerald', 'trending-up'),
  ('Uncategorized',   'AI could not confidently assign a category.',        'amber',   'help-circle')
) AS v(name, description, color, icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.categories c WHERE c.name = v.name
);

-- ============================================================================
-- CLIENTS
-- ============================================================================
-- The 3 live clients (Personal, Business, Internal) already exist — this
-- INSERT is a documented no-op for them (kept for completeness/idempotency,
-- e.g. if run against a fresh project that has none of the three yet).
INSERT INTO public.clients (client_name, client_type, is_active)
SELECT v.client_name, v.client_type, true
FROM (VALUES
  ('Personal', 'personal'),
  ('Business', 'company'),
  ('Internal', 'business_unit')
) AS v(client_name, client_type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.clients c WHERE c.client_name = v.client_name
);

-- Backfill client_type on the 3 existing live rows (added as a new nullable
-- column in DATABASE_MIGRATIONS.sql Phase 2.3 — they predate it and would
-- otherwise stay null). This is a best-guess mapping from the label already
-- in client_name; 'Internal' -> 'business_unit' is the most debatable of
-- the three (could equally be 'trust' depending on what "Internal" means
-- in practice) — flagged for confirmation, not assumed as final.
UPDATE public.clients
SET client_type = 'personal'
WHERE client_name = 'Personal' AND client_type IS NULL;

UPDATE public.clients
SET client_type = 'company'
WHERE client_name = 'Business' AND client_type IS NULL;

UPDATE public.clients
SET client_type = 'business_unit'
WHERE client_name = 'Internal' AND client_type IS NULL;

-- ============================================================================
-- ACCOUNTS
-- ============================================================================
-- Deliberately no INSERTs here. 7 real accounts already exist (HDFC
-- Savings, HDFC Current, Axis Current, ICICI Savings, AMEX Platinum, HDFC
-- Millennia, SBI Cashback per SUPABASE_AUDIT.md) — this is a single-user
-- application with real onboarded accounts (CLAUDE.md: "There is only one
-- client"), so fabricating additional placeholder accounts here would
-- create fake financial records, not close a real gap. If new accounts are
-- needed, they should be entered through the future Accounts/Credit Cards
-- module UI (Module 8/9), not seeded blindly.
--
-- The one legitimate seed action for this table — populating
-- current_balance/credit_limit, which are NULL on all 7 rows — is
-- explicitly NOT done here either, because guessing at real account
-- balances would be fabricating financial data, which is worse than
-- leaving them null. That population must come from either a manual entry
-- pass or Workflow B/D actually writing statement-derived balances (see
-- N8N_DATABASE_MAPPING.md).

-- ============================================================================
-- MERCHANT DEFAULTS
-- ============================================================================
-- No new merchant rows are fabricated here either, for the same reason as
-- Accounts above — merchant_memory's 69 rows come from real transaction
-- history (Workflow C), and inventing plausible-looking merchants (e.g.
-- "SWIGGY", "NETFLIX") that were never actually transacted against would
-- pollute real financial reference data in a single-user app.
--
-- What this section does instead: backfill the new status/has_rules
-- columns for the 69 existing rows. DATABASE_MIGRATIONS.sql already gives
-- both columns table-level DEFAULTs (status='active', has_rules=false), so
-- Postgres populates them automatically for pre-existing rows the moment
-- ALTER TABLE runs — this UPDATE is a defensive no-op included for
-- explicitness and for safety if that migration is ever applied with the
-- DEFAULT clauses stripped out for any reason.
UPDATE public.merchant_memory
SET status = 'active'
WHERE status IS NULL;

UPDATE public.merchant_memory
SET has_rules = false
WHERE has_rules IS NULL;

UPDATE public.merchant_memory
SET aliases = '{}'
WHERE aliases IS NULL;

-- Backfill default_category_id by matching the existing free-text
-- `category` column against the now-complete categories table (the
-- INSERT above ensures every value merchant_memory.category currently
-- holds — including 'Groceries' — now has a matching row).
UPDATE public.merchant_memory mm
SET default_category_id = c.id
FROM public.categories c
WHERE mm.default_category_id IS NULL
  AND mm.category = c.name;

-- ============================================================================
-- APPLICATION SETTINGS
-- ============================================================================
-- Seed a minimal, sensible default configuration set per CLAUDE.md's Module
-- 11 (Settings) contract — Application Settings / AI Thresholds /
-- Integrations. Values are conservative defaults, not guesses at what the
-- user specifically wants; every row is editable through the future
-- Settings module UI.
INSERT INTO public.application_settings (category, key, value, description, is_sensitive)
SELECT v.category, v.key, v.value::jsonb, v.description, v.is_sensitive
FROM (VALUES
  ('general', 'app_name', '"Finance Command Center"', 'Display name shown in the app shell.', false),
  ('general', 'default_currency', '"INR"', 'Default currency for new accounts/transactions.', false),
  ('general', 'timezone', '"Asia/Kolkata"', 'Timezone used for date bucketing in Analytics/Dashboard.', false),
  ('ai', 'categorization_confidence_threshold', '0.7', 'Below this confidence, a transaction is routed to the review queue rather than auto-accepted.', false),
  ('ai', 'merchant_memory_auto_learn', 'true', 'Whether Workflow C is allowed to write new merchant_memory rows without manual approval.', false),
  ('integrations', 'workflow_a_active', 'true', 'Operational flag: whether Workflow A (transaction email processing) is currently enabled. Informational only — does not control n8n itself.', false),
  ('integrations', 'workflow_b_active', 'true', 'Operational flag: whether Workflow B/D (statement processing) is currently enabled. Informational only — does not control n8n itself.', false),
  ('accounts', 'low_balance_threshold', '1000', 'Rupee threshold below which a bank account is flagged low_balance by vw_account_health.', false),
  ('accounts', 'high_utilization_threshold_percent', '70', 'Utilization percent above which a credit card is flagged high_utilization by vw_account_health.', false)
) AS v(category, key, value, description, is_sensitive)
WHERE NOT EXISTS (
  SELECT 1 FROM public.application_settings s
  WHERE s.category = v.category AND s.key = v.key
);

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (read-only — run after seeding to confirm results;
-- not part of the transaction above)
-- ============================================================================
-- SELECT name, status, color FROM public.categories ORDER BY name;
-- SELECT client_name, client_type FROM public.clients ORDER BY client_name;
-- SELECT status, has_rules, count(*) FROM public.merchant_memory GROUP BY 1, 2;
-- SELECT category, key, value FROM public.application_settings ORDER BY category, key;
-- SELECT count(*) FILTER (WHERE default_category_id IS NOT NULL) AS resolved,
--        count(*) FILTER (WHERE default_category_id IS NULL) AS unresolved
-- FROM public.merchant_memory;
