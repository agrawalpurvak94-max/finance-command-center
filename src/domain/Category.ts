export interface Category {
  readonly id: string
  readonly name: string
}

/**
 * Module 5 (Categories) additions below. `Category` itself is left
 * untouched — it's already embedded in `Transaction.category` and returned
 * by `TransactionRepository.listCategories()`, so widening it would force
 * every transaction snapshot to carry Categories-module-only fields
 * (transaction/merchant counts) that don't belong on a per-transaction
 * reference. `CategoryRecord` is the full master-data row this module reads
 * and writes; it embeds the lightweight `Category` for its parent link,
 * the same way `Statement` embeds `TransactionAccount`.
 */
export type CategoryStatus = 'active' | 'inactive'

export const CATEGORY_COLORS = [
  'primary',
  'tertiary',
  'emerald',
  'blue',
  'amber',
  'rose',
  'violet',
] as const

export type CategoryColor = (typeof CATEGORY_COLORS)[number]

export interface CategoryRecord {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly parentCategory: Category | null
  readonly status: CategoryStatus
  readonly color: CategoryColor
  readonly icon: string
  readonly transactionCount: number
  readonly merchantsAssigned: number
  readonly lastUpdatedAt: string
}

export interface CategoryFilters {
  readonly status?: CategoryStatus
  readonly parentCategoryId?: string
  readonly minTransactionCount?: number
  readonly maxTransactionCount?: number
}

export interface CategorySort {
  readonly id: 'name' | 'transactionCount' | 'merchantsAssigned' | 'lastUpdatedAt'
  readonly desc: boolean
}

export interface CategoryListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: CategorySort
  readonly filters?: CategoryFilters
}

export interface CategoryListResult {
  readonly rows: readonly CategoryRecord[]
  readonly total: number
}

export interface CategorySummary {
  readonly total: number
  readonly active: number
  readonly inactive: number
  readonly uncategorizedTransactions: number
}

export interface CategoryCreateInput {
  readonly name: string
  readonly description: string
  readonly parentCategoryId: string | null
  readonly status: CategoryStatus
  readonly color: CategoryColor
}

export interface CategoryUpdateInput {
  readonly name: string
  readonly description: string
  readonly parentCategoryId: string | null
  readonly status: CategoryStatus
  readonly color: CategoryColor
}
