import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { queryKeys } from '@/lib/queryKeys'
import { analyticsService } from '@/services/analytics.service'
import type { AnalyticsFilters, AnalyticsGranularity } from '@/domain/Analytics'

/** One `useQuery` per repository method, mirroring `useDashboard.ts` — every
 * widget on the Analytics page gets its own loading/error boundary instead of
 * one page-wide spinner, and only the widgets whose data actually depends on
 * a changed filter dimension refetch (TanStack Query dedupes by key). */
export function useAnalytics(filters: AnalyticsFilters, granularity: AnalyticsGranularity) {
  const placeholderData = keepPreviousData

  const summary = useQuery({
    queryKey: queryKeys.analytics.summary(filters),
    queryFn: () => analyticsService.getSummary(filters),
    placeholderData,
  })

  const spendTrend = useQuery({
    queryKey: queryKeys.analytics.spendTrend(filters, granularity),
    queryFn: () => analyticsService.getSpendTrend(filters, granularity),
    placeholderData,
  })

  const cashFlow = useQuery({
    queryKey: queryKeys.analytics.cashFlow(filters),
    queryFn: () => analyticsService.getCashFlow(filters),
    placeholderData,
  })

  const categorySpend = useQuery({
    queryKey: queryKeys.analytics.categorySpend(filters),
    queryFn: () => analyticsService.getCategorySpend(filters),
    placeholderData,
  })

  const merchantSpend = useQuery({
    queryKey: queryKeys.analytics.merchantSpend(filters),
    queryFn: () => analyticsService.getMerchantSpend(filters),
    placeholderData,
  })

  const clientSpend = useQuery({
    queryKey: queryKeys.analytics.clientSpend(filters),
    queryFn: () => analyticsService.getClientSpend(filters),
    placeholderData,
  })

  const creditCardSpend = useQuery({
    queryKey: queryKeys.analytics.creditCardSpend(filters),
    queryFn: () => analyticsService.getCreditCardSpend(filters),
    placeholderData,
  })

  const bankAccountActivity = useQuery({
    queryKey: queryKeys.analytics.bankAccountActivity(filters),
    queryFn: () => analyticsService.getBankAccountActivity(filters),
    placeholderData,
  })

  const highestTransactions = useQuery({
    queryKey: queryKeys.analytics.highestTransactions(filters),
    queryFn: () => analyticsService.getHighestTransactions(filters),
    placeholderData,
  })

  const recurringMerchants = useQuery({
    queryKey: queryKeys.analytics.recurringMerchants(filters),
    queryFn: () => analyticsService.getRecurringMerchants(filters),
    placeholderData,
  })

  const largestExpenses = useQuery({
    queryKey: queryKeys.analytics.largestExpenses(filters),
    queryFn: () => analyticsService.getLargestExpenses(filters),
    placeholderData,
  })

  const refundAnalysis = useQuery({
    queryKey: queryKeys.analytics.refundAnalysis(filters),
    queryFn: () => analyticsService.getRefundAnalysis(filters),
    placeholderData,
  })

  const statementProcessingStatus = useQuery({
    queryKey: queryKeys.analytics.statementProcessingStatus(filters),
    queryFn: () => analyticsService.getStatementProcessingStatus(filters),
    placeholderData,
  })

  const insights = useQuery({
    queryKey: queryKeys.analytics.insights(filters),
    queryFn: () => analyticsService.getInsights(filters),
    placeholderData,
  })

  return {
    summary,
    spendTrend,
    cashFlow,
    categorySpend,
    merchantSpend,
    clientSpend,
    creditCardSpend,
    bankAccountActivity,
    highestTransactions,
    recurringMerchants,
    largestExpenses,
    refundAnalysis,
    statementProcessingStatus,
    insights,
  }
}

export function useAnalyticsBankNames() {
  return useQuery({
    queryKey: queryKeys.analytics.bankNames,
    queryFn: () => analyticsService.listBankNames(),
  })
}
