import type { UseQueryResult } from '@tanstack/react-query'
import { Store } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { MerchantSummary } from '@/domain/Merchant'

interface MerchantSummaryWidgetProps {
  query: UseQueryResult<MerchantSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

// Total Spend is the only currency-valued card in this row — the rest are
// plain counts, so each KPICard below gets its own formatValue rather than
// mapping one formatter across all metrics (unlike Statements'/Categories'
// summary widgets, which are uniformly one or the other).
function toMetrics(
  summary: MerchantSummary,
): readonly (FinancialSnapshotMetric & { formatValue: (value: number) => string })[] {
  return [
    { id: 'total', label: 'Total Merchants', value: summary.total, formatValue: formatCount },
    { id: 'active', label: 'Active Merchants', value: summary.active, formatValue: formatCount },
    {
      id: 'uncategorized',
      label: 'Uncategorized Merchants',
      value: summary.uncategorized,
      formatValue: formatCount,
    },
    { id: 'totalSpend', label: 'Total Spend', value: summary.totalSpend, formatValue: formatINR },
    {
      id: 'transactionsThisMonth',
      label: 'Transactions This Month',
      value: summary.transactionsThisMonth,
      formatValue: formatCount,
    },
  ]
}

export function MerchantSummaryWidget({ query }: MerchantSummaryWidgetProps) {
  return (
    <QueryBoundary
      query={query}
      skeleton={
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      }
      isEmpty={(data) => data.total === 0}
      empty={
        <EmptyState
          icon={Store}
          title="No merchants yet"
          description="Merchants appear automatically as transactions are captured."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3 lg:grid-cols-5">
          {toMetrics(summary).map((metric) => (
            <KPICard key={metric.id} metric={metric} formatValue={metric.formatValue} />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
