-- ============================================================================
-- DATABASE_MIGRATIONS.sql
-- Finance Command Center — Database Foundation phase (pre-Module 12A)
--
-- STATUS: NOT EXECUTED. Generated for review only, per explicit instruction.
-- Do not run this against the live project (cnxfrlirhycbqnwfxvpm) without
-- approval — see DATABASE_EXECUTION_PLAN.md for the approval gate and the
-- exact order these phases should run in.
--
-- Design rules followed throughout this file:
--   1. Every existing table is extended with ALTER TABLE — none are dropped
--      or recreated.
--   2. Every statement is idempotent (safe to run twice): ADD COLUMN IF NOT
--      EXISTS, CREATE TABLE IF NOT EXISTS, CREATE OR REPLACE VIEW, and
--      DO-block guards around constraints (Postgres has no native
--      "ADD CONSTRAINT IF NOT EXISTS" for CHECK constraints).
--   3. No column is dropped, renamed, or retyped. No row is deleted.
--   4. Every new column is nullable with no default write requirement, so
--      existing rows remain valid without a backfill pass blocking this
--      migration (backfill strategy is documented per phase and left to
--      DATABASE_SEED.sql / a follow-up data pass, not bundled in here).
--   5. Comments cite the finding in SUPABASE_AUDIT.md / SUPABASE_MAPPING.md
--      / MIGRATION_PLAN.md that motivates each change.
--
-- Grounding: current schema as of 2026-08-07 per SUPABASE_AUDIT.md /
-- DATABASE_SCHEMA.md (PostgREST introspection). Row counts at that time:
-- transactions=14, statement_transactions=100, merchant_memory=69,
-- accounts=7, categories=9, clients=3, statements=0, banks=0,
-- email_sources=0, processed_messages=0.
-- ============================================================================

BEGIN;

-- ============================================================================
-- PHASE 1 — Transaction linkage
-- Ref: MIGRATION_PLAN.md Phase 1, SUPABASE_MAPPING.md "Transaction" section.
-- Unblocks: Modules 2 (Dashboard), 3 (Transactions), 8 (Accounts), 9 (Credit
-- Cards) — every one of them reads `transactions` joined through these FKs.
-- ============================================================================

-- 1.1 — merchant_id / category_id: transactions.merchant / .category are
-- currently free text with no FK. Live data already contains category
-- values ('Investment', 'Business', 'Uncategorized') that don't exist in
-- `categories` — see N8N_DATABASE_MAPPING.md for why (the Gemini AI
-- Categorize node's enum has 19 values, `categories` only has 9). Adding
-- these FK columns does NOT retype or remove the existing free-text
-- `merchant`/`category` columns — both stay, so nothing currently reading
-- them breaks. Backfill (matching free text to the FK) is a data task,
-- not run here — see "Backfill Strategy" below.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS merchant_id uuid REFERENCES public.merchant_memory(id),
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);

COMMENT ON COLUMN public.transactions.merchant_id IS
  'FK to merchant_memory.id. Added in Database Foundation phase (pre-Module 12A). Nullable and unbackfilled on existing rows — see DATABASE_MIGRATIONS.sql backfill strategy. The free-text `merchant` column is preserved unchanged.';
COMMENT ON COLUMN public.transactions.category_id IS
  'FK to categories.id. Added in Database Foundation phase (pre-Module 12A). Nullable and unbackfilled on existing rows. The free-text `category` column is preserved unchanged; some existing values (e.g. Investment, Business, Uncategorized) had no matching category row until DATABASE_SEED.sql added them.';

-- 1.2 — owner_type: Transaction.ownerType ('business' | 'personal') in the
-- domain model has no backing column today. `monthly_summaries` confirms
-- this is unpopulated (total_personal=0, total_business=0 on every row).
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS owner_type text
    CHECK (owner_type IS NULL OR owner_type IN ('personal', 'business'));

COMMENT ON COLUMN public.transactions.owner_type IS
  'Personal vs. business split, matching domain OwnerType. Added pre-Module 12A. Nullable — neither Workflow C nor Workflow D populates this today (see N8N_DATABASE_MAPPING.md); left null until the workflow or a manual pass sets it.';

-- 1.3 — duplicate_of_id: the domain model's `duplicateOfId` needs to name
-- *which* transaction is duplicated, not just flag `is_duplicate`. Kept
-- alongside the existing `is_duplicate` boolean rather than replacing it.
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid REFERENCES public.transactions(id);

COMMENT ON COLUMN public.transactions.duplicate_of_id IS
  'Self-referencing FK naming the transaction this row duplicates. Added pre-Module 12A alongside the existing is_duplicate boolean (not a replacement). Needed for vw_transactions_duplicates.';

-- 1.4 — status/type/review_status reconciliation: per MIGRATION_PLAN.md
-- Phase 1.5, this turned out to be a documentation question, not a schema
-- change — no column is added, renamed, or dropped. Documenting the
-- observed real-world semantics inline so the repository mapping layer
-- (see REPOSITORY_IMPLEMENTATION_PLAN.md) has one place to read them from.
COMMENT ON COLUMN public.transactions.status IS
  'Workflow-set processing status. Observed live values: auto, needs_review (NOT the same vocabulary as the frontend TransactionStatus enum — reviewed|uncategorized|duplicate|flagged|verified|pending_review. Needs an explicit value-mapping table in the Supabase repository, not a schema change.) Column default pending_review is inherited from the original table definition and is itself one more inconsistent value.';
COMMENT ON COLUMN public.transactions.type IS
  'Despite the name, this is NOT a debit/credit flag (compare `transaction_type` and `payment_mode` for that) — every observed live row has type=uncategorized, suggesting this is a categorization-status leftover. Do not treat as the domain TransactionType. Left as-is; a future migration may rename this once its intended purpose is confirmed with whoever owns Workflow A/C, which is out of scope for this read-only-schema pass.';
COMMENT ON COLUMN public.transactions.review_status IS
  'A third status-like column (default ''Auto Reviewed''), whose relationship to `status` and `type` is undocumented upstream. Not modified here — flagged for the same follow-up as `type`.';

-- ============================================================================
-- PHASE 2 — Master data completeness
-- Ref: MIGRATION_PLAN.md Phase 2, SUPABASE_MAPPING.md Category/Merchant/
-- Client sections. Unblocks: Modules 5 (Categories), 6 (Merchants), 7
-- (Clients) — all three are already built against mocks with this fuller
-- shape and are waiting on it.
-- ============================================================================

