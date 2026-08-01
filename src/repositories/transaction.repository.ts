import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type {
  Transaction,
  TransactionCreateInput,
  TransactionListParams,
  TransactionListResult,
  TransactionPatch,
} from '@/domain/Transaction'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseTransactionRepository (reading vw_transactions / vw_transaction_search
 * per CLAUDE.md, writing through the existing `transactions` table) and the
 * hooks/components in this module require zero changes.
 */
export interface TransactionRepository {
  list(params: TransactionListParams): Promise<TransactionListResult>
  getById(id: string): Promise<Transaction | null>
  create(input: TransactionCreateInput): Promise<Transaction>
  update(id: string, patch: TransactionPatch): Promise<Transaction>
  bulkUpdate(ids: readonly string[], patch: TransactionPatch): Promise<void>
  delete(id: string): Promise<void>
  bulkDelete(ids: readonly string[]): Promise<void>
  listCategories(): Promise<readonly Category[]>
  listClients(): Promise<readonly Client[]>
  listMerchants(): Promise<readonly Merchant[]>
  listAccounts(): Promise<readonly TransactionAccount[]>
}
