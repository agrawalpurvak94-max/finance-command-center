import type { UseQueryResult } from '@tanstack/react-query'
import { Tags } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { CategorySummary } from '@/domain/Category'

interface CategorySummaryWidgetProps {
  query: UseQueryResult<CategorySummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

function toMetrics(summary: CategorySummary): FinancialSnapshotMetric[] {
  return [
    { id: 'total', label: 'Total Categories', value: summary.total },
    { id: 'active', label: 'Active Categories', value: summary.active },
    { id: 'inactive', label: 'Inactive Categories', value: summary.inactive },
    {
      id: 'uncategorized',
      label: 'Uncategorized Transactions',
      value: summary.uncategorizedTransactions,
    },
  ]
}

export function CategorySummaryWidget({ query }: CategorySummaryWidgetProps) {
  return (
    <QueryBoundary
      query={query}
      skeleton={
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      }
      isEmpty={(data) => data.total === 0}
      empty={
        <EmptyState
          icon={Tags}
          title="No categories yet"
          description="Add your first category to start classifying transactions."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {toMetrics(summary).map((metric) => (
            <KPICard key={metric.id} metric={metric} formatValue={formatCount} />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
