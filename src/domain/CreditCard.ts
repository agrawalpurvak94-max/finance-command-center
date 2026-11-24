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
export const KNOWN_CARD_NETWORKS = ['VISA', 'Mastercard', 'AMEX', 'RuPay'] as const

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
  /** Module 7 (Clients) drill-down target — null for cards not tied to a specific client. */
  readonly clientId: string | null
  /** See `TransactionAccount.accountHolder`'s doc comment in domain/Account.ts. */
  readonly accountHolder: string | null
}

export interface CreditCardFilters {
  readonly bankName?: string
  readonly network?: CardNetwork
  readonly status?: CreditCardRecordStatus
  readonly health?: CreditCardHealth
  readonly clientId?: string
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
  /** See `TransactionAccount.accountHolder`'s doc comment in domain/Account.ts. Optional at creation — null/omitted means genuinely unset, not a guessed value. */
  readonly accountHolder?: string | null
  /**
   * Settings → Credentials fields (`accounts.card_product` /
   * `statement_password` / `account_category` / `currency`). Optional so the
   * existing `CreditCardFormDialog` (which predates Credentials) keeps
   * compiling unchanged — `SupabaseCreditCardRepository.create()` defaults
   * `accountCategory` to `'Personal'` and `currency` to `'INR'` when omitted.
   */
  readonly cardProduct?: string | null
  readonly statementPassword?: string | null
  readonly accountCategory?: 'Personal' | 'Business'
  readonly currency?: string
}

/**
 * Genuinely-nullable variant of the credit-position fields for the
 * Financial Pulse Credit Card drawer. `CreditCardRecord` above intentionally
 * collapses NULL credit_limit/available_credit/card_network to 0/'VISA' as
 * a disclosed display fallback for the Account Statements-style list/tile
 * views — but Financial Pulse's drawer must show "—" for a genuinely
 * unknown value rather than a fabricated ₹0 or a made-up network, so it
 * reads the raw nullable columns instead of reusing that fallback.
 */
export interface CreditCardPosition {
  readonly creditLimit: number | null
  readonly availableCredit: number | null
  readonly utilizationPercent: number | null
  readonly cardNetwork: CardNetwork | null
}

export interface CreditCardUpdateInput {
  readonly nickname: string | null
  readonly status: CreditCardRecordStatus
  readonly notes: string | null
  /** Editable because issuers raise/lower limits as the cardholder's credit score changes. */
  readonly creditLimit: number
}