-- 2.1 — categories: CategoryRecord needs description/parentCategory/status/
-- color/icon; only id/name/created_at exist today.
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS parent_category_id uuid REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

COMMENT ON COLUMN public.categories.parent_category_id IS
  'Self-referencing FK for CategoryRecord.parentCategory. One level deep in the domain model (a Category, not a recursive CategoryRecord) — no CHECK against depth is enforced here; the frontend is responsible for not building deeper hierarchies than it renders.';
COMMENT ON COLUMN public.categories.status IS
  'Defaults to active so every pre-existing row (all 9 seeded categories) is valid without a backfill pass.';

-- 2.2 — merchant_memory: MerchantRecord needs aliases/defaultCategory/
-- status/notes/hasRules. Note on `aliases`: live data currently stores one
-- row per alias (e.g. DECATHLON SPORTS / DECATHLON SPORTS ON both roll up
-- to display_name DECATHLON) rather than one row with an array of aliases.
-- This migration adds the array column per the domain model's shape, but
-- does NOT consolidate the existing one-row-per-alias rows into it — that
-- is a data-modeling decision (see DATABASE_SEED.sql / N8N_DATABASE_MAPPING.md)
-- that affects how Workflow C writes going forward, which this read-only
-- schema pass does not decide unilaterally.
ALTER TABLE public.merchant_memory
  ADD COLUMN IF NOT EXISTS aliases text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_category_id uuid REFERENCES public.categories(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'
    CHECK (status IN ('active', 'inactive')),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS has_rules boolean DEFAULT false;

COMMENT ON COLUMN public.merchant_memory.aliases IS
  'MerchantRecord.aliases. Defaults to empty array so existing 69 rows remain valid. Existing one-row-per-alias data is NOT auto-consolidated into this column by this migration — see N8N_DATABASE_MAPPING.md for the recommended Workflow C change to populate it going forward.';
COMMENT ON COLUMN public.merchant_memory.has_rules IS
  'MerchantRecord.hasRules. Defaults to false; distinct from the existing `confidence` column, which measures AI categorization confidence, not whether a manual rule exists.';

-- 2.3 — clients: ClientRecord.clientType has no backing column; seeded
-- values (Personal/Business/Internal) currently live only in client_name.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_type text
    CHECK (client_type IS NULL OR client_type IN
      ('personal', 'family_member', 'company', 'business_unit', 'trust'));

COMMENT ON COLUMN public.clients.client_type IS
  'ClientRecord.clientType. Nullable — DATABASE_SEED.sql backfills the 3 existing seeded clients (Personal/Business/Internal) to a best-guess mapping; new clients created after Module 7 goes live should always set this at create time.';

-- 2.4 — client_id on accounts/statements: ClientRecord.linkedAccountsCount /
-- .linkedCreditCardsCount and Statement.client both need this and have
-- nothing to read from today (only transactions.client_id exists, and it's
-- null on every live row per SUPABASE_AUDIT.md).
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

COMMENT ON COLUMN public.accounts.client_id IS
  'FK to clients.id, enabling ClientRecord.linkedAccountsCount / .linkedCreditCardsCount. Nullable — accounts not tied to a specific client (the common case for a single-user app) stay null, matching BankAccountRecord.clientId / CreditCardRecord.clientId being nullable in the domain model.';
COMMENT ON COLUMN public.statements.client_id IS
  'FK to clients.id, for Statement.client. Nullable, same reasoning as accounts.client_id.';

-- ============================================================================
-- PHASE 3 — Accounts data integrity
-- Ref: MIGRATION_PLAN.md Phase 3, SUPABASE_MAPPING.md "BankAccountRecord /
-- CreditCardRecord" section. Unblocks: Modules 8 (Accounts), 9 (Credit
-- Cards) — same physical `accounts` table backs both.
-- ============================================================================

-- 3.1 — CHECK constraint on account_type. No constraint exists today;
-- observed live values are exactly 'Savings', 'Current', 'Credit Card'.
-- Wrapped in a DO block because Postgres has no native
-- "ADD CONSTRAINT IF NOT EXISTS" for CHECK constraints.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'accounts_account_type_check'
      AND conrelid = 'public.accounts'::regclass
  ) THEN
    ALTER TABLE public.accounts
      ADD CONSTRAINT accounts_account_type_check
      CHECK (account_type IN ('Savings', 'Current', 'Overdraft', 'Credit Card'));
  END IF;
END $$;

-- Note: 'Overdraft' is included even though no live row uses it yet,
-- because BankAccountType in the domain model includes 'overdraft' as a
-- valid BankAccountRecord.accountType — omitting it here would make the
-- constraint reject a value the frontend is already prepared to send.

-- 3.2 — precedence for the three overlapping "last4" columns and two
-- overlapping status columns is a mapping-layer decision, not a schema
-- change (adding a fourth column would make the overlap worse, not
-- better). Documented at the column level so it's discoverable from psql/
-- Supabase Studio, not just from REPOSITORY_IMPLEMENTATION_PLAN.md.
COMMENT ON COLUMN public.accounts.account_number_last4 IS
  'One of three overlapping last4 columns on this table (see also card_last4, account_last4). Precedence rule for the Supabase repository mapping layer: account_number_last4 > card_last4 > account_last4 (first non-null wins) — see REPOSITORY_IMPLEMENTATION_PLAN.md.';
COMMENT ON COLUMN public.accounts.account_status IS
  'Overlaps with the boolean `is_active` column. Precedence rule: account_status (text) is authoritative when non-null; is_active is a legacy boolean kept for backward compatibility with any existing query using it directly — see REPOSITORY_IMPLEMENTATION_PLAN.md.';

-- ============================================================================
-- PHASE 4 — New tables
-- Ref: MIGRATION_PLAN.md Phase 4. CLAUDE.md Part 3 explicitly allows these
-- three under "NEW TABLES". Unblocks: Module 11 (Settings) entirely
-- (application_settings), and the Audit History feature already promised
-- in Modules 3/6 (audit_logs).
-- ============================================================================

-- 4.1 — application_settings: key/value store, one row per setting.
-- CLAUDE.md Part 3 lists vw_settings_general / vw_settings_ai / etc. as
-- required views over this concept; a flat key/value table lets each of
-- those views filter by a `category` prefix without needing a rigid
-- per-setting-type table for every Settings sub-page.
CREATE TABLE IF NOT EXISTS public.application_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  is_sensitive boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, key)
);

