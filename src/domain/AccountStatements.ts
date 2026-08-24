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
