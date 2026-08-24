import type { StatementTransactionRow } from '@/domain/StatementTransaction'

/** Raw `merchant_memory` row — used only to resolve statement_transactions' free-text merchant names against the real master table. */
export interface RawMerchantMemoryEntry {
  readonly id: string
  readonly normalizedMerchant: string
  readonly displayName: string
}

/**
 * Statement Analytics' own data access — deliberately separate from
 * `StatementTransactionRepository` (which is scoped to "one statement's
 * transactions", Explorer's concern) since this reads across every
 * statement the user has. Never touches `public.transactions`.
 */
export interface StatementAnalyticsRepository {
  /** Every statement_transactions row for the user, optionally narrowed to specific statement ids. RLS-scoped, so this is never cross-user. */
  listAllTransactions(statementIds?: readonly string[]): Promise<StatementTransactionRow[]>
  /** Raw merchant_memory rows for name resolution — see RawMerchantMemoryEntry. */
  listMerchantMemory(): Promise<RawMerchantMemoryEntry[]>
}
