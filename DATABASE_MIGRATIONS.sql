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
--      DATABASE_SEED.sql / a follow-up data pass, not bundled in here) —
--      with one deliberate, approved exception: Phase 2.6's user_id columns
--      on accounts/clients/statements are backfilled and set NOT NULL
--      within this same migration, because that backfill is deterministic
--      (single known owner, not fuzzy matching) rather than the kind of
--      judgment call the other backfills require. See Phase 2.6.
--   5. Comments cite the finding in SUPABASE_AUDIT.md / SUPABASE_MAPPING.md
--      / MIGRATION_PLAN.md that motivates each change.
--
-- Grounding: current schema as of 2026-08-07 per SUPABASE_AUDIT.md /
-- DATABASE_SCHEMA.md (PostgREST introspection). Row counts at that time:
-- transactions=14, statement_transactions=100, merchant_memory=69,
-- accounts=7, categories=9, clients=3, statements=0, banks=0,
-- email_sources=0, processed_messages=0.
--
-- REVISED 2026-08-18 following PHASE0_VERIFICATION.md — the first direct
-- (non-REST) inspection of the live database, which surfaced several
-- corrections applied throughout this file. Full rationale for every change
-- is in MIGRATION_CHANGELOG.md; the short version:
--   - No `owner_type` column is added. `monthly_summaries`'s live definition
--     proves `transactions.type` already carries personal/business/
--     uncategorized — see Phase 1.2.
--   - 5 planned indexes were dropped from Phase 5a — equivalent indexes
--     already exist under different names.
--   - Phase 3.1's account_type CHECK constraint attempt was removed — an
--     equivalent constraint already exists live, using 'OD' (not
--     'Overdraft'). Not touched; documented instead.
--   - A new updated_at auto-maintenance phase was added (trigger function +
--     triggers) — Phase 0 found zero triggers exist anywhere, so every
--     updated_at column, including new ones this file adds, was silently
--     insert-only.
--   - RLS policy work was originally kept out of this file — see
--     RLS_POLICY_PLAN.md for the full per-table plan and reasoning.
--
-- REVISED AGAIN 2026-08-18 — ownership architecture approved. Adds Phase
-- 2.6 (user_id on accounts/clients/statements, verified against the one
-- real auth.users row rather than invented — see Phase 2.6's own header)
-- and Phase 8 (RLS policies — now bundled into this file per explicit
-- approval, no longer tracked only in RLS_POLICY_PLAN.md). See
-- MIGRATION_CHANGELOG.md for full detail.
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

-- 1.2 — owner_type: RESOLVED WITHOUT A SCHEMA CHANGE (Decision 1,
-- PHASE0_VERIFICATION.md §2). A prior draft of this migration added a new
-- `transactions.owner_type` column here. Phase 0's direct-connection read
-- of `monthly_summaries`'s actual view definition proved that was wrong —
-- the live view already computes total_personal/total_business/
-- total_uncategorized from the EXISTING `transactions.type` column:
--
--   COALESCE(sum(CASE WHEN type = 'personal' THEN amount END), 0) AS total_personal,
--   COALESCE(sum(CASE WHEN type = 'business' THEN amount END), 0) AS total_business,
--   COALESCE(sum(CASE WHEN type = 'uncategorized' THEN amount END), 0) AS total_uncategorized
--
-- `type` was already designed to hold the domain OwnerType concept — every
-- live row reading 'uncategorized' reflects that Workflow C Parser's insert
-- nodes never write anything else to it (confirmed in
-- N8N_DATABASE_MAPPING.md), not that the column is the wrong one. Adding a
-- second, parallel `owner_type` column would have created a fourth
-- overlapping status-like column instead of fixing anything.
--
-- No column is added, renamed, or backfilled here. The mapping the
-- Supabase repository layer must apply at the domain boundary (not in SQL):
--   transactions.type = 'personal'      -> OwnerType 'personal'
--   transactions.type = 'business'      -> OwnerType 'business'
--   transactions.type = 'uncategorized' -> unresolved / null
-- See REPOSITORY_IMPLEMENTATION_PLAN.md's TransactionRepository section.

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
  'This is the domain OwnerType storage column (personal | business | uncategorized) — confirmed by monthly_summaries''s live definition, which already sums amounts per value of this column (see Phase 1.2). It is NOT a debit/credit flag (compare `transaction_type` and `payment_mode` for that). Every observed live row currently reads ''uncategorized'' because Workflow C Parser never writes anything else here (see N8N_DATABASE_MAPPING.md) — that is an ingestion gap, not evidence the column is unused. Do not rename or duplicate this column; map it to/from the domain OwnerType at the repository boundary instead.';
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

-- 2.6 — Ownership model (user_id): approved 2026-08-18 (RLS_POLICY_PLAN.md
-- Option 1, explicitly approved). `accounts`, `clients`, and `statements`
-- had RLS enabled with zero policies and no column identifying which
-- authenticated Supabase user owns a row — deny-by-default for any
-- non-service_role key. Adds user_id uuid REFERENCES auth.users(id),
-- mirroring the FK pattern already live on transactions/categories/banks/
-- email_sources (ON DELETE CASCADE, matched here for consistency).
--
-- IMPORTANT — user_id is NOT client_id. Do not conflate the two:
--   user_id   = the authenticated application/tenant owner (Supabase Auth).
--               Verified via direct connection before this migration was
--               written: auth.users has exactly ONE row today (this app is
--               genuinely single-tenant), id
--               2f324f4d-1dc3-4ec5-8c23-93da480842c7, and that same id is
--               already referenced by 100% of every existing user_id-
--               populated row (transactions, merchant_memory,
--               statement_transactions) — not invented or guessed here,
--               confirmed against live data.
--   client_id = the business-level client/stakeholder (Personal/Business/
--               Internal — see the `clients` table) a financial instrument
--               is associated with. Multiple clients can exist under the
--               one user_id above. `account_owner`, `account_holder_name`,
--               and `client_name` are free-text labels and are
--               deliberately NOT used for RLS — see RLS_POLICY_PLAN.md for
--               why a real identity column was required instead.
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Backfill: deterministic, not fuzzy — unlike the transactions.account_id
-- backfill strategy (which needs fuzzy bank-name matching and is
-- deliberately left as a manual reviewed step, see BACKFILL STRATEGY
-- below), every existing row in this single-tenant app belongs to the one
-- verified owner. Safe to execute directly in this same transaction rather
-- than deferring to a manual step. No financial data is fabricated —
-- existing rows are being labeled with their owner, not created.
UPDATE public.accounts SET user_id = '2f324f4d-1dc3-4ec5-8c23-93da480842c7'
  WHERE user_id IS NULL;
UPDATE public.clients SET user_id = '2f324f4d-1dc3-4ec5-8c23-93da480842c7'
  WHERE user_id IS NULL;
-- statements: 0 rows exist today (confirmed live, both at the original
-- audit and again at Phase 0) — this UPDATE is a documented no-op now,
-- included so the migration stays correct and idempotent if ever re-run
-- after real statement rows exist under this same single-tenant owner.
UPDATE public.statements SET user_id = '2f324f4d-1dc3-4ec5-8c23-93da480842c7'
  WHERE user_id IS NULL;

-- NOT NULL only after the backfill above, in the same transaction — by the
-- time Postgres evaluates these, every existing row already has user_id
-- populated (0 rows for statements, all rows for accounts/clients), so
-- none of the three can violate this constraint.
ALTER TABLE public.accounts ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.clients ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE public.statements ALTER COLUMN user_id SET NOT NULL;

COMMENT ON COLUMN public.accounts.user_id IS
  'Tenant/application owner (Supabase Auth) — see the Phase 2.6 header comment for why this is not the same concept as client_id. Backfilled to the single verified app owner and enforced NOT NULL as of this migration.';
COMMENT ON COLUMN public.clients.user_id IS
  'Tenant/application owner (Supabase Auth) that manages this client record — NOT the client itself (client_name/client_type already model that). See the Phase 2.6 header comment.';
COMMENT ON COLUMN public.statements.user_id IS
  'Tenant/application owner (Supabase Auth) — see the Phase 2.6 header comment. 0 rows exist today (unrelated Module 12B dependency, see the vw_statement_transactions comment below) — the backfill UPDATE above is a no-op until real rows exist.';

-- ============================================================================
-- PHASE 3 — Accounts data integrity
-- Ref: MIGRATION_PLAN.md Phase 3, SUPABASE_MAPPING.md "BankAccountRecord /
-- CreditCardRecord" section. Unblocks: Modules 8 (Accounts), 9 (Credit
-- Cards) — same physical `accounts` table backs both.
-- ============================================================================