COMMENT ON TABLE public.application_settings IS
  'Flat key/value application configuration, added pre-Module 12A per CLAUDE.md Part 3 "NEW TABLES". `category` groups settings for the vw_settings_* views (general/accounts/categories/merchants/ai/integrations). `is_sensitive` marks rows that must never be returned by a view exposed to the frontend (CLAUDE.md: "Secrets never displayed") — the Supabase repository/view layer must filter these out at the view level, not trust the frontend to hide them.';

-- 4.2 — audit_logs: generic change-history table for the "Audit History"
-- feature promised in Modules 3 (Transactions) and 6 (Merchants).
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('insert', 'update', 'delete')),
  changed_by text,
  changed_at timestamptz NOT NULL DEFAULT now(),
  old_values jsonb,
  new_values jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record
  ON public.audit_logs (table_name, record_id);

COMMENT ON TABLE public.audit_logs IS
  'Generic change-history log. Populated going forward by the Supabase repository layer (Module 12A) on every user-initiated edit to transactions/merchant_memory/categories/etc — not retroactively backfilled, since no history exists for changes made before this table did. changed_by is left as free text (not a FK to an auth.users row) since this is a single-user application per CLAUDE.md ("There is only one client").';

-- 4.3 — notifications: backs the Dashboard's notification area
-- (PRODUCT_DECISIONS.md lists "Notifications" as a Dashboard section).
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  type text NOT NULL,
  title text NOT NULL,
  message text,
  link text,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications (user_id, is_read);

COMMENT ON TABLE public.notifications IS
  'Backs the Dashboard notification area (PRODUCT_DECISIONS.md). Empty until either Module 11 (Settings) or a follow-up n8n change starts writing to it — this migration only creates the table.';

-- ============================================================================
-- PHASE 5a — Indexes on FK / filter columns
-- Ref: MIGRATION_PLAN.md item "verify indexes exist". SUPABASE_AUDIT.md §5
-- marked this "Not Available via REST" — could not confirm whether these
-- already existed, so these are IF NOT EXISTS and harmless either way.
-- Volume is currently tiny (transactions=14 rows) so CONCURRENTLY is not
-- used; if this runs after real volume has grown, create these with
-- CREATE INDEX CONCURRENTLY outside a transaction block instead.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_client_id ON public.transactions (client_id);
CREATE INDEX IF NOT EXISTS idx_transactions_statement_id ON public.transactions (statement_id);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON public.transactions (merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date ON public.transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_of_id ON public.transactions (duplicate_of_id);

CREATE INDEX IF NOT EXISTS idx_merchant_memory_normalized_merchant
  ON public.merchant_memory (normalized_merchant);
CREATE INDEX IF NOT EXISTS idx_merchant_memory_default_category_id
  ON public.merchant_memory (default_category_id);

CREATE INDEX IF NOT EXISTS idx_statement_transactions_statement_id
  ON public.statement_transactions (statement_id);

CREATE INDEX IF NOT EXISTS idx_statements_account_id ON public.statements (account_id);
CREATE INDEX IF NOT EXISTS idx_statements_client_id ON public.statements (client_id);

CREATE INDEX IF NOT EXISTS idx_accounts_client_id ON public.accounts (client_id);

CREATE INDEX IF NOT EXISTS idx_categories_parent_category_id
  ON public.categories (parent_category_id);

-- ============================================================================
-- PHASE 6 — Cleanup: lock down vw_dashboard_accounts
-- Ref: SUPABASE_AUDIT.md §9 — this view is currently writable (GET, POST,
-- PATCH, DELETE) as a side effect of Postgres auto-updatable simple views.
-- Revoking write grants prevents it becoming an undocumented second write
-- path into `accounts`. This does not drop or redefine the view.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'vw_dashboard_accounts') THEN
    REVOKE INSERT, UPDATE, DELETE ON public.vw_dashboard_accounts FROM anon, authenticated, service_role;
  END IF;
END $$;

-- Note: service_role is included in the REVOKE for consistency of intent
-- (the view should never be a write path, full stop), but service_role
-- typically bypasses grants for RLS purposes depending on project
-- configuration — verify in Supabase Studio after running, per
-- DATABASE_EXECUTION_PLAN.md's verification step.

-- ============================================================================
-- PHASE 7 — Required SQL views
-- Ref: CLAUDE.md Part 3 "REQUIRED SQL VIEWS", STEP 5 of this Database
-- Foundation phase. Views are additive by nature (CREATE OR REPLACE VIEW
-- does not touch table data), so all of these are safe to (re)run.
--
-- Scope note: `vw_dashboard_summary`, `vw_dashboard_accounts`, and
-- `monthly_summaries` already exist in the live project. This migration
-- does NOT touch them — their current query definitions were never
-- inspected (only their output columns, via PostgREST introspection; see
-- SUPABASE_AUDIT.md), so redefining them here would mean guessing at
-- behavior rather than extending it. If they need to change, that should
-- happen as its own reviewed step after their current `pg_get_viewdef`
-- output has actually been read.
--
-- Known limitation carried from SUPABASE_MAPPING.md: no column in
-- `transactions` or `statement_transactions` cleanly says "this row is an
-- inflow (credit) vs. outflow (debit)" — `type` is a categorization-status
-- leftover (see Phase 1.4 comment), `transaction_type` defaults to
-- 'credit_card' (an account-channel label, not debit/credit), and
-- `payment_mode` is overloaded with debit/credit values only on some rows
-- (per N8N_DATABASE_MAPPING.md, Workflow D's `debit_credit` field
-- sometimes lands here). Every view below that needs a debit/credit split
-- uses a best-effort heuristic (case-insensitive match for 'credit'/
-- 'refund'/'cashback' in `transaction_type`/`payment_mode`, else treated
-- as an outflow) and is clearly commented as provisional — this should be
-- replaced once Workflow A/C/D reliably populate `transactions.type`
-- (the domain TransactionType) as recommended in N8N_DATABASE_MAPPING.md.
--
-- Scope reduction: this phase's view set was reviewed against actual
-- repository-interface methods and built frontend components (see
-- VIEW_USAGE_MATRIX.md) and split into three tiers. Only the "Required
-- immediately" and "Required during Module 12A" tiers are in this file (24
-- views). The "Future/Optional" tier (10 views — not consumed by any
-- current repository method or built component) lives in FUTURE_VIEWS.sql
-- instead, per this phase's "minimize the initial migration" instruction.
-- A `-- NOTE:` comment is left at each removed view's original location
-- below, pointing to FUTURE_VIEWS.sql, so the gap isn't silent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Dashboard (Module 2)
-- ---------------------------------------------------------------------------

