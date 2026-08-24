import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { statementAnalyticsService } from '@/services/statement-analytics.service'
import type { AnalyticsGranularity } from '@/domain/Analytics'
import type { StatementAnalyticsFilters } from '@/domain/StatementAnalytics'

/** One `useQuery` per aggregation, mirroring `useAnalytics.ts` (Module 10) — every widget gets its own loading boundary. */
export function useStatementAnalytics(
  filters: StatementAnalyticsFilters,
  granularity: AnalyticsGranularity,
) {
  const placeholderData = keepPreviousData

  const summary = useQuery({
    queryKey: ['statement-analytics', 'summary', filters],
    queryFn: () => statementAnalyticsService.getSummary(filters),
    placeholderData,
  })

  const spendTrend = useQuery({
    queryKey: ['statement-analytics', 'spend-trend', filters, granularity],
    queryFn: () => statementAnalyticsService.getSpendTrend(filters, granularity),
    placeholderData,
  })

  const ownerTypeSpend = useQuery({
    queryKey: ['statement-analytics', 'owner-type-spend', filters],
    queryFn: () => statementAnalyticsService.getOwnerTypeSpend(filters),
    placeholderData,
  })

  const categorySpend = useQuery({
    queryKey: ['statement-analytics', 'category-spend', filters],
    queryFn: () => statementAnalyticsService.getCategorySpend(filters),
    placeholderData,
  })

  const merchantSpend = useQuery({
    queryKey: ['statement-analytics', 'merchant-spend', filters],
    queryFn: () => statementAnalyticsService.getMerchantSpend(filters),
    placeholderData,
  })

  const clientSpend = useQuery({
    queryKey: ['statement-analytics', 'client-spend', filters],
    queryFn: () => statementAnalyticsService.getClientSpend(filters),
    placeholderData,
  })

  return { summary, spendTrend, ownerTypeSpend, categorySpend, merchantSpend, clientSpend }
}
