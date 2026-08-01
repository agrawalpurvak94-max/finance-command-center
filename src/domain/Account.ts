import type { CardNetwork } from '@/domain/CreditCard'

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
