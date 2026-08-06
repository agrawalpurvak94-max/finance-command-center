import type {
  AnalyticsAccountActivityResult,
  AnalyticsCardSeriesResult,
  AnalyticsCategorySlice,
  AnalyticsFilters,
  AnalyticsGranularity,
  AnalyticsInsight,
  AnalyticsOwnerTypePoint,
  AnalyticsRankedRow,
  AnalyticsSummary,
  AnalyticsTrendPoint,
} from '@/domain/Analytics'

/**
 * Every method stands in for a future Supabase SQL view/RPC (see CLAUDE.md
 * Part 3 — "REQUIRED SQL VIEWS" / Analytics). `MockAnalyticsRepository` is
 * the only implementation until Module 12A swaps it for a Supabase-backed
 * one behind `analytics.service.ts` — this interface is the contract that
 * swap must satisfy unchanged.
 */
export interface AnalyticsRepository {
  getSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary>
  getSpendTrend(
    filters: AnalyticsFilters,
    granularity: AnalyticsGranularity,
  ): Promise<readonly AnalyticsTrendPoint[]>
  getOwnerTypeSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsOwnerTypePoint[]>
  getCategorySpend(filters: AnalyticsFilters): Promise<readonly AnalyticsCategorySlice[]>
  getMerchantSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getClientSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getCreditCardSpend(filters: AnalyticsFilters): Promise<AnalyticsCardSeriesResult>
  getBankAccountActivity(filters: AnalyticsFilters): Promise<AnalyticsAccountActivityResult>
  getHighestTransactions(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getRecurringMerchants(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getLargestExpenses(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getRefundAnalysis(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]>
  getInsights(filters: AnalyticsFilters): Promise<readonly AnalyticsInsight[]>
  listBankNames(): Promise<readonly string[]>
}
