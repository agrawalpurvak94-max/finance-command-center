import type { UseQueryResult } from '@tanstack/react-query'
import { FileStack } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { StatementSummary } from '@/domain/Statement'

interface StatementSummaryWidgetProps {
  query: UseQueryResult<StatementSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

function toMetrics(summary: StatementSummary): FinancialSnapshotMetric[] {
  return [
    { id: 'total', label: 'Total Statements', value: summary.total },
    { id: 'processed', label: 'Successfully Processed', value: summary.processed },
    { id: 'processing', label: 'Processing', value: summary.processing },
    { id: 'failed', label: 'Failed', value: summary.failed },
    { id: 'pending-review', label: 'Pending Review', value: summary.pendingReview },
  ]
}

export function StatementSummaryWidget({ query }: StatementSummaryWidgetProps) {
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
          icon={FileStack}
          title="No statements yet"
          description="Upload a bank or credit card statement to see processing metrics here."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-3 lg:grid-cols-5">
          {toMetrics(summary).map((metric) => (
            <KPICard key={metric.id} metric={metric} formatValue={formatCount} />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
