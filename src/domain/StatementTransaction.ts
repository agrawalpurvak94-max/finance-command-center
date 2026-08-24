import type { AccountKind } from '@/domain/Account'
import type { Statement } from '@/domain/Statement'
import type { OwnerType } from '@/domain/Transaction'

/**
 * Statement Explorer (Statements module, Tab 2) — transaction-level rows
 * extracted from ONE statement, read from `public.statement_transactions`
 * only. Deliberately separate from `domain/Transaction.ts` (the global
 * `transactions` ledger) — these are two different tables with no reliable
 * shared row identity; see `StatementTransactionRow.id`'s doc comment.
 */
export type StatementTransactionType = 'debit' | 'credit'

export interface StatementTransactionRow {
  readonly id: string
  readonly statementId: string
  readonly date: string
  readonly merchant: string
  readonly normalizedMerchant: string | null
  readonly rawDescription: string | null
  readonly category: string | null
  readonly categorySource: string | null
  readonly amount: number
  readonly type: StatementTransactionType
  /** 0-100. Null if the parser genuinely didn't record one. */
  readonly confidence: number | null
  readonly status: string
  readonly note: string | null
  /**
   * `statement_transactions.client_id` — added via DATABASE_MIGRATIONS.sql
   * Phase 15 (a real FK to `clients.id`, unlike `category` which is free
   * text). Null both when genuinely unassigned and, gracefully, before that
   * migration has been run (the repository selects `*`, so a not-yet-
   * existing column just doesn't appear in the row rather than erroring).
   */
  readonly clientId: string | null
  /**
   * Resolved Business/Personal classification — `owner_type` (Phase 16) if
   * a user has explicitly set it, else the parser's own
   * `metadata.business_personal`, else `'personal'` (the same last-resort
   * default `transactions.type` uses). Never null — matches
   * `Transaction.ownerType`'s always-resolved contract.
   */
  readonly ownerType: OwnerType
  /** From `metadata.message_id` — the source email this row was extracted from, where available. */
  readonly sourceMessageId: string | null
  /** From `metadata.email_subject`. */
  readonly emailSubject: string | null
}

export interface StatementTransactionFilters {
  readonly search?: string
  readonly category?: string
  readonly type?: StatementTransactionType
  /** `category_source` — how the category was assigned (e.g. 'ai'). */
  readonly categorySource?: string
  readonly status?: string
  readonly confidenceTier?: 'high' | 'medium' | 'low'
  readonly clientId?: string
  readonly ownerType?: OwnerType
  /** Only meaningful in "All Statements" mode (`/statements/explorer`) — a single-statement view is already date-bounded by its own statement period. */
  readonly dateFrom?: string
  readonly dateTo?: string
}

/**
 * Raw account-identity fields for the Statement Explorer summary panel.
 * `cardLast4`/`accountLast4` are read separately and never coalesced — per
 * explicit instruction, a credit card's identity must use `card_last4` and
 * a bank account's must use `account_last4`, never the other, never a
 * merged/"resolved" fallback (that's `vw_accounts.resolved_last4`, used
 * elsewhere in the app for lightweight display only, not here).
 */
export interface StatementAccountIdentity {
  readonly id: string
  readonly kind: AccountKind
  readonly accountName: string
  readonly institutionName: string
  readonly cardLast4: string | null
  readonly accountLast4: string | null
  readonly cardNetwork: string | null
  readonly creditLimit: number | null
}

/** One entry in the Statement Explorer's top statement-selector dropdown. */
export interface StatementSelectorOption {
  readonly id: string
  readonly label: string
}

/** Composed data for the Statement Explorer's summary panel. */
export interface StatementExplorerDetail {
  readonly statement: Statement
  readonly accountName: string
  /** `card_last4` for a credit card, `account_last4` for a bank account — never coalesced. Null if genuinely unavailable. */
  readonly last4: string | null
  readonly cardNetwork: string | null
  /** Credit-card-only; null for bank accounts. */
  readonly creditLimit: number | null
  /** Credit-card-only, derived as Credit Limit − this statement's Total Amount Due; null when either input is unavailable. */
  readonly availableCredit: number | null
}
