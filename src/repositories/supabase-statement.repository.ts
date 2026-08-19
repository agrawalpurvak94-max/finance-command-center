import type { SupabaseClient } from '@supabase/supabase-js'
import type { AccountKind, TransactionAccount } from '@/domain/Account'
import type {
  Statement,
  StatementCreateInput,
  StatementListParams,
  StatementListResult,
  StatementStatus,
  StatementSummary,
} from '@/domain/Statement'
import type { StatementRepository } from '@/repositories/statement.repository'
import { getCurrentUserId } from '@/lib/supabaseAuth'

/**
 * Reads `vw_statements` / `vw_statement_summary` (see DATABASE_MIGRATIONS.sql
 * Phase 7). Writes go directly to `statements`, scoped by RLS
 * (`own_statements_all`: auth.uid() = user_id).
 *
 * KNOWN LIMITATION, NOT FIXED HERE (Module 12B dependency, Decision 6):
 * `statement_transactions.statement_id` is written by Workflow D as a
 * non-UUID synthetic string, so it never matches a real `statements.id` —
 * every statement-transaction link is broken at the source today. This
 * repository does not attempt to invent or backfill a link; a statement's
 * transaction list will legitimately be empty until Module 12B fixes
 * Workflow D to create a real `statements` row per PDF. `statements` itself
 * is also empty on every live check this session (0 rows) — no workflow
 * node currently inserts into it — so every method below has been verified
 * against a temporary, immediately-deleted test row, not real n8n-imported
 * data.
 *
 * Mapping decisions:
 * - `Statement.account` is non-nullable, but `statements.account_id` is a
 *   nullable FK. Where null (never observed live, but schema-legal), a
 *   placeholder `{ bankName: 'Unknown', last4: '0000' }` account is used —
 *   a disclosed fallback, not a fabricated real account.
 * - `statementPeriodLabel` has no dedicated column — built from
 *   `statement_period_start`/`statement_period_end` if present, else
 *   `statement_name`, else empty string.
 * - `importedAt` maps to `created_at` (no dedicated "imported" timestamp).
 * - `status`: DB `processing_status` is free text; only 'Processed' /
 *   'Processing' / 'Failed' / 'Pending Review' are recognized (best-guess
 *   vocabulary per vw_statement_summary's own comment, unconfirmed against
 *   real data since the table is empty) — anything else, including null,
 *   maps to 'imported'.
 */

const STATUS_DB_TO_DOMAIN: Record<string, StatementStatus> = {
  Processed: 'processed',
  Processing: 'processing',
  Failed: 'failed',
  'Pending Review': 'pending_review',
}
const STATUS_DOMAIN_TO_DB: Record<StatementStatus, string> = {
  imported: 'Imported',
  processing: 'Processing',
  processed: 'Processed',
  failed: 'Failed',
  pending_review: 'Pending Review',
}

function toStatus(value: string | null): StatementStatus {
  return value ? (STATUS_DB_TO_DOMAIN[value] ?? 'imported') : 'imported'
}

function periodLabel(row: StatementRow): string {
  if (row.statement_period_start && row.statement_period_end) {
    return `${row.statement_period_start} – ${row.statement_period_end}`
  }
  return row.statement_name ?? ''
}

type StatementRow = {
  id: string
  account_id: string | null
  client_id: string | null
  client_name: string | null
  statement_name: string | null
  statement_period_start: string | null
  statement_period_end: string | null
  statement_date: string | null
  pdf_filename: string | null
  processing_status: string | null
  notes: string | null
  created_at: string | null
  transactions_extracted: number | string | null
}

type AccountLookupRow = {
  id: string
  account_kind: AccountKind
  institution_name: string
  card_network: string | null
  resolved_last4: string | null
}

function buildAccount(
  accountId: string | null,
  lookup: Map<string, AccountLookupRow>,
): TransactionAccount {
  const row = accountId ? lookup.get(accountId) : undefined
  if (!row) {
    return { id: accountId ?? '', kind: 'bank', bankName: 'Unknown', last4: '0000' }
  }
  return {
    id: row.id,
    kind: row.account_kind,
    bankName: row.institution_name,
    cardNetwork:
      row.account_kind === 'credit_card'
        ? (row.card_network as TransactionAccount['cardNetwork'])
        : undefined,
    last4: row.resolved_last4 ?? '0000',
  }
}

function mapRow(row: StatementRow, lookup: Map<string, AccountLookupRow>): Statement {
  return {
    id: row.id,
    account: buildAccount(row.account_id, lookup),
    client: row.client_id && row.client_name ? { id: row.client_id, name: row.client_name } : null,
    statementDate: row.statement_date ?? '',
    statementPeriodLabel: periodLabel(row),
    fileName: row.pdf_filename ?? '',
    transactionsExtracted: Number(row.transactions_extracted ?? 0),
    status: toStatus(row.processing_status),
    importedAt: row.created_at ?? new Date().toISOString(),
    notes: row.notes,
  }
}

async function fetchAccountLookup(
  client: SupabaseClient,
  accountIds: readonly string[],
): Promise<Map<string, AccountLookupRow>> {
  const ids = [...new Set(accountIds.filter((id): id is string => Boolean(id)))]
  const map = new Map<string, AccountLookupRow>()
  if (ids.length === 0) return map
  const { data, error } = await client
    .from('vw_accounts')
    .select('id,account_kind,institution_name,card_network,resolved_last4')
    .in('id', ids)
  if (error) throw new Error(`Failed to resolve statement accounts: ${error.message}`)
  for (const row of (data ?? []) as AccountLookupRow[]) map.set(row.id, row)
  return map
}

