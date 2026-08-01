export type TrendDirection = 'up' | 'down' | 'flat'
export type TrendTone = 'positive' | 'negative' | 'neutral'

export interface Trend {
  readonly direction: TrendDirection
  readonly label: string
  readonly tone: TrendTone
}

export interface FinancialSnapshotMetric {
  readonly id: string
  readonly label: string
  readonly value: number
  readonly trend?: Trend
  readonly warningLabel?: string
}

export type ResolutionReason = 'uncategorized' | 'missing_gst' | 'tag_required'

export interface ResolutionQueueItem {
  readonly id: string
  readonly reason: ResolutionReason
  readonly reasonLabel: string
  readonly description: string
  readonly amount: number
  readonly flaggedOnLabel: string
}

/**
 * A simplified 3-state indicator for the Dashboard's "Recent Transactions"
 * widget only — intentionally distinct from `Transaction.ts`'s
 * `TransactionStatus` (the full 6-state ledger lifecycle). Renamed from a
 * previously same-named type that collided with the canonical one; see
 * ARCHITECTURE_AUDIT.md for why they were never actually the same concept.
 */
export type RecentTransactionStatus = 'processed' | 'pending' | 'flagged'

export interface RecentTransaction {
  readonly id: string
  readonly dateLabel: string
  readonly merchant: string
  readonly category: string
  readonly amount: number
  readonly status: RecentTransactionStatus
}

export interface QuickAction {
  readonly id: string
  readonly label: string
  readonly href: string
}
