import type { CardNetwork } from '@/domain/CreditCard'
import type { Merchant } from '@/domain/Merchant'
import type { Category } from '@/domain/Category'

/**
 * Shared account vocabulary used by Transactions (Module 3), Dashboard
 * (Module 2), and the future Accounts/Credit Cards modules alike.
 * Previously duplicated verbatim in `types/transaction.ts` and
 * `types/dashboard.ts` — consolidated here as the single source of truth.
 */
export type AccountKind = 'bank' | 'credit_card'
export type AccountStatus = 'active' | 'syncing' | 'urgent'

/** Compact account reference embedded in a transaction row. */
export interface TransactionAccount {
  readonly id: string
  readonly kind: AccountKind
  readonly bankName: string
  readonly cardNetwork?: CardNetwork
  readonly last4: string
}

/** Richer account summary shape used by the Dashboard's account/credit-card cards. */
export interface ConnectedAccount {
  readonly id: string
  readonly kind: AccountKind
  readonly name: string
  readonly maskedNumber: string
  readonly balance: number
  readonly status: AccountStatus
  readonly lastSyncedLabel?: string
  readonly inflow?: number
  readonly outflow?: number
  readonly dueDate?: string
  readonly dueAmount?: number
  readonly dailyAverage?: number
}

/**
 * Module 8 (Accounts) additions below — the full master-data row for a bank
 * account, distinct from the lightweight `TransactionAccount` reference
 * embedded in Transaction/Statement rows. Shares the same `id` space as
 * `mockBankAccounts` in `repositories/mock-data/reference-data.ts` so that
 * Transactions' `bankAccountId` filter and Statements' `accountId` filter
 * resolve to the exact same account this module manages — one identity per
 * account across the app, per CLAUDE.md's "never duplicate business logic".
 */
export type BankAccountType = 'savings' | 'current' | 'overdraft'
export type BankAccountRecordStatus = 'active' | 'inactive'
export type BankAccountHealth = 'healthy' | 'low_balance' | 'sync_required' | 'needs_review'

export interface BankAccountRecord {
  readonly id: string
  readonly bankName: string
  readonly accountName: string
  readonly nickname: string | null
  readonly accountType: BankAccountType
  readonly last4: string
  readonly maskedAccountNumber: string
  readonly currentBalance: number
  readonly availableBalance: number
  readonly monthlyCredits: number
  readonly monthlyDebits: number
  readonly topMerchant: Merchant | null
  readonly topCategory: Category | null
  readonly recentActivityCount: number
  readonly lastSyncAt: string
  readonly lastTransactionAt: string | null
  readonly health: BankAccountHealth
  readonly status: BankAccountRecordStatus
  readonly notes: string | null
}

export interface BankAccountFilters {
  readonly bankName?: string
  readonly accountType?: BankAccountType
  readonly status?: BankAccountRecordStatus
  readonly health?: BankAccountHealth
}

export interface BankAccountSort {
  readonly id: 'bankName' | 'accountName' | 'currentBalance' | 'availableBalance' | 'lastSyncAt'
  readonly desc: boolean
}

export interface BankAccountListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: BankAccountSort
  readonly filters?: BankAccountFilters
}

export interface BankAccountListResult {
  readonly rows: readonly BankAccountRecord[]
  readonly total: number
}

export interface BankAccountSummary {
  readonly totalBankAccounts: number
  readonly totalCurrentBalance: number
  readonly totalAvailableBalance: number
  readonly statementsImportedThisMonth: number
}

export interface BankAccountCreateInput {
  readonly bankName: string
  readonly accountType: BankAccountType
  readonly accountName: string
  readonly nickname: string | null
  readonly accountNumber: string
  readonly openingBalance: number
  readonly status: BankAccountRecordStatus
}

export interface BankAccountUpdateInput {
  readonly nickname: string | null
  readonly status: BankAccountRecordStatus
  readonly notes: string | null
}
