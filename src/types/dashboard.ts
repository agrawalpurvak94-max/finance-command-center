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

export type AccountKind = 'bank' | 'credit_card'
export type AccountStatus = 'active' | 'syncing' | 'urgent'

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

export type ResolutionReason = 'uncategorized' | 'missing_gst' | 'tag_required'

export interface ResolutionQueueItem {
  readonly id: string
  readonly reason: ResolutionReason
  readonly reasonLabel: string
  readonly description: string
  readonly amount: number
  readonly flaggedOnLabel: string
}

export type TransactionStatus = 'processed' | 'pending' | 'flagged'

export interface RecentTransaction {
  readonly id: string
  readonly dateLabel: string
  readonly merchant: string
  readonly category: string
  readonly amount: number
  readonly status: TransactionStatus
}

export interface QuickAction {
  readonly id: string
  readonly label: string
  readonly href: string
}
