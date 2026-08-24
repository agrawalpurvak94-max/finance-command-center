import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  StatementAccountIdentity,
  StatementTransactionRow,
  StatementTransactionType,
} from '@/domain/StatementTransaction'
import type { AccountKind } from '@/domain/Account'
import type { OwnerType } from '@/domain/Transaction'
import type { StatementTransactionRepository } from '@/repositories/statement-transaction.repository'

/**
 * Reads `public.statement_transactions` directly (no dedicated view exists
 * for it yet) and `vw_accounts` for account identity. RLS-scoped via
 * `own_statement_transactions_all` (auth.uid() = user_id, see
 * DATABASE_MIGRATIONS.sql — originally Phase 8, re-applied later after it
 * was found not to have taken effect).
 */

/** Exported for reuse by `supabase-statement-analytics.repository.ts` — same table, same row mapping. */
export type StatementTransactionDbRow = {
  id: string
  statement_id: string
  transaction_date: string | null
  merchant: string | null
  normalized_merchant: string | null
  raw_description: string | null
  category: string | null
  category_source: string | null
  amount: number | string | null
  transaction_type: string | null
  confidence: number | string | null
  status: string | null
  note: string | null
  metadata: { message_id?: string; email_subject?: string; business_personal?: string } | null
  /** Undefined until DATABASE_MIGRATIONS.sql Phase 15 is run — see mapRow. */
  client_id?: string | null
  /** Undefined until DATABASE_MIGRATIONS.sql Phase 16 is run — see mapRow. */
  owner_type?: string | null
}

function toType(value: string | null): StatementTransactionType {
  return value === 'credit' ? 'credit' : 'debit'
}

function toOwnerType(
  explicit: string | null | undefined,
  parserValue: string | undefined,
): OwnerType {
  const normalize = (v: string) => v.trim().toLowerCase()
  if (explicit && normalize(explicit) === 'business') return 'business'
  if (explicit && normalize(explicit) === 'personal') return 'personal'
  if (parserValue && normalize(parserValue) === 'business') return 'business'
  if (parserValue && normalize(parserValue) === 'personal') return 'personal'
  return 'personal'
}

export function mapRow(row: StatementTransactionDbRow): StatementTransactionRow {
  return {
    id: row.id,
    statementId: row.statement_id,
    date: row.transaction_date ?? '',
    merchant: row.merchant ?? row.normalized_merchant ?? 'Unknown',
    normalizedMerchant: row.normalized_merchant,
    rawDescription: row.raw_description,
    category: row.category,
    categorySource: row.category_source,
    amount: row.amount != null ? Number(row.amount) : 0,
    type: toType(row.transaction_type),
    confidence: row.confidence != null ? Number(row.confidence) : null,
    status: row.status ?? 'processed',
    note: row.note,
    sourceMessageId: row.metadata?.message_id ?? null,
    emailSubject: row.metadata?.email_subject ?? null,
    clientId: row.client_id ?? null,
    ownerType: toOwnerType(row.owner_type, row.metadata?.business_personal),
  }
}

type AccountIdentityDbRow = {
  id: string
  account_kind: AccountKind
  account_name: string
  institution_name: string
  card_last4: string | null
  account_last4: string | null
  card_network: string | null
  credit_limit: number | string | null
}

export class SupabaseStatementTransactionRepository implements StatementTransactionRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listByStatement(statementId: string): Promise<StatementTransactionRow[]> {
    // `select('*')` deliberately, not an explicit column list: `client_id`
    // (Phase 15) may not exist yet on every deployment, and unlike a view,
    // a base table's `*` just omits an absent column rather than erroring —
    // this keeps the whole list working before that migration is run.
    const { data, error } = await this.client
      .from('statement_transactions')
      .select('*')
      .eq('statement_id', statementId)
      .order('transaction_date', { ascending: false })

    if (error)
      throw new Error(`Failed to load transactions for statement ${statementId}: ${error.message}`)

    return (data ?? []).map((row) => mapRow(row as StatementTransactionDbRow))
  }

  async getAccountIdentity(accountId: string): Promise<StatementAccountIdentity | null> {
    const { data, error } = await this.client
      .from('vw_accounts')
      .select(
        'id, account_kind, account_name, institution_name, card_last4, account_last4, card_network, credit_limit',
      )
      .eq('id', accountId)
      .maybeSingle()

    if (error) throw new Error(`Failed to load account identity for ${accountId}: ${error.message}`)
    if (!data) return null

    const row = data as AccountIdentityDbRow
    return {
      id: row.id,
      kind: row.account_kind,
      accountName: row.account_name,
      institutionName: row.institution_name,
      cardLast4: row.card_last4,
      accountLast4: row.account_last4,
      cardNetwork: row.card_network,
      creditLimit: row.credit_limit != null ? Number(row.credit_limit) : null,
    }
  }

  async updateCategory(id: string, category: string): Promise<void> {
    const { error, count } = await this.client
      .from('statement_transactions')
      .update({ category, category_source: 'manual' }, { count: 'exact' })
      .eq('id', id)

    if (error) throw new Error(`Failed to update category for transaction ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Transaction ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )
  }

  async updateClient(id: string, clientId: string | null): Promise<void> {
    const { error, count } = await this.client
      .from('statement_transactions')
      .update({ client_id: clientId }, { count: 'exact' })
      .eq('id', id)

    if (error) throw new Error(`Failed to update client for transaction ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Transaction ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )
  }

  async updateOwnerType(id: string, ownerType: OwnerType): Promise<void> {
    const { error, count } = await this.client
      .from('statement_transactions')
      .update({ owner_type: ownerType }, { count: 'exact' })
      .eq('id', id)

    if (error)
      throw new Error(`Failed to update owner type for transaction ${id}: ${error.message}`)
    if (!count)
      throw new Error(
        `Transaction ${id} could not be updated — it does not exist, or RLS denied the write.`,
      )
  }
}
