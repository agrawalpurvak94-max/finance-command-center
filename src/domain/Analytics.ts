import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type {
  OwnerType,
  PaymentMode,
  TransactionStatus,
  TransactionType,
} from '@/domain/Transaction'
import type { FinancialSnapshotMetric, Trend } from '@/domain/Dashboard'

/**
 * Module 10 (Analytics) domain layer. Mirrors the shape of `TransactionFilters`
 * (`domain/Transaction.ts`) plus the handful of dimensions unique to the
 * Analytics workspace (bank, statement month) so a click-to-cross-filter or a
 * "View Transactions" drill-down can map 1:1 onto the existing Transactions
 * filter/drill-down mechanism without translation.
 */
export type AnalyticsGranularity = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface AnalyticsFilters {
  readonly dateFrom?: string
  readonly dateTo?: string
  readonly categoryId?: string
  readonly clientId?: string
  readonly merchantId?: string
  readonly bankAccountId?: string
  readonly creditCardId?: string
  readonly bankName?: string
  readonly type?: TransactionType
  readonly ownerType?: OwnerType
  readonly paymentMode?: PaymentMode
  readonly status?: TransactionStatus
  readonly amountMin?: number
  readonly amountMax?: number
  /** 'YYYY-MM' — only scopes the Statement-sourced widgets; Transaction has no
   * statement linkage in the current domain model, see MODULE10_REPORT.md. */
  readonly statementMonth?: string
}

export type AnalyticsDimension = keyof AnalyticsFilters

/** A KPI card that can be clicked to cross-filter (see `AnalyticsKpiGrid`). */
export interface AnalyticsKpiMetric extends FinancialSnapshotMetric {
  readonly drillFilter?: Partial<AnalyticsFilters>
}

export interface AnalyticsSummary {
  readonly totalSpend: number
  readonly totalTransactions: number
  readonly averageTransaction: number
  readonly monthlySpend: number
  readonly monthlySpendTrend: Trend | null
  readonly totalIncome: number
  readonly netCashFlow: number
  readonly highestSpendingCategory: { readonly category: Category; readonly amount: number } | null
  readonly highestSpendingMerchant: { readonly merchant: Merchant; readonly amount: number } | null
  readonly mostUsedCard: { readonly account: TransactionAccount; readonly count: number } | null
  readonly mostUsedAccount: { readonly account: TransactionAccount; readonly count: number } | null
}

export interface AnalyticsBucket {
  readonly bucketLabel: string
  readonly bucketStart: string
  readonly bucketEnd: string
}

export interface AnalyticsTrendPoint extends AnalyticsBucket {
  readonly spend: number
  readonly income: number
  readonly cashFlow: number
}

export interface AnalyticsCashFlowPoint extends AnalyticsBucket {
  readonly income: number
  readonly expense: number
  readonly net: number
}

export interface AnalyticsCategorySlice {
  readonly category: Category
  readonly amount: number
  readonly percentage: number
}

/** The one generic row shape every ranked chart list and secondary-analytics
 * table renders — a click merges `drillFilter` into the page's applied
 * filters (cross-filter); "View Transactions" navigates using it (drill-down). */
export interface AnalyticsRankedRow {
  readonly id: string
  readonly label: string
  readonly sublabel?: string
  readonly value: number
  readonly valueLabel: string
  readonly secondaryValue?: number
  readonly secondaryLabel?: string
  readonly trend?: Trend
  readonly drillFilter?: Partial<AnalyticsFilters>
  /** Which page "View Transactions" should navigate to for this row. Defaults
   * to 'transactions' when omitted — only the Statement Processing Status
   * table targets 'statements', per the brief's own "Statement Status →
   * Statements → Status Filter Applied" example. */
  readonly drillTarget?: 'transactions' | 'statements'
}

export interface AnalyticsCardSeriesPoint extends AnalyticsBucket {
  readonly values: Readonly<Record<string, number>>
}

export interface AnalyticsCardSeriesResult {
  readonly points: readonly AnalyticsCardSeriesPoint[]
  readonly cards: readonly { readonly id: string; readonly label: string }[]
}

export interface AnalyticsAccountActivityPoint extends AnalyticsBucket {
  readonly credits: number
  readonly debits: number
  readonly net: number
}

export interface AnalyticsAccountActivityResult {
  readonly points: readonly AnalyticsAccountActivityPoint[]
  readonly byAccount: readonly AnalyticsRankedRow[]
}

export type AnalyticsInsightSeverity = 'good' | 'warning' | 'serious' | 'critical' | 'info'

export interface AnalyticsInsight {
  readonly id: string
  readonly severity: AnalyticsInsightSeverity
  readonly title: string
  readonly description: string
  readonly actionFilter?: Partial<AnalyticsFilters>
}
