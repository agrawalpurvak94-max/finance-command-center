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

/** One row of the due-date insights list — every card sharing this exact due date, combined. */
export interface CreditCardDueDateInsight {
  readonly dueDate: string
  readonly amount: number
  /** e.g. "₹42,500 due by 25th of the month." — see `getCreditCardDueDateInsights`. */
  readonly label: string
}