-- NOTE: vw_dashboard_cashflow is classified Future/Optional (not consumed by
-- any current Dashboard component/service method — see VIEW_USAGE_MATRIX.md)
-- and lives in FUTURE_VIEWS.sql instead. vw_cashflow below (Analytics,
-- Required immediately) has its own independent copy of this query rather
-- than depending on it via SELECT *, so this file has no cross-file
-- dependency on FUTURE_VIEWS.sql ever being applied.

CREATE OR REPLACE VIEW public.vw_dashboard_due_cards AS
SELECT
  a.id AS account_id,
  a.account_name,
  a.institution_name,
  a.card_network,
  COALESCE(a.account_number_last4, a.card_last4, a.account_last4) AS last4,
  a.payment_due_date,
  a.minimum_due,
  a.current_balance,
  a.credit_limit,
  (a.payment_due_date - CURRENT_DATE) AS days_until_due
FROM public.accounts a
WHERE a.account_type = 'Credit Card'
  AND a.payment_due_date IS NOT NULL
  AND a.payment_due_date >= CURRENT_DATE
  AND a.payment_due_date <= CURRENT_DATE + INTERVAL '14 days'
  AND COALESCE(a.is_active, true)
ORDER BY a.payment_due_date ASC;

COMMENT ON VIEW public.vw_dashboard_due_cards IS
  'Credit cards due within 14 days, for the Dashboard "cards due" widget. Returns zero rows today because every live accounts row has payment_due_date populated as NULL (see SUPABASE_AUDIT.md observations) — not a view bug.';

-- ---------------------------------------------------------------------------
-- Transactions (Module 3)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_transactions AS
SELECT
  t.id,
  t.transaction_date,
  t.amount,
  t.currency,
  t.status AS raw_status,
  CASE t.status
    WHEN 'auto' THEN 'reviewed'
    WHEN 'needs_review' THEN 'pending_review'
    WHEN 'pending_review' THEN 'pending_review'
    WHEN 'reviewed' THEN 'reviewed'
    WHEN 'flagged' THEN 'flagged'
    WHEN 'verified' THEN 'verified'
    ELSE 'uncategorized'
  END AS status,
  CASE WHEN t.is_duplicate THEN 'duplicate' ELSE NULL END AS duplicate_flag,
  t.duplicate_of_id,
  t.owner_type,
  t.payment_mode,
  t.notes AS note,
  t.merchant_id,
  COALESCE(mm.display_name, t.merchant) AS merchant_name,
  t.category_id,
  COALESCE(c.name, t.category) AS category_name,
  t.client_id,
  cl.client_name,
  t.account_id,
  a.account_name,
  a.institution_name AS bank_name,
  a.account_type,
  COALESCE(a.account_number_last4, a.card_last4, a.account_last4) AS account_last4,
  CASE WHEN a.account_type = 'Credit Card' THEN 'credit_card' ELSE 'bank' END AS account_kind,
  a.card_network
FROM public.transactions t
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.clients cl ON cl.id = t.client_id
LEFT JOIN public.accounts a ON a.id = t.account_id;

COMMENT ON VIEW public.vw_transactions IS
  'Primary list view backing TransactionRepository.list(). Resolves merchant/category/client/account FKs and normalizes `status` into the domain TransactionStatus vocabulary (see Phase 1.4 comment on transactions.status for the raw values this maps from). merchant_name/category_name fall back to the legacy free-text columns when the FK is unresolved (pre-backfill rows).';

CREATE OR REPLACE VIEW public.vw_transaction_details AS
SELECT
  t.*,
  mm.display_name AS merchant_display_name,
  mm.normalized_merchant,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  cl.client_name,
  cl.client_type,
  a.account_name,
  a.institution_name,
  a.account_type,
  a.card_network,
  s.statement_name,
  s.statement_date
FROM public.transactions t
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.clients cl ON cl.id = t.client_id
LEFT JOIN public.accounts a ON a.id = t.account_id
LEFT JOIN public.statements s ON s.id = t.statement_id;

COMMENT ON VIEW public.vw_transaction_details IS
  'Full single-transaction detail row (drawer view) — every FK resolved, plus the raw transactions.* columns for anything not yet modeled.';

CREATE OR REPLACE VIEW public.vw_transaction_search AS
SELECT
  t.id,
  t.transaction_date,
  t.amount,
  COALESCE(mm.display_name, t.merchant) AS merchant_name,
  COALESCE(c.name, t.category) AS category_name,
  cl.client_name,
  a.account_name,
  t.note,
  t.status,
  to_tsvector('simple',
    coalesce(mm.display_name, t.merchant, '') || ' ' ||
    coalesce(c.name, t.category, '') || ' ' ||
    coalesce(cl.client_name, '') || ' ' ||
    coalesce(t.note, '') || ' ' ||
    coalesce(a.account_name, '')
  ) AS search_vector
FROM public.transactions t
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
LEFT JOIN public.categories c ON c.id = t.category_id
LEFT JOIN public.clients cl ON cl.id = t.client_id
LEFT JOIN public.accounts a ON a.id = t.account_id;

COMMENT ON VIEW public.vw_transaction_search IS
  'Search-oriented projection with a precomputed tsvector for full-text search across merchant/category/client/note/account. The repository should filter with `search_vector @@ websearch_to_tsquery(''simple'', :query)` rather than ILIKE scans, per CLAUDE.md''s "Search under 300ms" acceptance criteria.';

-- NOTE: vw_transactions_review and vw_transactions_duplicates are classified
-- Future/Optional — no ReviewPanel/DuplicatePanel component exists in the
-- built Module 3, and both concerns are servable via vw_transactions +
-- TransactionFilters.status today. See FUTURE_VIEWS.sql and
-- VIEW_USAGE_MATRIX.md.

