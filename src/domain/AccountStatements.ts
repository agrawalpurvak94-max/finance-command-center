import type { AccountKind } from '@/domain/Account'

/**
 * Account Statements (unified Credit Cards + Financial Accounts statement
 * analysis, Module 12B follow-up). Deliberately NOT `ConnectedAccount`
 * (Financial Pulse's real-time shape) or `CreditCardRecord`/`BankAccountRecord`
 * (the old real-time-oriented per-module shapes) — every field here is
 * statement-derived or null, never computed from live `transactions`.
 */
export type AccountStatementType = 'Credit Card' | 'Savings' | 'Current' | 'Overdraft'

export interface AccountStatementTile {
  readonly id: string
  readonly kind: AccountKind
  readonly accountType: AccountStatementType
  readonly name: string
  readonly institutionName: string
  readonly maskedNumber: string
  /** Credit cards only (e.g. "Diners Black") — always null for bank accounts, and null when unset in Supabase. Sourced from `accounts.card_product` via `CreditCardRepository.listCredentials()` — never `vw_accounts`, which doesn't project this column. See `domain/Credential.ts`. */
  readonly cardProduct: string | null
  /** See `TransactionAccount.accountHolder`'s doc comment in domain/Account.ts. */
  readonly accountHolder: string | null
  readonly hasStatement: boolean
  readonly statementId: string | null
  readonly statementPeriodLabel: string | null
  readonly statementDate: string | null
  readonly dueDate: string | null
  readonly totalDebits: number | null
  readonly totalCredits: number | null
  readonly closingBalance: number | null
  readonly minimumDue: number | null
  readonly statementTotalAmountDue: number | null
  readonly transactionsExtracted: number
}

export interface AccountStatementsSummary {
  readonly totalAccounts: number
  readonly statementsAvailable: number
  readonly latestStatementSpend: number
  readonly latestStatementInflow: number
}

/**
 * Consolidated credit-card payment position — derived from the SAME
 * `AccountStatementTile[]` the tile grid already renders (one latest
 * statement per card, never re-summed across a card's older statements), so
 * this can never double-count a card that has multiple statements. See
 * `getCreditCardPaymentSummary` in `account-statements.service.ts`.
 */
export interface CreditCardPaymentSummary {
  readonly totalAmountDue: number
  readonly minimumAmountDue: number
  /** Earliest outstanding due date among the included cards — NOT the date the whole total is due; different cards can have later due dates. Null when no included card has a due date. */
  readonly nextDueDate: string | null
  readonly cardsWithDue: number
}

/**
 * One upcoming card payment — a single card's own next due amount, never
 * merged with another card's. See `getUpcomingCardPayments`.
 */
export interface UpcomingCardPayment {
  readonly tileId: string
  readonly name: string
  readonly institutionName: string
  readonly maskedNumber: string
  /** See `AccountStatementTile.cardProduct`'s doc comment. */
  readonly cardProduct: string | null
  readonly amount: number
  readonly dueDate: string
  /** Negative when overdue, 0 when due today — computed against the viewer's local calendar date. */
  readonly daysRemaining: number
}
