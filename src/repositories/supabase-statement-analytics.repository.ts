import type { SupabaseClient } from '@supabase/supabase-js'
import type { StatementTransactionRow } from '@/domain/StatementTransaction'
import type {
  RawMerchantMemoryEntry,
  StatementAnalyticsRepository,
} from '@/repositories/statement-analytics.repository'
import {
  mapRow,
  type StatementTransactionDbRow,
} from '@/repositories/supabase-statement-transaction.repository'

/**
 * Statement Analytics' data access — reads `public.statement_transactions`
 * (via the same row-mapping `supabase-statement-transaction.repository.ts`
 * uses, imported not duplicated) and `public.merchant_memory` for name
 * resolution. Never touches `public.transactions`.
 */

type MerchantMemoryDbRow = {
  id: string
  normalized_merchant: string
  display_name: string | null
}

export class SupabaseStatementAnalyticsRepository implements StatementAnalyticsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async listAllTransactions(statementIds?: readonly string[]): Promise<StatementTransactionRow[]> {
    let query = this.client.from('statement_transactions').select('*')
    if (statementIds && statementIds.length > 0) query = query.in('statement_id', statementIds)
    const { data, error } = await query.order('transaction_date', { ascending: false })

    if (error) throw new Error(`Failed to load statement transactions: ${error.message}`)
    return (data ?? []).map((row) => mapRow(row as StatementTransactionDbRow))
  }

  async listMerchantMemory(): Promise<RawMerchantMemoryEntry[]> {
    const { data, error } = await this.client
      .from('merchant_memory')
      .select('id, normalized_merchant, display_name')

    if (error) throw new Error(`Failed to load merchant memory: ${error.message}`)

    return (data ?? []).map((row) => {
      const r = row as MerchantMemoryDbRow
      return {
        id: r.id,
        normalizedMerchant: r.normalized_merchant,
        displayName: r.display_name ?? r.normalized_merchant,
      }
    })
  }
}
