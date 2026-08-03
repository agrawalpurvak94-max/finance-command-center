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
  readonly statementPeriodLabel: string
  readonly fileName: string
  readonly transactionsExtracted: number
  readonly status: StatementStatus
  readonly importedAt: string
  readonly notes: string | null
}

export interface StatementFilters {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly bankName?: string
  readonly accountKind?: AccountKind
  readonly status?: StatementStatus
  readonly clientId?: string
}

export interface StatementSort {
  readonly id: 'statementDate' | 'importedAt' | 'transactionsExtracted'
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