-- ---------------------------------------------------------------------------
-- Accounts (Module 8) / Credit Cards (Module 9) — same underlying table
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_accounts AS
SELECT
  a.*,
  COALESCE(a.account_number_last4, a.card_last4, a.account_last4) AS resolved_last4,
  COALESCE(a.account_status = 'Active', a.is_active, true) AS resolved_is_active,
  cl.client_name,
  CASE WHEN a.account_type = 'Credit Card' THEN 'credit_card' ELSE 'bank' END AS account_kind
FROM public.accounts a
LEFT JOIN public.clients cl ON cl.id = a.client_id;

COMMENT ON VIEW public.vw_accounts IS
  'All accounts (bank + credit card) with the last4/status precedence rules from Phase 3.2 resolved into single columns, and client resolved. BankAccountRepository/CreditCardRepository should filter this by account_kind.';

CREATE OR REPLACE VIEW public.vw_account_summary AS
SELECT
  CASE WHEN a.account_type = 'Credit Card' THEN 'credit_card' ELSE 'bank' END AS account_kind,
  COUNT(*) AS total_accounts,
  SUM(CASE WHEN a.account_type <> 'Credit Card' THEN a.current_balance ELSE 0 END) AS total_current_balance,
  SUM(CASE WHEN a.account_type <> 'Credit Card' THEN a.available_credit ELSE 0 END) AS total_available_balance,
  SUM(CASE WHEN a.account_type = 'Credit Card' THEN a.credit_limit ELSE 0 END) AS total_credit_limit,
  SUM(CASE WHEN a.account_type = 'Credit Card' THEN a.current_balance ELSE 0 END) AS total_outstanding,
  SUM(CASE WHEN a.account_type = 'Credit Card' THEN a.available_credit ELSE 0 END) AS total_available_credit
FROM public.accounts a
GROUP BY 1;

COMMENT ON VIEW public.vw_account_summary IS
  'Aggregate totals backing BankAccountSummary and CreditCardSummary — one row per account_kind. All sums will read as NULL/0 until accounts.current_balance/credit_limit are populated (currently NULL on all 7 live rows per SUPABASE_AUDIT.md).';

CREATE OR REPLACE VIEW public.vw_account_transactions AS
SELECT
  a.id AS account_id,
  t.id AS transaction_id,
  t.transaction_date,
  t.amount,
  COALESCE(mm.display_name, t.merchant) AS merchant_name,
  COALESCE(c.name, t.category) AS category_name,
  t.status
FROM public.accounts a
JOIN public.transactions t ON t.account_id = a.id
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
LEFT JOIN public.categories c ON c.id = t.category_id
ORDER BY t.transaction_date DESC;

COMMENT ON VIEW public.vw_account_transactions IS
  'Per-account transaction list (Account/Credit Card detail page "recent transactions"). Empty for every account today since transactions.account_id is null on all live rows (see backfill strategy).';

-- NOTE: vw_account_trends is classified Future/Optional — no BalanceHistory
-- / trend-chart component exists in the built Module 8, despite being in
-- CLAUDE.md's original component list. See FUTURE_VIEWS.sql.

CREATE OR REPLACE VIEW public.vw_account_health AS
SELECT
  a.id AS account_id,
  CASE WHEN a.account_type = 'Credit Card' THEN 'credit_card' ELSE 'bank' END AS account_kind,
  a.current_balance,
  a.credit_limit,
  CASE
    WHEN a.account_type = 'Credit Card' AND a.credit_limit IS NOT NULL AND a.credit_limit > 0
      THEN ROUND(100.0 * COALESCE(a.current_balance, 0) / a.credit_limit, 1)
    ELSE NULL
  END AS utilization_percent,
  CASE
    WHEN a.account_type = 'Credit Card' AND a.payment_due_date IS NOT NULL
         AND a.payment_due_date <= CURRENT_DATE + INTERVAL '7 days'
      THEN 'due_soon'
    WHEN a.account_type = 'Credit Card' AND a.credit_limit IS NOT NULL AND a.credit_limit > 0
         AND COALESCE(a.current_balance, 0) / a.credit_limit > 0.7
      THEN 'high_utilization'
    WHEN a.account_type <> 'Credit Card' AND a.current_balance IS NOT NULL AND a.current_balance < 1000
      THEN 'low_balance'
    WHEN a.sync_status IS DISTINCT FROM 'Synced' AND a.sync_status IS NOT NULL
      THEN 'sync_required'
    ELSE 'healthy'
  END AS health
FROM public.accounts a;

COMMENT ON VIEW public.vw_account_health IS
  'Computes BankAccountHealth/CreditCardHealth per account. Thresholds (7-day due-soon window, 70% utilization, ₹1000 low-balance) are provisional defaults picked for this migration — confirm against actual product thresholds before Module 12A wires this in; every current row resolves to `healthy` by default since current_balance/credit_limit are null (NULL comparisons short-circuit to the ELSE branch).';

-- NOTE: vw_credit_utilization (the Analytics-scoped, CLAUDE.md Part 3
-- canonical name) is classified Future/Optional — no AnalyticsRepository
-- method currently needs utilization% specifically (getCreditCardSpend is a
-- $-spend series, a different shape). vw_credit_card_utilization below
-- (Required immediately, Module 9) is NOT affected — it's consumed by the
-- real CreditCardTile/CreditCardDrawer components. See FUTURE_VIEWS.sql.

CREATE OR REPLACE VIEW public.vw_credit_card_utilization AS
SELECT
  a.id,
  a.account_name AS card_name,
  a.institution_name AS bank_name,
  a.card_network AS network,
  COALESCE(a.account_number_last4, a.card_last4) AS last4,
  a.credit_limit,
  a.current_balance AS outstanding,
  a.available_credit,
  CASE WHEN a.credit_limit IS NOT NULL AND a.credit_limit > 0
    THEN ROUND(100.0 * COALESCE(a.current_balance, 0) / a.credit_limit, 1)
    ELSE NULL
  END AS utilization_percent,
  a.payment_due_date AS due_date,
  a.minimum_due
FROM public.accounts a
WHERE a.account_type = 'Credit Card';

COMMENT ON VIEW public.vw_credit_card_utilization IS
  'Credit-card-specific utilization shape for CreditCardRecord (Module 9), distinct field names from vw_credit_utilization (Analytics). Same underlying rows.';

