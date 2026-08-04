export interface Merchant {
  readonly id: string
  readonly name: string
}

/**
 * Module 6 (Merchants) additions below. `Merchant` itself is left
 * untouched — it's already embedded in `Transaction.merchant` and returned
 * by `TransactionRepository.listMerchants()`, so widening it would force
 * every transaction snapshot to carry Merchants-module-only aggregate
 * fields (spend/transaction counts) that don't belong on a per-transaction
 * reference. `MerchantRecord` is the full master-data row this module reads
 * and writes, mirroring how `domain/Category.ts`'s `CategoryRecord` relates
 * to `Category`.
 */
import type { Category } from '@/domain/Category'

export type MerchantStatus = 'active' | 'inactive'

export interface MerchantRecord {
  readonly id: string
  readonly name: string
  readonly aliases: readonly string[]
  readonly defaultCategory: Category | null
  readonly status: MerchantStatus
  readonly notes: string | null
  readonly hasRules: boolean
  readonly transactionCount: number
  readonly totalSpend: number
  readonly averageTransaction: number
  readonly lastTransactionAt: string | null
}

export interface MerchantFilters {
  readonly categoryId?: string
  readonly status?: MerchantStatus
  readonly hasRules?: boolean
  readonly minTransactionCount?: number
  readonly maxTransactionCount?: number
}

export interface MerchantSort {
  readonly id:
    'name' | 'transactionCount' | 'totalSpend' | 'averageTransaction' | 'lastTransactionAt'
  readonly desc: boolean
}

export interface MerchantListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: MerchantSort
  readonly filters?: MerchantFilters
}

export interface MerchantListResult {
  readonly rows: readonly MerchantRecord[]
  readonly total: number
}

export interface MerchantSummary {
  readonly total: number
  readonly active: number
  readonly uncategorized: number
  readonly totalSpend: number
  readonly transactionsThisMonth: number
}

export interface MerchantCreateInput {
  readonly name: string
  readonly defaultCategoryId: string | null
  readonly status: MerchantStatus
  readonly notes: string | null
}

export interface MerchantUpdateInput {
  readonly name: string
  readonly defaultCategoryId: string | null
  readonly status: MerchantStatus
  readonly notes: string | null
}