-- 3.1 — CHECK constraint on account_type: RESOLVED WITHOUT A SCHEMA CHANGE
-- (Decision 3, PHASE0_VERIFICATION.md §1). A prior draft of this migration
-- assumed no constraint existed and tried to add one allowing 'Savings',
-- 'Current', 'Overdraft', 'Credit Card'. Phase 0's direct-connection read
-- of pg_constraint proved a constraint by that exact name already exists
-- live:
--
--   accounts_account_type_check: CHECK (account_type IN
--     ('Savings', 'Current', 'OD', 'Credit Card'))
--
-- Note the third value is 'OD', not 'Overdraft'. This migration does NOT
-- touch that constraint — not to add it (already exists) and not to change
-- 'OD' to 'Overdraft' (that would be rewriting a live, enforced vocabulary
-- and is explicitly out of scope: existing production data/constraints are
-- never silently replaced). The domain model's BankAccountType uses
-- 'overdraft' — the Supabase repository mapping layer must translate
-- 'OD' <-> 'overdraft'/'Overdraft' at the boundary; the frontend may keep
-- using the business-friendly term without the database ever storing it.
-- See REPOSITORY_IMPLEMENTATION_PLAN.md's BankAccountRepository section.
--
-- (Also visible now, for completeness, and likewise not touched:
-- accounts_account_category_check CHECK (account_category IN
-- ('Personal', 'Business', 'Joint', 'Other')) — unrelated to this
-- migration's account_type work, noted only because Phase 0 revealed it.)

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
-- PHASE 4.5 — updated_at auto-maintenance (Decision 4, PHASE0_VERIFICATION.md)
-- Ref: Phase 0 found zero triggers anywhere in `public` — every updated_at
-- column (accounts, clients, statements, merchant_memory, and this file's
-- own new categories.updated_at) is insert-only: DEFAULT now() sets it once
-- and nothing ever touches it again on UPDATE. Rather than requiring every
-- future repository's update() method to remember `updated_at = now()`,
-- one shared trigger function handles it for every table that has the
-- column. CREATE OR REPLACE FUNCTION is idempotent by nature (never
-- duplicates); CREATE OR REPLACE TRIGGER (Postgres 14+ — this project runs
-- 17.6, confirmed in PHASE0_VERIFICATION.md) is equally safe to re-run.
-- Does not alter any existing row's data — only affects future UPDATEs.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.set_updated_at() IS
  'Shared BEFORE UPDATE trigger function: sets NEW.updated_at = now() on every row update. Applied to every public table that has an updated_at column (see the CREATE OR REPLACE TRIGGER statements immediately below) — added because Phase 0 verification (PHASE0_VERIFICATION.md) found no trigger anywhere maintained these columns; they were insert-only.';

-- accounts.updated_at, clients.updated_at, statements.updated_at already
-- existed before this migration (all three DEFAULT now() on INSERT only).
CREATE OR REPLACE TRIGGER trg_accounts_set_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_clients_set_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_statements_set_updated_at
  BEFORE UPDATE ON public.statements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- merchant_memory.updated_at already existed but, per Phase 0, has no
-- insert-time default at all (column_default: null) — this trigger at
-- least ensures it becomes correct from the first UPDATE onward, though a
-- row that has never been updated will still show NULL until then. Not
-- backfilled here (existing NULLs are left as-is — no data is altered).
CREATE OR REPLACE TRIGGER trg_merchant_memory_set_updated_at
  BEFORE UPDATE ON public.merchant_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- categories.updated_at and application_settings.updated_at are both new
-- columns/tables added earlier in this same file (Phase 2.1, Phase 4.1) —
-- covered here so they don't repeat the same insert-only gap from day one.
CREATE OR REPLACE TRIGGER trg_categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE TRIGGER trg_application_settings_set_updated_at
  BEFORE UPDATE ON public.application_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Deliberately NOT triggered: audit_logs (immutable log rows — has
-- changed_at, set once, by design, never updated) and notifications (has
-- no updated_at column at all).

-- ============================================================================
-- PHASE 5a — Indexes on FK / filter columns (Decision 2, revised)
-- Ref: MIGRATION_PLAN.md item "verify indexes exist". SUPABASE_AUDIT.md §5
-- marked this "Not Available via REST" — Phase 0's direct connection has
-- now confirmed actual index coverage via pg_indexes, so this phase only
-- creates indexes that provide genuinely new coverage.
--
-- Already indexed live (confirmed via PHASE0_VERIFICATION.md — NOT
-- recreated here, since CREATE INDEX IF NOT EXISTS only dedupes by index
-- *name*, not by column, and these already exist under different names):
--   transactions.account_id        -> idx_transactions_account
--   transactions.client_id         -> idx_transactions_client
--   transactions.statement_id      -> idx_transactions_statement
--   transactions.transaction_date  -> idx_transactions_date AND idx_tx_date
--                                      (already duplicated between themselves —
--                                      not this migration's problem to fix)
--   merchant_memory.normalized_merchant -> idx_merchant_memory
-- Also already indexed live, not touched or duplicated here:
--   transactions.status, .type, .review_status, .merchant, .category,
--   .source_message_id, .user_id.
--
-- Genuinely missing — created below, all for columns/tables this migration
-- itself adds (so by definition cannot already have an index), plus
-- statement_transactions.statement_id, confirmed missing live despite that
-- table now holding 2,746 rows (PHASE0_VERIFICATION.md).
-- Volume is currently tiny (transactions=14 rows) so CONCURRENTLY is not
-- used; if this runs after real volume has grown, create these with
-- CREATE INDEX CONCURRENTLY outside a transaction block instead.
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transactions_merchant_id ON public.transactions (merchant_id);
CREATE INDEX IF NOT EXISTS idx_transactions_category_id ON public.transactions (category_id);
CREATE INDEX IF NOT EXISTS idx_transactions_duplicate_of_id ON public.transactions (duplicate_of_id);

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
-- inflow (credit) vs. outflow (debit)" — `type` is the OwnerType storage
-- column (personal/business/uncategorized, see Phase 1.2), not a debit/
-- credit signal, `transaction_type` defaults to 'credit_card' (an
-- account-channel label, not debit/credit), and `payment_mode` is
-- overloaded with debit/credit values only on some rows
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
  t.type AS raw_type,
  t.payment_mode,
  t.note,
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
  'Primary list view backing TransactionRepository.list(). Resolves merchant/category/client/account FKs and normalizes `status` into the domain TransactionStatus vocabulary (see Phase 1.4 comment on transactions.status for the raw values this maps from). merchant_name/category_name fall back to the legacy free-text columns when the FK is unresolved (pre-backfill rows). `raw_type` is the untranslated transactions.type value (personal|business|uncategorized) — per Decision 1 (PHASE0_VERIFICATION.md), the OwnerType mapping happens in the repository/domain layer, not in this view.';

CREATE OR REPLACE VIEW public.vw_transaction_details AS
SELECT
  t.*,
  mm.display_name AS merchant_display_name,
  mm.normalized_merchant,
  c.name AS category_name,
  c.color AS category_color,
  c.icon AS category_icon,
  cl.client_name AS resolved_client_name,
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
  'Full single-transaction detail row (drawer view) — every FK resolved, plus the raw transactions.* columns for anything not yet modeled. NOTE: `t.*` already includes the legacy free-text `client_name` column from `transactions` itself — the FK-resolved client name from the joined `clients` table is exposed separately as `resolved_client_name` to avoid a duplicate-column error (Postgres does not allow two output columns with the same name). Same pattern as `merchant_display_name` above it for the same underlying reason (transactions.merchant vs. merchant_memory.display_name).';

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
  'statement_transactions joined to its parent statement. MODULE 12B DEPENDENCY (Decision 6, not fixed by this migration): statement_id is currently written as a non-UUID synthetic string by Workflow D (see N8N_DATABASE_MAPPING.md), so it cannot match any real statements.id — statement_name will show NULL for all rows (2,746 as of PHASE0_VERIFICATION.md, growing) until Workflow D is fixed to create a real statements row per PDF and use its actual UUID. No backfill is attempted here: the existing statement_id values are not deterministically recoverable to a real statement, so inventing one would mean fabricating a link that never existed. This is intentionally left broken until Module 12B addresses it at the source.';

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
  t.type AS raw_type,
  SUM(t.amount) AS total_spend,
  COUNT(*) AS transaction_count
FROM public.transactions t
WHERE t.transaction_date IS NOT NULL
GROUP BY 1, 2
ORDER BY 1 DESC;

COMMENT ON VIEW public.vw_monthly_spend IS
  'Replaces/complements the existing non-vw_-prefixed `monthly_summaries` view per CLAUDE.md''s vw_<module>_<name> naming convention. Grouped by transactions.type (raw_type: personal|business|uncategorized — same column monthly_summaries already groups by) in addition to month; the repository maps raw_type to OwnerType at the domain boundary per Decision 1. Will show raw_type=''uncategorized'' for every current row until Workflow C Parser is updated to populate it (Module 12B).';

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

-- ============================================================================
-- PHASE 8 — RLS Policies (Decision 5, approved 2026-08-18)
-- Ref: RLS_POLICY_PLAN.md. Adds ownership-scoped policies for the 6 tables
-- that had RLS enabled with zero policies, and corrects one existing
-- `transactions` policy that was broader than intended. Does NOT disable
-- RLS anywhere. Does NOT add any USING (true) / WITH CHECK (true) policy.
-- Every CREATE POLICY is preceded by a DROP POLICY IF EXISTS on the same
-- name so this phase is idempotent (Postgres has no native
-- "CREATE POLICY IF NOT EXISTS") — re-running this file redefines the same
-- policy, it does not error or duplicate it.
-- ============================================================================

-- 8.1 — accounts, clients, statements: now have user_id (Phase 2.6).
-- Mirrors the own_<table>_all pattern already live on banks/categories/
-- email_sources (confirmed via Phase 0's pg_policies read) — one
-- permissive policy per table, all commands, scoped to the authenticated
-- owner. Covers every operation BankAccountRepository/CreditCardRepository/
-- ClientRepository/StatementRepository need (list/getSummary/create/
-- update/delete/syncAll) — none of those need a narrower per-command split.
DROP POLICY IF EXISTS own_accounts_all ON public.accounts;
CREATE POLICY own_accounts_all ON public.accounts
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_clients_all ON public.clients;
CREATE POLICY own_clients_all ON public.clients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_statements_all ON public.statements;
CREATE POLICY own_statements_all ON public.statements
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8.2 — merchant_memory, processed_messages, statement_transactions:
-- already had a usable user_id column (RLS_POLICY_PLAN.md's "ready" tier).
-- merchant_memory verified via direct connection to have 0 NULL user_id
-- rows before this policy was written (all 79 live rows belong to the one
-- verified owner) — no NULL-owned row is silently exposed to another
-- authenticated user, and none is silently orphaned either: there simply
-- are none. (Had any existed, `auth.uid() = user_id` would still correctly
-- exclude them by construction — NULL = anything is NULL/false in SQL,
-- never true — so this policy shape is safe regardless.)
DROP POLICY IF EXISTS own_merchant_memory_all ON public.merchant_memory;
CREATE POLICY own_merchant_memory_all ON public.merchant_memory
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_processed_messages_all ON public.processed_messages;
CREATE POLICY own_processed_messages_all ON public.processed_messages
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS own_statement_transactions_all ON public.statement_transactions;
CREATE POLICY own_statement_transactions_all ON public.statement_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 8.3 — transactions: policy correction.
--
-- BEFORE (live today, confirmed via Phase 0's direct pg_policies read):
--   "Allow authenticated inserts": FOR INSERT TO authenticated,
--       WITH CHECK (true)
--     -> any authenticated Supabase user could insert a transaction row
--        under ANY user_id, not just their own. RLS policies are OR'd
--        together permissively, so this policy alone made the narrower
--        one below meaningless for INSERT.
--   "own_tx_insert": FOR INSERT TO public, WITH CHECK (auth.uid() = user_id)
--     -> correctly scoped, but neutered by the policy above.
--   "own_tx_select" / "own_tx_update" / "own_tx_delete": already correctly
--     scoped to auth.uid() = user_id — untouched by this migration.
--   "service_role_bypass": FOR ALL TO service_role,
--       USING (true) WITH CHECK (true)
--     -> intentional and correct as the one deliberate exception: this
--        migration does NOT touch it. service_role already bypasses RLS
--        entirely by Postgres/Supabase design regardless of any policy —
--        this policy is consistent with that, not a workaround for it.
--
-- AFTER this migration:
--   "Allow authenticated inserts" is dropped. INSERT on `transactions` is
--   now governed solely by "own_tx_insert" (auth.uid() = user_id) for the
--   `public`/`authenticated` role, and "service_role_bypass" for
--   `service_role`. No authenticated user can insert a row under another
--   user's user_id anymore.
--
-- Why this cannot break the n8n workflows: both Workflow C Parser's
-- transaction-insert nodes ("Supabase Insert (transactions)", "Save
-- Transactions") authenticate with the `service_role` key (confirmed node-
-- by-node in N8N_NODE_DEPENDENCY_MAP.md), never with an `authenticated`-
-- role user session. service_role bypasses RLS entirely by design,
-- independent of any policy — dropping a policy scoped to the
-- `authenticated` role has zero effect on it. Preserved, not touched:
-- "service_role_bypass" (above) is exactly what keeps the workflow
-- working; nothing in this phase removes or narrows it.
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.transactions;

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
-- Phase 5a rollback (drop the indexes added by this migration — note this
-- list no longer includes idx_transactions_account_id/client_id/
-- statement_id/transaction_date or idx_merchant_memory_normalized_merchant:
-- Decision 2 removed those from Phase 5a because equivalent indexes already
-- existed live under different names; there is nothing this file added for
-- those to roll back):
--   DROP INDEX IF EXISTS idx_transactions_merchant_id;
--   DROP INDEX IF EXISTS idx_transactions_category_id;
--   DROP INDEX IF EXISTS idx_transactions_duplicate_of_id;
--   DROP INDEX IF EXISTS idx_merchant_memory_default_category_id;
--   DROP INDEX IF EXISTS idx_statement_transactions_statement_id;
--   DROP INDEX IF EXISTS idx_statements_account_id;
--   DROP INDEX IF EXISTS idx_statements_client_id;
--   DROP INDEX IF EXISTS idx_accounts_client_id;
--   DROP INDEX IF EXISTS idx_categories_parent_category_id;
--
-- Phase 4.5 rollback (drop the updated_at triggers and shared function —
-- safe any time, since these only affect future UPDATEs, never past data):
--   DROP TRIGGER IF EXISTS trg_accounts_set_updated_at ON public.accounts;
--   DROP TRIGGER IF EXISTS trg_clients_set_updated_at ON public.clients;
--   DROP TRIGGER IF EXISTS trg_statements_set_updated_at ON public.statements;
--   DROP TRIGGER IF EXISTS trg_merchant_memory_set_updated_at ON public.merchant_memory;
--   DROP TRIGGER IF EXISTS trg_categories_set_updated_at ON public.categories;
--   DROP TRIGGER IF EXISTS trg_application_settings_set_updated_at ON public.application_settings;
--   DROP FUNCTION IF EXISTS public.set_updated_at();
--
-- Phase 4 rollback (only safe if no data has been written to these tables
-- yet — check row counts first; if any row exists, treat this as data
-- loss and do NOT drop without a separate decision):
--   DROP TABLE IF EXISTS public.notifications;
--   DROP TABLE IF EXISTS public.audit_logs;
--   DROP TABLE IF EXISTS public.application_settings;
--
-- Phase 3 rollback: none. Decision 3 removed this migration's only Phase 3
-- schema statement (the account_type CHECK constraint attempt) once Phase 0
-- confirmed an equivalent constraint already exists live — this file no
-- longer creates anything under Phase 3 to roll back.
--
-- Phase 8 rollback (RLS policies — safe any time; restores the exact
-- pre-migration policy set, including the broad transactions INSERT
-- policy this migration deliberately removes — only do that last one if a
-- real regression is found, since it reintroduces the security gap Phase
-- 8.3 fixed):
--   DROP POLICY IF EXISTS own_accounts_all ON public.accounts;
--   DROP POLICY IF EXISTS own_clients_all ON public.clients;
--   DROP POLICY IF EXISTS own_statements_all ON public.statements;
--   DROP POLICY IF EXISTS own_merchant_memory_all ON public.merchant_memory;
--   DROP POLICY IF EXISTS own_processed_messages_all ON public.processed_messages;
--   DROP POLICY IF EXISTS own_statement_transactions_all ON public.statement_transactions;
--   CREATE POLICY "Allow authenticated inserts" ON public.transactions
--     FOR INSERT TO authenticated WITH CHECK (true); -- NOT recommended, see above
--
-- Phase 2.6 rollback (user_id on accounts/clients/statements — NOT safe by
-- the time DATABASE_SEED.sql or Phase 8's policies have run, since real
-- rows now depend on this column for RLS access; treat as destructive
-- once anything reads through the Phase 8.1 policies):
--   ALTER TABLE public.accounts ALTER COLUMN user_id DROP NOT NULL;
--   ALTER TABLE public.clients ALTER COLUMN user_id DROP NOT NULL;
--   ALTER TABLE public.statements ALTER COLUMN user_id DROP NOT NULL;
--   ALTER TABLE public.accounts DROP COLUMN IF EXISTS user_id;
--   ALTER TABLE public.clients DROP COLUMN IF EXISTS user_id;
--   ALTER TABLE public.statements DROP COLUMN IF EXISTS user_id;
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
-- Phase 1 rollback (same caveat — only safe while still all-null; note no
-- owner_type entry here — Decision 1 means this file never creates that
-- column, so there is nothing to roll back):
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS merchant_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS category_id;
--   ALTER TABLE public.transactions DROP COLUMN IF EXISTS duplicate_of_id;
--
-- General rule: once DATABASE_SEED.sql or any backfill UPDATE has run
-- against a column added here, rolling that column back becomes a
-- destructive action (real data would be lost) and requires explicit
-- sign-off, not a mechanical reversal of this file.

-- ============================================================================
-- EXECUTION ORDER (see DATABASE_EXECUTION_PLAN.md for the full gate)
-- ============================================================================
-- 1. Phase 0 verification (RLS / trigger / index confirmation) — DONE. See
--    PHASE0_VERIFICATION.md; this file has already been revised to account
--    for its findings (MIGRATION_CHANGELOG.md documents exactly what
--    changed). Nothing below has been executed yet.
-- 2. This file (Phases 1 -> 8, including Phase 2.6's ownership columns,
--    Phase 4.5's trigger phase, and Phase 8's RLS policies), in a single
--    transaction, in the order written above (each phase depends on
--    tables/columns from the phase before it — e.g. Phase 2.4's
--    accounts.client_id needs clients to already exist, which it does;
--    Phase 2.6's user_id backfill needs its own ADD COLUMN to have run
--    first, in the same phase; Phase 4.5's triggers need Phase 2's
--    categories.updated_at and Phase 4's application_settings to exist
--    first; Phase 5a's indexes need Phase 1-4's columns/tables to exist
--    first; Phase 8's accounts/clients/statements policies need Phase
--    2.6's user_id column to exist first).
-- 3. Backfill strategy steps (separate, reviewed, run manually — not part
--    of the transaction above). Note: no backfill is proposed for
--    statement_transactions.statement_id — see Decision 6 / MODULE 12B
--    dependency note near the Statements views above; that data problem is
--    not fixed by a backfill here.
-- 4. DATABASE_SEED.sql (idempotent, safe to run any time after this file).
-- 5. The SQL views in Phase 7 above (CREATE OR REPLACE VIEW statements,
--    additive only) — already included in step 2's single transaction.
-- 6. RLS policies (Phase 8) — REVISED: now part of this file and this same
--    transaction, per explicit approval of the ownership architecture
--    (RLS_POLICY_PLAN.md Option 1, 2026-08-18). Covers accounts, clients,
--    statements (new — needs Phase 2.6's user_id first), merchant_memory,
--    processed_messages, statement_transactions (previously approved,
--    "ready" tier), and the transactions INSERT policy correction. No
--    RLS work remains outside this file as of this revision.

-- ============================================================================
-- PHASE 9 — Module 12B account-resolution follow-up (2026-08-21)
-- STATUS: NOT EXECUTED. Separate from the Phase 1-8 transaction above (which
-- has already run against the live project). Run this on its own, once, via
-- the Supabase SQL editor.
--
-- CC Parser v0.5 exposes statement_total_amount_due as a field distinct from
-- closing_balance (explicit instruction: do not conflate the two, and
-- minimum_due already exists on `statements` so is untouched here). This is
-- the only new column Workflow D's account-resolution changes require.
-- Purely additive, nullable, trivially reversible.
-- ============================================================================

ALTER TABLE public.statements
  ADD COLUMN IF NOT EXISTS statement_total_amount_due numeric;

COMMENT ON COLUMN public.statements.statement_total_amount_due IS
  'Total amount due as reported by CC Parser v0.5 (data.statement_total_amount_due). Distinct from closing_balance -- the two must never be conflated or derived from one another. Null for statements where the source does not provide it (e.g. savings/current/OD).';

-- ============================================================================
-- PHASE 10 — vw_merchants / vw_merchant_transactions merchant_id fallback
-- (2026-08-22)
-- STATUS: NOT EXECUTED. Run this on its own, once, via the Supabase SQL
-- editor. View-only change (CREATE OR REPLACE VIEW) -- no table/column
-- changes, fully reversible by re-running the prior definitions from
-- Phase 7 above if ever needed.
--
-- Both views were originally written to join on `transactions.merchant_id`,
-- which Workflow C has never populated (it only ever writes the free-text
-- `merchant` column) -- documented as a known limitation in the original
-- view's own comment. Confirmed live: every transaction has merchant_id
-- NULL, so every merchant's transaction_count/total_spend reads 0 today
-- regardless of how much real transaction history exists for it.
--
-- Fix: fall back to matching `UPPER(TRIM(transactions.merchant))` against
-- `merchant_memory.normalized_merchant` (the same uppercase-trimmed
-- convention the repository layer already uses when creating merchants)
-- whenever merchant_id is null. The FK path is tried first and preferred
-- when populated, so this becomes a no-op once/if Workflow C is ever
-- updated to resolve merchant_id directly -- no further view change needed
-- at that point.
-- ============================================================================

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
  (SELECT COUNT(*) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = mm.normalized_merchant)
  ) AS transaction_count,
  (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = mm.normalized_merchant)
  ) AS total_spend,
  (SELECT MAX(t.transaction_date) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = mm.normalized_merchant)
  ) AS last_transaction_at
FROM public.merchant_memory mm
LEFT JOIN public.categories c ON c.id = mm.default_category_id;

COMMENT ON VIEW public.vw_merchants IS
  'Backs MerchantRecord list. Phase 10: falls back to UPPER(TRIM(transactions.merchant)) = normalized_merchant whenever merchant_id is unresolved, since Workflow C does not populate that FK today.';

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
JOIN public.transactions t
  ON t.merchant_id = mm.id
  OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = mm.normalized_merchant)
LEFT JOIN public.categories c ON c.id = t.category_id
ORDER BY t.transaction_date DESC;

COMMENT ON VIEW public.vw_merchant_transactions IS
  'Per-merchant transaction history. Phase 10: same merchant_id fallback as vw_merchants -- was previously an INNER JOIN on the unpopulated FK alone, so this returned 0 rows for every merchant.';

-- Rollback (restores the Phase 7 definitions -- reintroduces the original
-- merchant_id-only bug, only do this if the fallback join is itself found
-- to be wrong):
--   CREATE OR REPLACE VIEW public.vw_merchants AS ... (see Phase 7 above)
--   CREATE OR REPLACE VIEW public.vw_merchant_transactions AS ... (see Phase 7 above)

-- Rollback (safe only while still all-null / unused):
--   ALTER TABLE public.statements DROP COLUMN IF EXISTS statement_total_amount_due;

-- ============================================================================
-- PHASE 11 — vw_merchants / vw_merchant_transactions: display_name fallback
-- (2026-08-22)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. View-only, no table
-- changes, no data changes.
--
-- Phase 10's fallback only matched UPPER(TRIM(transactions.merchant)) against
-- merchant_memory.normalized_merchant. Confirmed live: this misses real
-- cases where normalized_merchant and the transaction's free-text merchant
-- diverge -- e.g. normalized_merchant = 'DECATHLON SPORTS' but
-- transactions.merchant = 'DECATHLON SPORTS INDIA' (matches display_name
-- exactly instead). Adds a third priority tier: FK -> normalized_merchant ->
-- display_name. A single (transaction, merchant) pair is still only ever
-- counted once per merchant here -- this is one WHERE clause with OR
-- conditions over one COUNT/SUM per merchant row, not a UNION of separate
-- counts, so a transaction matching multiple conditions for the SAME
-- merchant still contributes exactly one row to that merchant's aggregate.
-- Both sides of every text comparison are explicitly UPPER(TRIM(...))'d
-- (not just the transaction side) per explicit instruction to be
-- unambiguous about case/whitespace handling regardless of how
-- normalized_merchant/display_name happen to be stored.
-- ============================================================================

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
  (SELECT COUNT(*) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.normalized_merchant)))
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.display_name)))
  ) AS transaction_count,
  (SELECT COALESCE(SUM(t.amount), 0) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.normalized_merchant)))
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.display_name)))
  ) AS total_spend,
  (SELECT MAX(t.transaction_date) FROM public.transactions t
     WHERE t.merchant_id = mm.id
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.normalized_merchant)))
        OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.display_name)))
  ) AS last_transaction_at