-- ---------------------------------------------------------------------------
-- Clients (Module 7)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_client_summary AS
SELECT
  cl.id AS client_id,
  cl.client_name,
  cl.client_type,
  cl.is_active,
  COALESCE(SUM(t.amount), 0) AS total_spend,
  COUNT(t.id) AS transaction_count,
  (SELECT COUNT(*) FROM public.accounts a WHERE a.client_id = cl.id AND a.account_type <> 'Credit Card') AS linked_accounts_count,
  (SELECT COUNT(*) FROM public.accounts a WHERE a.client_id = cl.id AND a.account_type = 'Credit Card') AS linked_credit_cards_count,
  (SELECT COUNT(*) FROM public.statements s WHERE s.client_id = cl.id) AS linked_statements_count,
  MIN(t.transaction_date) AS first_transaction_at,
  MAX(t.transaction_date) AS last_transaction_at
FROM public.clients cl
LEFT JOIN public.transactions t ON t.client_id = cl.id
GROUP BY cl.id, cl.client_name, cl.client_type, cl.is_active;

COMMENT ON VIEW public.vw_client_summary IS
  'Backs ClientRecord''s aggregate fields (totalSpend, transactionCount, linkedAccountsCount, linkedCreditCardsCount, linkedStatementsCount, firstTransactionAt, lastTransactionAt). topCategories/topMerchants are intentionally not included here — see vw_client_top_categories / vw_client_top_merchants below, kept separate since they are one-to-many per client.';

CREATE OR REPLACE VIEW public.vw_client_top_categories AS
SELECT
  t.client_id,
  COALESCE(c.name, t.category) AS category_name,
  SUM(t.amount) AS total_spend,
  ROW_NUMBER() OVER (PARTITION BY t.client_id ORDER BY SUM(t.amount) DESC) AS rank
FROM public.transactions t
LEFT JOIN public.categories c ON c.id = t.category_id
WHERE t.client_id IS NOT NULL
GROUP BY t.client_id, COALESCE(c.name, t.category);

COMMENT ON VIEW public.vw_client_top_categories IS
  'Feeds ClientRecord.topCategories — repository should take rank <= N (e.g. top 5) per client.';

CREATE OR REPLACE VIEW public.vw_client_top_merchants AS
SELECT
  t.client_id,
  COALESCE(mm.display_name, t.merchant) AS merchant_name,
  SUM(t.amount) AS total_spend,
  ROW_NUMBER() OVER (PARTITION BY t.client_id ORDER BY SUM(t.amount) DESC) AS rank
FROM public.transactions t
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
WHERE t.client_id IS NOT NULL
GROUP BY t.client_id, COALESCE(mm.display_name, t.merchant);

COMMENT ON VIEW public.vw_client_top_merchants IS
  'Feeds ClientRecord.topMerchants — repository should take rank <= N (e.g. top 5) per client.';

-- ---------------------------------------------------------------------------
-- Categories (Module 5)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_categories AS
SELECT
  c.*,
  parent.name AS parent_category_name,
  (SELECT COUNT(*) FROM public.transactions t WHERE t.category_id = c.id) AS transaction_count,
  (SELECT COUNT(DISTINCT m.id) FROM public.merchant_memory m WHERE m.default_category_id = c.id) AS merchants_assigned
FROM public.categories c
LEFT JOIN public.categories parent ON parent.id = c.parent_category_id;

COMMENT ON VIEW public.vw_categories IS
  'Backs CategoryRecord including computed transactionCount/merchantsAssigned. Both will read low today since transactions.category_id / merchant_memory.default_category_id are unbackfilled.';

-- ---------------------------------------------------------------------------
-- Merchants (Module 6)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_merchants AS
SELECT
  mm.id,
  mm.display_name,
  mm.normalized_merchant,
  mm.aliases,
  mm.default_category_id,
  c.name AS default_category_name,
  mm.status,
  mm.notes,
  mm.has_rules,
  mm.confidence,
  (SELECT COUNT(*) FROM public.transactions t WHERE t.merchant_id = mm.id) AS transaction_count,
  (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t WHERE t.merchant_id = mm.id) AS total_spend,
  (SELECT MAX(t.transaction_date) FROM public.transactions t WHERE t.merchant_id = mm.id) AS last_transaction_at
FROM public.merchant_memory mm
LEFT JOIN public.categories c ON c.id = mm.default_category_id;

COMMENT ON VIEW public.vw_merchants IS
  'Backs MerchantRecord list. transaction_count/total_spend will read 0 for every merchant today since transactions.merchant_id is unbackfilled (matches vw_categories'' equivalent caveat).';

-- NOTE: vw_merchant_details is classified Future/Optional — MerchantRepository
-- has no getById()/detail method today (only list/getSummary/create/update/
-- delete), so there is no current consumer for a detail-specific view. See
-- FUTURE_VIEWS.sql.

CREATE OR REPLACE VIEW public.vw_merchant_transactions AS
SELECT
  mm.id AS merchant_id,
  t.id AS transaction_id,
  t.transaction_date,
  t.amount,
  COALESCE(c.name, t.category) AS category_name,
  t.account_id,
  t.status
FROM public.merchant_memory mm
JOIN public.transactions t ON t.merchant_id = mm.id
LEFT JOIN public.categories c ON c.id = t.category_id
ORDER BY t.transaction_date DESC;

COMMENT ON VIEW public.vw_merchant_transactions IS
  'Per-merchant transaction history (merchant detail page). Empty until transactions.merchant_id is backfilled.';

-- NOTE: vw_merchant_analytics is classified Future/Optional — no confirmed
-- trend-chart component inside MerchantReviewDrawer today. See
-- FUTURE_VIEWS.sql.

-- ---------------------------------------------------------------------------
-- Statements (Module 4)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_statements AS
SELECT
  s.*,
  a.account_name,
  a.institution_name,
  a.card_network,
  cl.client_name,
  (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS transactions_extracted
FROM public.statements s
LEFT JOIN public.accounts a ON a.id = s.account_id
LEFT JOIN public.clients cl ON cl.id = s.client_id;

COMMENT ON VIEW public.vw_statements IS
  'Statement list with account/client resolved and a live count of linked statement_transactions. Zero rows today (statements table is empty) — see N8N_DATABASE_MAPPING.md for why (no workflow node inserts into `statements`).';

CREATE OR REPLACE VIEW public.vw_statement_summary AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE processing_status = 'Processed') AS processed,
  COUNT(*) FILTER (WHERE processing_status = 'Processing') AS processing,
  COUNT(*) FILTER (WHERE processing_status = 'Failed') AS failed,
  COUNT(*) FILTER (WHERE processing_status = 'Pending Review') AS pending_review
