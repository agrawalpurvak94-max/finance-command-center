import type { AccountKind, TransactionAccount } from '@/domain/Account'
import type { Client } from '@/domain/Client'

/**
 * Module 5 (Statements) is now implemented — this file replaces the empty
 * placeholder scaffolded during the pre-Module-4 domain architecture pass.
 * Deliberately excludes OCR/AI-review concepts (worker health, extraction
 * confidence, template detection) per the Module 4 spec — those belong to a
 * future AI Review module, not to Statements.
 */
export type StatementStatus = 'imported' | 'processing' | 'processed' | 'failed' | 'pending_review'

export interface Statement {
  readonly id: string
  readonly account: TransactionAccount
  readonly client: Client | null
  readonly statementDate: string
  /**
   * `statements.statement_period_start` — the statement cycle's opening
   * date. Exposed alongside `statementPeriodEnd` so Statement Control's
   * drawer can edit the period as two discrete dates; `statementPeriodLabel`
   * remains the display-only combined string built from both.
   */
  readonly statementPeriodStart: string | null
  /**
   * The statement cycle's closing date (`statements.statement_period_end`).
   * Added for Financial Pulse's credit-card period logic — `statementDate`
   * (`statements.statement_date`) is never populated by Workflow D on live
   * data, confirmed empirically; this field is. Null when the statement
   * genuinely doesn't have one.
   */
  readonly statementPeriodEnd: string | null
  readonly statementPeriodLabel: string
  readonly fileName: string
  readonly transactionsExtracted: number
  readonly status: StatementStatus
  readonly importedAt: string
  readonly notes: string | null
  /**
   * Statement-level financial fields for Account Statements (Module 12B
   * follow-up) — all direct reads of `statements` columns, never derived.
   * `dueDate`/`totalDebits`/`totalCredits`/etc. are null when the parser
   * genuinely didn't populate them (e.g. no due date on a savings
   * statement) — never fabricated or defaulted to 0/today.
   */
  readonly dueDate: string | null
  readonly totalDebits: number | null
  readonly totalCredits: number | null
  readonly openingBalance: number | null
  readonly closingBalance: number | null
  readonly minimumDue: number | null
  readonly statementTotalAmountDue: number | null
}

export interface StatementFilters {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly bankName?: string
  readonly accountKind?: AccountKind
  readonly status?: StatementStatus
  readonly clientId?: string
  /** Drill-down filter from Accounts (Module 8) / Credit Cards (Module 9) "View All Statements". */
  readonly accountId?: string
  /** See `TransactionAccount.accountHolder`'s doc comment in domain/Account.ts. */
  readonly accountHolder?: string
}

export interface StatementSort {
  readonly id: 'statementDate' | 'statementPeriodEnd' | 'importedAt' | 'transactionsExtracted'
  readonly desc: boolean
}

export interface StatementListParams {
  readonly page: number
  readonly pageSize: number
  readonly search?: string
  readonly sort?: StatementSort
  readonly filters?: StatementFilters
}

export interface StatementListResult {
  readonly rows: readonly Statement[]
  readonly total: number
}

export interface StatementSummary {
  readonly total: number
  readonly processed: number
  readonly processing: number
  readonly failed: number
  readonly pendingReview: number
}

export interface StatementCreateInput {
  readonly accountId: string
  readonly statementPeriodLabel: string
  readonly fileName: string
}

/**
 * Statement Control drawer's metadata edit (Statement Date / Statement
 * Period Start / Statement Period End) — a narrow write against the same
 * `statements` row `reprocess`/`delete` already target. Does not touch
 * `processing_status`, `account_id`, or any extracted-transaction data.
 * `null` clears the column; a field's current value is preserved by passing
 * it back unchanged, matching the "full replacement, not a merge" pattern
 * `BankAccountUpdateInput`/`CreditCardUpdateInput` already use.
 */
export interface StatementUpdateInput {
  readonly statementDate: string | null
  readonly statementPeriodStart: string | null
  readonly statementPeriodEnd: string | null
}