const SORT_COLUMN: Record<NonNullable<StatementListParams['sort']>['id'], string> = {
  statementDate: 'statement_date',
  importedAt: 'created_at',
  transactionsExtracted: 'transactions_extracted',
}

export class SupabaseStatementRepository implements StatementRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async list(params: StatementListParams): Promise<StatementListResult> {
    const { page, pageSize, search, sort, filters } = params

    let query = this.client.from('vw_statements').select('*', { count: 'exact' })

    if (search) {
      query = query.or(
        `pdf_filename.ilike.%${search}%,institution_name.ilike.%${search}%,statement_name.ilike.%${search}%`,
      )
    }
    if (filters?.dateFrom) query = query.gte('statement_date', filters.dateFrom)
    if (filters?.dateTo) query = query.lte('statement_date', filters.dateTo)
    if (filters?.bankName) query = query.eq('institution_name', filters.bankName)
    if (filters?.status) query = query.eq('processing_status', STATUS_DOMAIN_TO_DB[filters.status])
    if (filters?.clientId) query = query.eq('client_id', filters.clientId)
    if (filters?.accountId) query = query.eq('account_id', filters.accountId)
    if (filters?.accountKind) {
      const { data: kindAccounts } = await this.client
        .from('vw_accounts')
        .select('id')
        .eq('account_kind', filters.accountKind)
      const ids = (kindAccounts ?? []).map((r) => (r as { id: string }).id)
      query = query.in(
        'account_id',
        ids.length > 0 ? ids : ['00000000-0000-0000-0000-000000000000'],
      )
    }

    const sortColumn = sort ? SORT_COLUMN[sort.id] : 'statement_date'
    query = query.order(sortColumn, { ascending: sort ? !sort.desc : false })

    const start = (page - 1) * pageSize
    query = query.range(start, start + pageSize - 1)

    const { data, error, count } = await query
    if (error) throw new Error(`Failed to list statements: ${error.message}`)

    const rows = (data ?? []) as StatementRow[]
    const lookup = await fetchAccountLookup(
      this.client,
      rows.map((r) => r.account_id).filter((id): id is string => Boolean(id)),
    )

    return { rows: rows.map((row) => mapRow(row, lookup)), total: count ?? rows.length }
  }

  async getById(id: string): Promise<Statement | null> {
    const { data, error } = await this.client
      .from('vw_statements')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`Failed to load statement ${id}: ${error.message}`)
    if (!data) return null

    const row = data as StatementRow
    const lookup = await fetchAccountLookup(this.client, row.account_id ? [row.account_id] : [])
    return mapRow(row, lookup)
  }

  async getSummary(): Promise<StatementSummary> {
    const { data, error } = await this.client.from('vw_statement_summary').select('*').maybeSingle()
    if (error) throw new Error(`Failed to load statement summary: ${error.message}`)

    const s = data as {
      total?: number
      processed?: number
      processing?: number
      failed?: number
      pending_review?: number
    } | null
    return {
      total: s?.total ?? 0,
      processed: s?.processed ?? 0,
      processing: s?.processing ?? 0,
      failed: s?.failed ?? 0,
      pendingReview: s?.pending_review ?? 0,
    }
  }

  async create(input: StatementCreateInput): Promise<Statement> {
    const userId = await getCurrentUserId()

    const { data, error } = await this.client
      .from('statements')
      .insert({
        user_id: userId,
        account_id: input.accountId,
        statement_name: input.statementPeriodLabel,
        pdf_filename: input.fileName,
        statement_date: new Date().toISOString().slice(0, 10),
        processing_status: 'Imported',
      })
      .select('*')
      .single()

    if (error) throw new Error(`Failed to create statement: ${error.message}`)

    const lookup = await fetchAccountLookup(this.client, [input.accountId])
    return mapRow(
      {
        id: data.id,
        account_id: data.account_id,
        client_id: data.client_id,
        client_name: null,
        statement_name: data.statement_name,
        statement_period_start: data.statement_period_start,
        statement_period_end: data.statement_period_end,
        statement_date: data.statement_date,
        pdf_filename: data.pdf_filename,
        processing_status: data.processing_status,
        notes: data.notes,
        created_at: data.created_at,
        transactions_extracted: 0,
      },
      lookup,
    )
  }

  async reprocess(id: string): Promise<Statement> {
    const { data, error } = await this.client
      .from('statements')
      .update({ processing_status: 'Processing' })
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) throw new Error(`Failed to reprocess statement ${id}: ${error.message}`)
    if (!data)
      throw new Error(
        `Statement ${id} could not be reprocessed — it does not exist, or RLS denied the write.`,
      )

    const statement = await this.getById(id)
    if (!statement) throw new Error(`Statement ${id} vanished after reprocess.`)
    return statement
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client
      .from('statements')
      .delete({ count: 'exact' })
      .eq('id', id)
    if (error) throw new Error(`Failed to delete statement ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Statement ${id} could not be deleted — it does not exist, or RLS denied the write.`,
      )
  }
}