FROM public.statements;

COMMENT ON VIEW public.vw_statement_summary IS
  'StatementSummary counts. processing_status value matching ("Processed"/"Processing"/"Failed"/"Pending Review") is a best guess pending real data to confirm against — statements table is currently empty.';

CREATE OR REPLACE VIEW public.vw_statement_transactions AS
SELECT
  st.*,
  s.statement_name,
  s.account_id
FROM public.statement_transactions st
LEFT JOIN public.statements s ON s.id = st.statement_id;

COMMENT ON VIEW public.vw_statement_transactions IS
  'statement_transactions joined to its parent statement. Will show statement_name=NULL for all 100 existing rows until statement_id is populated (see N8N_DATABASE_MAPPING.md — statement_id currently gets a non-UUID synthetic string that cannot match any real statements.id).';

-- NOTE: vw_statement_processing, vw_statement_reconciliation, and
-- vw_statement_metrics are classified Future/Optional — no ReconciliationCard
-- / MetricsCard / processing-timeline component exists in the built Module 4
-- (StatementStatusBadge reads statements.processing_status directly and
-- needs no aggregate view). See FUTURE_VIEWS.sql.

-- ---------------------------------------------------------------------------
-- Analytics (Module 10)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.vw_monthly_spend AS
SELECT
  date_trunc('month', t.transaction_date)::date AS month,
  t.owner_type,
  SUM(t.amount) AS total_spend,
  COUNT(*) AS transaction_count
FROM public.transactions t
WHERE t.transaction_date IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC;

COMMENT ON VIEW public.vw_monthly_spend IS
  'Replaces/complements the existing non-vw_-prefixed `monthly_summaries` view per CLAUDE.md''s vw_<module>_<name> naming convention. Grouped by owner_type in addition to month — will show owner_type=NULL for every current row until that column is populated.';

CREATE OR REPLACE VIEW public.vw_cashflow AS
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

COMMENT ON VIEW public.vw_cashflow IS
  'Analytics-module cash flow (Required immediately — backs AnalyticsRepository.getSummary().netCashFlow). Same query shape as the Future/Optional vw_dashboard_cashflow in FUTURE_VIEWS.sql, duplicated here deliberately so this file has no dependency on that one — see VIEW_USAGE_MATRIX.md for why the two are classified differently despite sharing a query. Debit/credit split is a provisional heuristic — see Phase 7 header comment.';

CREATE OR REPLACE VIEW public.vw_category_spend AS
SELECT
  t.category_id,
  COALESCE(c.name, t.category) AS category_name,
  date_trunc('month', t.transaction_date)::date AS month,
  SUM(t.amount) AS total_spend,
  COUNT(*) AS transaction_count
FROM public.transactions t
LEFT JOIN public.categories c ON c.id = t.category_id
WHERE t.transaction_date IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY 3 DESC, 4 DESC;

COMMENT ON VIEW public.vw_category_spend IS
  'Monthly category breakdown for AnalyticsCategorySlice. Falls back to the free-text `category` column when category_id is unresolved so this view is useful even pre-backfill.';

CREATE OR REPLACE VIEW public.vw_merchant_spend AS
SELECT
  t.merchant_id,
  COALESCE(mm.display_name, t.merchant) AS merchant_name,
  SUM(t.amount) AS total_spend,
  COUNT(*) AS transaction_count
FROM public.transactions t
LEFT JOIN public.merchant_memory mm ON mm.id = t.merchant_id
GROUP BY 1, 2
ORDER BY 3 DESC;

COMMENT ON VIEW public.vw_merchant_spend IS
  'Ranked merchant spend for AnalyticsRankedRow (top merchants). Falls back to free-text merchant when merchant_id is unresolved.';

CREATE OR REPLACE VIEW public.vw_account_analytics AS
SELECT
  t.account_id,
  a.account_name,
  CASE WHEN a.account_type = 'Credit Card' THEN 'credit_card' ELSE 'bank' END AS account_kind,
  date_trunc('month', t.transaction_date)::date AS month,
  SUM(t.amount) AS total_spend,
  COUNT(*) AS transaction_count
FROM public.transactions t
JOIN public.accounts a ON a.id = t.account_id
GROUP BY 1, 2, 3, 4
ORDER BY 4 DESC;

COMMENT ON VIEW public.vw_account_analytics IS
  'Monthly per-account activity for AnalyticsSummary.mostUsedCard/.mostUsedAccount and AnalyticsAccountActivityResult. Empty until transactions.account_id is backfilled.';

CREATE OR REPLACE VIEW public.vw_transaction_trends AS
SELECT
  date_trunc('day', t.transaction_date)::date AS day,
  COUNT(*) AS transaction_count,
  SUM(t.amount) AS total_amount,
  AVG(t.amount) AS average_amount
FROM public.transactions t
WHERE t.transaction_date IS NOT NULL
GROUP BY 1
ORDER BY 1 DESC;

COMMENT ON VIEW public.vw_transaction_trends IS
  'Daily transaction volume/amount trend, the finest-grained bucket AnalyticsGranularity supports (day|week|month|quarter|year) — repository re-buckets from daily using date_trunc at query time rather than needing a separate view per granularity.';

COMMIT;