FROM public.merchant_memory mm
LEFT JOIN public.categories c ON c.id = mm.default_category_id;

COMMENT ON VIEW public.vw_merchants IS
  'Backs MerchantRecord list. Phase 11: falls back through normalized_merchant then display_name (both UPPER/TRIM) whenever transactions.merchant_id is unresolved, since Workflow C does not populate that FK today.';

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
JOIN public.transactions t
  ON t.merchant_id = mm.id
  OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.normalized_merchant)))
  OR (t.merchant_id IS NULL AND UPPER(TRIM(t.merchant)) = UPPER(TRIM(mm.display_name)))
LEFT JOIN public.categories c ON c.id = t.category_id
ORDER BY t.transaction_date DESC;

COMMENT ON VIEW public.vw_merchant_transactions IS
  'Per-merchant transaction history. Phase 11: same 3-tier fallback as vw_merchants.';

-- Rollback (restores the Phase 10 definitions):
--   CREATE OR REPLACE VIEW public.vw_merchants AS ... (see Phase 10 above)
--   CREATE OR REPLACE VIEW public.vw_merchant_transactions AS ... (see Phase 10 above)

-- ============================================================================
-- PHASE 12 — Re-apply statement_transactions RLS policy (2026-08-22)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor.
--
-- Live testing during Module 12B Phase 2 found statement_transactions
-- returns 0 rows for the authenticated dev user via the anon key, despite
-- real rows existing with a matching user_id (confirmed via the Table
-- Editor's postgres/service-role view, which bypasses RLS). `statements`,
-- using the structurally identical own_statements_all policy, correctly
-- returns owner-scoped rows in the same session -- so the policy pattern
-- itself works; own_statement_transactions_all specifically appears to
-- never have been applied (or was reverted). This is a pure re-apply of
-- the policy already defined in Phase 8 (section 8.2) above -- not a new
-- policy shape, not a schema change. Idempotent (DROP POLICY IF EXISTS).
-- ============================================================================

DROP POLICY IF EXISTS own_statement_transactions_all ON public.statement_transactions;
CREATE POLICY own_statement_transactions_all ON public.statement_transactions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PHASE 13 — Re-create vw_statements to pick up statement_total_amount_due
-- (2026-08-22, corrected 2026-08-23)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. View-only, no table
-- changes, no data changes.
--
-- The first version of this migration (below, for the record) used
-- `SELECT s.*, ...` and FAILED live with:
--   ERROR 42P16: cannot change name of view column "account_name" to
--   "source_message_id"
-- Root cause, confirmed by querying the live database directly (both
-- `vw_statements` and `statements` return their column names in physical
-- order when selected via the Supabase client, which is a reliable proxy
-- for information_schema.columns' ordinal_position -- information_schema
-- itself is not exposed through PostgREST on this project):
--
--   Live vw_statements column order (29 cols, frozen at view-creation time):
--     1 id, 2 account_id, 3 statement_name, 4 statement_period_start,
--     5 statement_period_end, 6 statement_date, 7 due_date,
--     8 opening_balance, 9 closing_balance, 10 total_debits,
--     11 total_credits, 12 minimum_due, 13 credit_limit,
--     14 available_credit, 15 rewards_points, 16 pdf_filename,
--     17 pdf_storage_path, 18 parser_version, 19 processing_status,
--     20 notes, 21 created_at, 22 updated_at, 23 client_id, 24 user_id,
--     25 account_name, 26 institution_name, 27 card_network,
--     28 client_name, 29 transactions_extracted
--
--   Live statements table column order (26 cols):
--     1-24 identical to vw_statements' 1-24 above, then
--     25 source_message_id, 26 statement_total_amount_due
--
-- `statements` has picked up TWO trailing columns since the view was
-- created (`source_message_id`, `statement_total_amount_due`) that were
-- never part of the view's contract. `s.*` expands to all 26 of the
-- table's columns, so it inserted both of them at positions 25-26 --
-- BEFORE `a.account_name` (which the old view had at position 25) --
-- shifting every joined column two places to the right. PostgreSQL's
-- `CREATE OR REPLACE VIEW` requires every existing output column to keep
-- its exact name at its exact ordinal position; new columns may only be
-- appended at the very end. That mismatch (position 25 asked to rename
-- from `account_name` to `source_message_id`) is exactly the reported
-- error.
--
-- Fix: an explicit column list that reproduces the 29 existing columns in
-- their exact existing order (verified against the live query above,
-- column-for-column), then appends ONLY `statement_total_amount_due` at
-- position 30. `source_message_id` is deliberately left unexposed -- it
-- was never part of this view's contract and nothing in the frontend
-- consumes it; exposing it wasn't asked for and isn't needed for this fix.
-- ============================================================================

-- ---- SUPERSEDED (kept for the record; do not run) ----
-- CREATE OR REPLACE VIEW public.vw_statements AS
-- SELECT
--   s.*,
--   a.account_name,
--   a.institution_name,
--   a.card_network,
--   cl.client_name,
--   (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS transactions_extracted
-- FROM public.statements s
-- LEFT JOIN public.accounts a ON a.id = s.account_id
-- LEFT JOIN public.clients cl ON cl.id = s.client_id;
-- ---- END SUPERSEDED ----

CREATE OR REPLACE VIEW public.vw_statements AS
SELECT
  s.id,
  s.account_id,
  s.statement_name,
  s.statement_period_start,
  s.statement_period_end,
  s.statement_date,
  s.due_date,
  s.opening_balance,
  s.closing_balance,
  s.total_debits,
  s.total_credits,
  s.minimum_due,
  s.credit_limit,
  s.available_credit,
  s.rewards_points,
  s.pdf_filename,
  s.pdf_storage_path,
  s.parser_version,
  s.processing_status,
  s.notes,
  s.created_at,
  s.updated_at,
  s.client_id,
  s.user_id,
  a.account_name,
  a.institution_name,
  a.card_network,
  cl.client_name,
  (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS transactions_extracted,
  s.statement_total_amount_due
FROM public.statements s
LEFT JOIN public.accounts a ON a.id = s.account_id
LEFT JOIN public.clients cl ON cl.id = s.client_id;

COMMENT ON VIEW public.vw_statements IS
  'Statement list with account/client resolved and a live count of linked statement_transactions. Phase 13 (corrected): explicit column list preserving the exact existing column order, with statement_total_amount_due appended at the end -- s.* is no longer used, so a future statements column addition cannot break this view again.';

-- ============================================================================
-- PHASE 14 — Fix vw_statement_summary's processing_status guess (2026-08-23)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. View-only, no table
-- changes, no data changes.
--
-- Phase 7 guessed `processing_status = 'Processed'` (capitalized) for the
-- "Successfully Processed" count, before any real Workflow D data existed
-- to check the guess against. Confirmed live now that real statements
-- exist: every real row's `processing_status` is lowercase `'completed'`,
-- never `'Processed'` -- discovered because Statement Explorer (frontend)
-- showed "Imported" instead of "Processed" for a statement that had
-- genuinely finished processing. This is the same root cause on the
-- database side: `vw_statement_summary`'s "Successfully Processed" KPI on
-- Statement Control has been undercounting (likely showing 0) for the same
-- reason. Matches both spellings so this doesn't regress if a future
-- Workflow D version ever writes the originally-guessed value instead.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_statement_summary AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE processing_status IN ('Processed', 'completed')) AS processed,
  COUNT(*) FILTER (WHERE processing_status = 'Processing') AS processing,
  COUNT(*) FILTER (WHERE processing_status = 'Failed') AS failed,
  COUNT(*) FILTER (WHERE processing_status = 'Pending Review') AS pending_review
FROM public.statements;

COMMENT ON VIEW public.vw_statement_summary IS
  'StatementSummary counts. Phase 14: processing_status also matches lowercase ''completed'' -- the actual value Workflow D writes, confirmed against live data (Phase 7''s ''Processed''-only guess predates any real statements existing).';

-- ============================================================================
-- PHASE 15 — Add client_id to statement_transactions (2026-08-23)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. Additive only:
-- one new nullable column + one index. No existing column changed, no
-- table dropped, no data touched.
--
-- Lets Statement Explorer assign a client to a statement-level transaction,
-- the same way `transactions.client_id` already works for the real-time
-- ledger -- needed because historical statements (imported without a
-- matching real-time `transactions` row) have no other way to carry a
-- client assignment. Frontend reads this table with `SELECT *`, so running
-- this migration is not a hard prerequisite for the rest of Statement
-- Explorer to keep working -- before it's run, every row simply has no
-- `client_id` key and the UI shows "No client" (never a fabricated value);
-- after it's run, assignment becomes possible and persists.
-- ============================================================================

ALTER TABLE public.statement_transactions
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

CREATE INDEX IF NOT EXISTS idx_statement_transactions_client_id
  ON public.statement_transactions(client_id);

COMMENT ON COLUMN public.statement_transactions.client_id IS
  'User-assigned client for this statement-transaction row, set from Statement Explorer. Mirrors transactions.client_id -- separate column because statement_transactions has no reliable FK back to transactions.';

-- ============================================================================
-- PHASE 16 — Add owner_type to statement_transactions (2026-08-23)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. Additive only: one
-- new nullable column. No existing column changed, no data touched.
--
-- Free text ('business' / 'personal'), matching transactions.type's own
-- representation (also free text, not an enum -- see toOwnerType() in
-- supabase-transaction.repository.ts). Separate column rather than writing
-- into the existing metadata->>'business_personal' key: the parser already
-- populates that key on every row, but updating one key inside a JSONB
-- column via PostgREST's simple `.update()` would require a read-modify-
-- write (or a raw jsonb_set, unavailable without an RPC) and risks
-- clobbering other metadata keys under concurrent writes. The frontend
-- still reads metadata->>'business_personal' as the initial value before
-- any manual edit -- this column only takes over once a user has toggled it.
-- ============================================================================

ALTER TABLE public.statement_transactions
  ADD COLUMN IF NOT EXISTS owner_type text;

COMMENT ON COLUMN public.statement_transactions.owner_type IS
  'User-set Business/Personal classification for this row, from Statement Explorer''s toggle. Null until a user explicitly sets it -- until then the frontend falls back to metadata->>''business_personal'' (the parser''s own classification), then to ''personal'' (same last-resort default transactions.type uses).';

-- ============================================================================
-- PHASE 17 — Resolve merchant_memory.default_category_id from category text
-- (2026-08-24)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. Additive: one new
-- trigger function + trigger, plus a one-time UPDATE that only ever fills
-- currently-NULL default_category_id values -- no existing FK value is
-- ever changed or overwritten, no row is dropped.
--
-- Root cause: merchant_memory.category (free text, e.g. 'Groceries') gets
-- populated by AI/statement extraction (Workflow C/D) on INSERT, but
-- default_category_id (the real FK to categories.id) is left NULL --
-- nothing currently resolves one from the other. The Merchant Center
-- "Uncategorized Merchants" KPI (supabase-merchant.repository.ts
-- getSummary()) counts rows on `default_category_id IS NULL`, so every one
-- of these rows is counted as uncategorized even though the table already
-- displays a real category for them (via the repository's own
-- fetchCategoryFallback() reading the free-text column). The AI/statement-
-- assigned category is meant to be treated as final, per product decision:
-- a merchant arriving with a category already extracted from a statement
-- should never be flagged as needing categorization -- the user can still
-- change it later, but it starts resolved, not blank.
--
-- Trigger fires BEFORE INSERT only, deliberately never on UPDATE -- so it
-- resolves a brand-new row's category exactly once at creation time and
-- can never fight a later explicit user correction (e.g. picking
-- "Uncategorized" for a merchant via the Merchant Review drawer, which
-- sets default_category_id back to NULL without touching the old free-text
-- category column).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_resolve_merchant_default_category()
RETURNS trigger AS $$
BEGIN
  IF NEW.default_category_id IS NULL
     AND NEW.category IS NOT NULL
     AND NEW.category <> 'Uncategorized' THEN
    SELECT id INTO NEW.default_category_id
    FROM public.categories
    WHERE lower(name) = lower(NEW.category)
    LIMIT 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_resolve_merchant_default_category ON public.merchant_memory;

CREATE TRIGGER trg_resolve_merchant_default_category
  BEFORE INSERT ON public.merchant_memory
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_resolve_merchant_default_category();

COMMENT ON FUNCTION public.fn_resolve_merchant_default_category() IS
  'Resolves merchant_memory.default_category_id from the free-text category column at INSERT time only, case-insensitive exact match against categories.name. Never runs on UPDATE, so it can never overwrite a later explicit user correction.';

-- One-time backfill for rows created before this trigger existed.
UPDATE public.merchant_memory m
SET default_category_id = c.id
FROM public.categories c
WHERE m.default_category_id IS NULL
  AND m.category IS NOT NULL
  AND m.category <> 'Uncategorized'
  AND lower(c.name) = lower(m.category);

-- Phase 17 rollback (safe any time -- drops the trigger/function only; the
-- backfilled default_category_id values are correct data, not left as a
-- side effect to undo):
-- DROP TRIGGER IF EXISTS trg_resolve_merchant_default_category ON public.merchant_memory;
-- DROP FUNCTION IF EXISTS public.fn_resolve_merchant_default_category();

-- ============================================================================
-- PHASE 18 — Backfill categories.user_id for the 24 default categories
-- (2026-08-25)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. Pure data backfill:
-- only fills currently-NULL user_id values on categories.categories already
-- has a user_id column and an existing `own_cat_all` RLS policy (auth.uid()
-- = user_id, for ALL commands) -- neither the column nor the policy is
-- touched by this migration, only the data.
--
-- Root cause of "Edit Category > Save Changes silently does nothing": all
-- 24 live categories were seeded with user_id = NULL (see the class-level
-- doc comment on SupabaseCategoryRepository). own_cat_all only grants
-- UPDATE to rows where auth.uid() = user_id, so editing any of these 24
-- categories matches zero rows -- PostgREST returns no error, just an empty
-- result, which supabase-category.repository.ts's update() correctly
-- surfaces as "could not be updated... RLS denied the write", but the
-- calling UI (CategoryFormDialog / Categories.tsx) has no error-state
-- rendering, so the dialog just sits there with no visible feedback. The
-- frontend was already talking to Supabase correctly the whole time; RLS
-- was the one silently rejecting the write.
--
-- Fix: this is a single-tenant app (see Phase 2.6's header comment) -- the
-- one verified owner, id 2f324f4d-1dc3-4ec5-8c23-93da480842c7, already owns
-- every other user_id-populated row in the database (accounts, clients,
-- statements, transactions, merchant_memory). These 24 categories are this
-- same owner's data, just never labeled -- backfilling user_id makes the
-- existing own_cat_all policy correctly recognize them as editable, exactly
-- like Phase 2.6 did for accounts/clients/statements. No RLS policy
-- changed, no new column, no application code touched.
-- ============================================================================

UPDATE public.categories
  SET user_id = '2f324f4d-1dc3-4ec5-8c23-93da480842c7'
  WHERE user_id IS NULL;

-- Phase 18 rollback (only safe if none of these categories have been
-- edited since -- otherwise this would also revert genuine post-backfill
-- user edits' ownership, not just this migration's effect):
-- UPDATE public.categories SET user_id = NULL
--   WHERE user_id = '2f324f4d-1dc3-4ec5-8c23-93da480842c7';

-- ============================================================================
-- PHASE 19 — Coalesce statement_date/statement_period_end for credit cards
-- in vw_statements (2026-09-16)
-- STATUS: NOT EXECUTED. Run via the Supabase SQL editor. View-only, no table
-- changes, no data changes.
--
-- Root cause of "Statement Control's Statement Date sort looks wrong": CC
-- Parser sometimes only populates one of statement_date /
-- statement_period_end for a given credit-card statement (both name the
-- same statement cycle's closing date). supabase-statement.repository.ts's
-- mapRow() already coalesces the two for DISPLAY on credit-card rows
-- (`row.statement_date ?? row.statement_period_end`), but Statement
-- Control's sort and the dateFrom/dateTo filters both order/filter on the
-- view's raw statement_date column, which is NOT coalesced -- a row that
-- visibly shows a real date (via the period_end fallback) can still sort as
-- if it had none, and can be silently excluded by a date-range filter that
-- should have matched it.
--
-- Fix: move the same fallback into the view itself, conditioned on
-- a.account_type = 'Credit Card' (bank statements are left untouched,
-- matching the existing frontend comment: "Bank statements are left
-- as-is"). Once this runs, mapRow()'s TS-side coalesce becomes a no-op for
-- credit cards (both sides already equal) -- left in place as a harmless
-- defensive fallback, not removed here.
--
-- CORRECTED (2026-09-16, same day): the first version of this migration
-- referenced `a.account_kind`, which does not exist on the base
-- `public.accounts` table -- it only exists as a computed column inside
-- `vw_accounts` (`CASE WHEN a.account_type = 'Credit Card' THEN
-- 'credit_card' ELSE 'bank' END AS account_kind`, see Phase 7 above). Since
-- this view joins the base `accounts` table directly (not `vw_accounts`),
-- it must test the real underlying column instead: `a.account_type =
-- 'Credit Card'`. Caught immediately by a live "column does not exist"
-- error (42703) before this was ever applied -- no broken view was ever
-- live.
--
-- Column list, order and names are otherwise IDENTICAL to Phase 13's
-- version -- only the two expressions feeding the existing
-- statement_period_end (position 5) and statement_date (position 6) columns
-- change; CREATE OR REPLACE VIEW only requires the same column name/type at
-- the same position, not the same source expression.
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_statements AS
SELECT
  s.id,
  s.account_id,
  s.statement_name,
  s.statement_period_start,
  CASE
    WHEN a.account_type = 'Credit Card'
      THEN COALESCE(s.statement_period_end, s.statement_date)
    ELSE s.statement_period_end
  END AS statement_period_end,
  CASE
    WHEN a.account_type = 'Credit Card'
      THEN COALESCE(s.statement_date, s.statement_period_end)
    ELSE s.statement_date
  END AS statement_date,
  s.due_date,
  s.opening_balance,
  s.closing_balance,
  s.total_debits,
  s.total_credits,
  s.minimum_due,
  s.credit_limit,
  s.available_credit,
  s.rewards_points,
  s.pdf_filename,
  s.pdf_storage_path,
  s.parser_version,
  s.processing_status,
  s.notes,
  s.created_at,
  s.updated_at,
  s.client_id,
  s.user_id,
  a.account_name,
  a.institution_name,
  a.card_network,
  cl.client_name,
  (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS transactions_extracted,
  s.statement_total_amount_due
FROM public.statements s
LEFT JOIN public.accounts a ON a.id = s.account_id
LEFT JOIN public.clients cl ON cl.id = s.client_id;

COMMENT ON VIEW public.vw_statements IS
  'Statement list with account/client resolved and a live count of linked statement_transactions. Phase 19: statement_date/statement_period_end are coalesced against each other for credit-card rows (bank rows untouched), so sorting, dateFrom/dateTo filtering, and display all agree -- previously only the frontend mapRow() display did this coalesce, sort/filter did not.';

-- Phase 19 rollback (restores Phase 13's uncoalesced expressions):
-- CREATE OR REPLACE VIEW public.vw_statements AS
-- SELECT
--   s.id, s.account_id, s.statement_name, s.statement_period_start,
--   s.statement_period_end, s.statement_date, s.due_date, s.opening_balance,
--   s.closing_balance, s.total_debits, s.total_credits, s.minimum_due,
--   s.credit_limit, s.available_credit, s.rewards_points, s.pdf_filename,
--   s.pdf_storage_path, s.parser_version, s.processing_status, s.notes,
--   s.created_at, s.updated_at, s.client_id, s.user_id, a.account_name,
--   a.institution_name, a.card_network, cl.client_name,
--   (SELECT COUNT(*) FROM public.statement_transactions st WHERE st.statement_id = s.id) AS transactions_extracted,
--   s.statement_total_amount_due
-- FROM public.statements s
-- LEFT JOIN public.accounts a ON a.id = s.account_id
-- LEFT JOIN public.clients cl ON cl.id = s.client_id;
