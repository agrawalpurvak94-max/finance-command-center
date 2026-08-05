import type { Merchant } from '@/domain/Merchant'
import type { Category } from '@/domain/Category'

/**
 * Credit cards are modeled in Transaction/Statement rows as
 * `Account.TransactionAccount` / `ConnectedAccount` records with
 * `kind: 'credit_card'`. This file holds the credit-card-specific vocabulary
 * that already existed in the mock data (see
 * `repositories/mock-data/reference-data.ts`), plus (below) the full
 * master-data row Module 9 (Credit Cards) reads and writes.
 */
export const KNOWN_CARD_NETWORKS = ['VISA', 'Mastercard', 'AMEX'] as const

export type CardNetwork = (typeof KNOWN_CARD_NETWORKS)[number]

/**
 * Module 9 (Credit Cards) additions below. Shares the same `id` space as
 * `mockCreditCards` in `repositories/mock-data/reference-data.ts` so that
 * Transactions' `creditCardId` filter and Statements' `accountId` filter
 * resolve to the exact same card this module manages.
 */
export type CreditCardRecordStatus = 'active' | 'inactive'
export type CreditCardHealth = 'healthy' | 'due_soon' | 'high_utilization' | 'payment_overdue'

export interface CreditCardRecord {
  readonly id: string
  readonly bankName: string
  readonly cardName: string
  readonly nickname: string | null
  readonly network: CardNetwork
  readonly last4: string
  readonly maskedNumber: string
  readonly creditLimit: number
  readonly outstanding: number
  readonly availableCredit: number
  readonly utilizationPercent: number
  readonly statementDate: string
  readonly dueDate: string
  readonly minimumDue: number
  readonly monthlySpend: number
  readonly topMerchant: Merchant | null
  readonly topCategory: Category | null
  readonly lastTransactionAt: string | null
  readonly health: CreditCardHealth
  readonly status: CreditCardRecordStatus
  readonly notes: string | null
}

export interface CreditCardFilters {
  readonly bankName?: string
  readonly network?: CardNetwork
  readonly status?: CreditCardRecordStatus
  readonly health?: CreditCardHealth
}

export interface CreditCardSort {
  readonly id: 'bankName' | 'cardName' | 'outstanding' | 'utilizationPercent' | 'dueDate'
  readonly desc: boolean
}

export interface CreditCardListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: CreditCardSort
  readonly filters?: CreditCardFilters
}

export interface CreditCardListResult {
  readonly rows: readonly CreditCardRecord[]
  readonly total: number
}

export interface CreditCardSummary {
  readonly totalCreditCards: number
  readonly totalCreditLimit: number
  readonly totalOutstanding: number
  readonly totalAvailableCredit: number
  readonly statementsImportedThisMonth: number
}

export interface CreditCardCreateInput {
  readonly bankName: string
  readonly cardName: string
  readonly network: CardNetwork
  readonly last4: string
  readonly creditLimit: number
  readonly statementDate: string
  readonly dueDate: string
  readonly status: CreditCardRecordStatus
}

export interface CreditCardUpdateInput {
  readonly nickname: string | null
  readonly status: CreditCardRecordStatus
  readonly notes: string | null
}
