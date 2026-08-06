import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'

export interface Client {
  readonly id: string
  readonly name: string
}

/**
 * Module 7 (Clients) additions below. `Client` itself is left untouched —
 * it's already embedded in `Transaction.client`/`Statement.client` and
 * returned by `TransactionRepository.listClients()`, so widening it would
 * force every transaction/statement snapshot to carry Clients-module-only
 * aggregate fields that don't belong on a per-row reference. `ClientRecord`
 * is the full master-data row this module reads/writes, mirroring how
 * `domain/Merchant.ts`'s `MerchantRecord` relates to `Merchant`.
 *
 * A Client here represents an owner of financial activity (Personal, Family
 * Member, Company, Business Unit, Trust) — this is a financial client
 * management module, not a CRM.
 */
export type ClientType = 'personal' | 'family_member' | 'company' | 'business_unit' | 'trust'
export type ClientRecordStatus = 'active' | 'pending' | 'suspended'

export interface ClientCategorySpend {
  readonly category: Category
  readonly totalSpend: number
}

export interface ClientMerchantSpend {
  readonly merchant: Merchant
  readonly totalSpend: number
}

export interface ClientRecord {
  readonly id: string
  readonly name: string
  readonly clientType: ClientType
  readonly company: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly status: ClientRecordStatus
  readonly notes: string | null
  readonly totalSpend: number
  readonly transactionCount: number
  readonly linkedAccountsCount: number
  readonly linkedCreditCardsCount: number
  readonly linkedStatementsCount: number
  readonly topCategories: readonly ClientCategorySpend[]
  readonly topMerchants: readonly ClientMerchantSpend[]
  readonly firstTransactionAt: string | null
  readonly lastTransactionAt: string | null
  readonly createdAt: string
}

export interface ClientFilters {
  readonly clientType?: ClientType
  readonly status?: ClientRecordStatus
  readonly categoryId?: string
  readonly dateAddedFrom?: string
  readonly dateAddedTo?: string
}

export interface ClientSort {
  readonly id: 'name' | 'totalSpend' | 'transactionCount' | 'createdAt'
  readonly desc: boolean
}

export interface ClientListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: ClientSort
  readonly filters?: ClientFilters
}

export interface ClientListResult {
  readonly rows: readonly ClientRecord[]
  readonly total: number
}

export interface ClientSummary {
  readonly totalClients: number
  readonly totalSpend: number
  readonly clientsRequiringReview: number
  readonly activeClients: number
}

export interface ClientCreateInput {
  readonly name: string
  readonly clientType: ClientType
  readonly company: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly status: ClientRecordStatus
  readonly notes: string | null
}

export interface ClientUpdateInput {
  readonly name: string
  readonly company: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly status: ClientRecordStatus
  readonly notes: string | null
}