-- ============================================================================
-- BACKFILL STRATEGY (not executed by this file — run as a separate,
-- reviewed step after this migration is applied and verified; see
-- DATABASE_EXECUTION_PLAN.md)
-- ============================================================================
--
-- 1. transactions.category_id: for each distinct transactions.category
--    value, resolve to categories.id by exact name match (case-sensitive).
--    Values with no match (pre-seed: Investment, Business, Uncategorized —
--    resolved by DATABASE_SEED.sql adding those category rows) are the
--    only ones expected to fail; anything else failing to match should be
--    investigated before backfilling, not silently left null.
--
--      UPDATE public.transactions t
--      SET category_id = c.id
--      FROM public.categories c
--      WHERE t.category_id IS NULL
--        AND t.category = c.name;
--
-- 2. transactions.merchant_id: resolve by matching transactions.merchant
--    against merchant_memory.display_name first, falling back to
--    normalized_merchant. Free text is not guaranteed to match exactly
--    (case/formatting drift observed) — a fuzzy pass may be needed for
--    stragglers; do not force-match with LIKE/similarity without manual
--    review, since a wrong merchant_id is worse than a null one.
--
--      UPDATE public.transactions t
--      SET merchant_id = m.id
--      FROM public.merchant_memory m
--      WHERE t.merchant_id IS NULL
--        AND t.merchant = m.display_name;
--
-- 3. transactions.account_id / client_id / statement_id: per
--    SUPABASE_AUDIT.md, these are null on every live row today because
--    neither Workflow C nor Workflow D writes them (confirmed in
--    N8N_DATABASE_MAPPING.md, not just inferred). Backfilling existing
--    rows requires matching on bank_name + card_last4/account_last4
--    against `accounts` — this is a one-time reconciliation script, not a
--    blind UPDATE, because the match is inherently fuzzy (e.g. bank_name
--    text formatting may not match accounts.institution_name exactly).
--    Recommend running this as a reviewed SELECT first to spot-check
--    matches before any UPDATE:
--
--      SELECT t.id, t.bank_name, t.card_last4, t.account_last4,
--             a.id AS candidate_account_id, a.institution_name, a.account_number_last4
--      FROM public.transactions t
--      JOIN public.accounts a
--        ON a.institution_name ILIKE '%' || t.bank_name || '%'
--       AND (a.account_number_last4 = t.card_last4 OR a.account_number_last4 = t.account_last4)
--      WHERE t.account_id IS NULL;
--
--    Going forward (new rows), this is a Workflow A/C change (Module 12B
--    territory, out of scope here) — see N8N_DATABASE_MAPPING.md.
--
-- 4. categories.status / merchant_memory.status / .has_rules: both default
--    to sensible values (active / active / false) at the column level, so
--    no backfill UPDATE is required — every pre-existing row is already
--    valid the moment the migration runs.
--
-- 5. clients.client_type: DATABASE_SEED.sql backfills the 3 existing rows
--    (Personal -> personal, Business -> company, Internal -> business_unit)
--    as a best-guess mapping — review before relying on it; "Internal"
--    in particular is ambiguous between business_unit and trust.

-- ============================================================================
-- ROLLBACK STRATEGY
-- ============================================================================
--
-- Every change in this file is additive (new columns, new tables, new
-- indexes, one REVOKE) — nothing here can lose data, so rollback is a
-- matter of removing what was added, not restoring anything.
--
-- Phase 6 rollback (restore vw_dashboard_accounts writability, only if a
-- workflow turns out to depend on writing through it — verify first):
--   GRANT INSERT, UPDATE, DELETE ON public.vw_dashboard_accounts TO anon, authenticated, service_role;
--
-- Phase 5a rollback (drop the indexes added by this migration):
--   DROP INDEX IF EXISTS idx_transactions_account_id;
--   DROP INDEX IF EXISTS idx_transactions_client_id;
--   DROP INDEX IF EXISTS idx_transactions_statement_id;
--   DROP INDEX IF EXISTS idx_transactions_merchant_id;
--   DROP INDEX IF EXISTS idx_transactions_category_id;
--   DROP INDEX IF EXISTS idx_transactions_transaction_date;
--   DROP INDEX IF EXISTS idx_transactions_duplicate_of_id;
--   DROP INDEX IF EXISTS idx_merchant_memory_normalized_merchant;
--   DROP INDEX IF EXISTS idx_merchant_memory_default_category_id;
--   DROP INDEX IF EXISTS idx_statement_transactions_statement_id;
--   DROP INDEX IF EXISTS idx_statements_account_id;
--   DROP INDEX IF EXISTS idx_statements_client_id;
--   DROP INDEX IF EXISTS idx_accounts_client_id;
--   DROP INDEX IF EXISTS idx_categories_parent_category_id;
--
-- Phase 4 rollback (only safe if no data has been written to these tables
-- yet — check row counts first; if any row exists, treat this as data
-- loss and do NOT drop without a separate decision):
--   DROP TABLE IF EXISTS public.notifications;
--   DROP TABLE IF EXISTS public.audit_logs;
--   DROP TABLE IF EXISTS public.application_settings;
--
-- Phase 3 rollback:
--   ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_account_type_check;
--
-- Phase 2 rollback (only safe if the new columns are still all-null —
-- check before dropping, since a column drop IS destructive if anything
-- has been written to it):
--   ALTER TABLE public.clients DROP COLUMN IF EXISTS client_type;
--   ALTER TABLE public.accounts DROP COLUMN IF EXISTS client_id;
--   ALTER TABLE public.statements DROP COLUMN IF EXISTS client_id;
--   ALTER TABLE public.merchant_memory DROP COLUMN IF EXISTS aliases;
--   ALTER TABLE public.merchant_memory DROP COLUMN IF EXISTS default_category_id;
--   ALTER TABLE public.merchant_memory DROP COLUMN IF EXISTS status;
--   ALTER TABLE public.merchant_memory DROP COLUMN IF EXISTS notes;
--   ALTER TABLE public.merchant_memory DROP COLUMN IF EXISTS has_rules;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS description;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS parent_category_id;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS status;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS color;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS icon;
--   ALTER TABLE public.categories DROP COLUMN IF EXISTS updated_at;
--
-- Phase 1 rollback (same caveat — only safe while still all-null):
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS merchant_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS category_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS owner_type;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS duplicate_of_id;
--
-- General rule: once DATABASE_SEED.sql or any backfill UPDATE has run
-- against a column added here, rolling that column back becomes a
-- destructive action (real data would be lost) and requires explicit
-- sign-off, not a mechanical reversal of this file.

-- ============================================================================
-- EXECUTION ORDER (see DATABASE_EXECUTION_PLAN.md for the full gate)
-- ============================================================================
-- 1. Phase 0 verification (RLS / trigger / index confirmation) — NOT SQL,
--    done via Supabase Studio / direct DB access before anything below runs.
-- 2. This file (Phases 1 -> 6), in a single transaction, in the order
--    written above (each phase depends on tables/columns from the phase
--    before it — e.g. Phase 2.4's accounts.client_id needs clients to
--    already exist, which it does; Phase 5a's indexes need Phase 1-4's
--    columns/tables to exist first).
-- 3. Backfill strategy steps (separate, reviewed, run manually — not part
--    of the transaction above).
-- 4. DATABASE_SEED.sql (idempotent, safe to run any time after this file).
-- 5. The SQL views in DATABASE VIEWS section of this Database Foundation
--    phase — see the views generated alongside this file in the same
--    review batch (CREATE OR REPLACE VIEW statements, additive only).
