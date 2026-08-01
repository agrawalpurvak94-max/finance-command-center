import type { Merchant } from '@/domain/Merchant'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { TransactionAccount } from '@/domain/Account'

export type TransactionStatus =
  'reviewed' | 'uncategorized' | 'duplicate' | 'flagged' | 'verified' | 'pending_review'

export type OwnerType = 'business' | 'personal'

export type TransactionType = 'debit' | 'credit'

/**
 * Mirrors the eventual `transactions` Supabase table (see CLAUDE.md Part 3 —
 * an existing production table). Field names here are camelCase for the
 * frontend; merchantId/categoryId/clientId/accountId map 1:1 to the table's
 * FK columns. This interface is what MockTransactionRepository and any
 * future SupabaseTransactionRepository both implement identically.
 */
export interface Transaction {
  readonly id: string
  readonly date: string
  readonly merchant: Merchant
  readonly category: Category | null
  readonly client: Client | null
  readonly account: TransactionAccount
  readonly ownerType: OwnerType
  readonly type: TransactionType
  readonly amount: number
  readonly status: TransactionStatus
  readonly notes: string | null
  readonly duplicateOfId: string | null
}

export interface TransactionFilters {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly categoryId?: string
  readonly clientId?: string
  readonly merchantId?: string
  readonly bankAccountId?: string
  readonly creditCardId?: string
  readonly type?: TransactionType
  readonly ownerType?: OwnerType
  readonly status?: TransactionStatus
  readonly amountMin?: number
  readonly amountMax?: number
}

export interface TransactionSort {
  readonly id: 'date' | 'merchant' | 'amount' | 'status'
  readonly desc: boolean
}

export interface TransactionListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: TransactionSort
  readonly filters?: TransactionFilters
}

export interface TransactionListResult {
  readonly rows: readonly Transaction[]
  readonly total: number
}

export interface TransactionPatch {
  readonly categoryId?: string | null
  readonly clientId?: string | null
  readonly merchantId?: string
  readonly ownerType?: OwnerType
  readonly status?: TransactionStatus
  readonly notes?: string | null
}

export interface TransactionCreateInput {
  readonly date: string
  readonly merchantName: string
  readonly accountId: string
  readonly categoryId: string | null
  readonly clientId: string | null
  readonly ownerType: OwnerType
  readonly type: TransactionType
  readonly amount: number
}
