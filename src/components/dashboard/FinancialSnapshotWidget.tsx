import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { Gauge } from 'lucide-react'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'

interface FinancialSnapshotWidgetProps {
  query: UseQueryResult<FinancialSnapshotMetric[]>
}

export function FinancialSnapshotWidget({ query }: FinancialSnapshotWidgetProps) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md text-headline-sm text-foreground">Financial Snapshot</h2>
      <QueryBoundary
        query={query}
        skeleton={
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        }
        isEmpty={(data) => data.length === 0}
        empty={
          <EmptyState
            icon={Gauge}
            title="No financial data yet"
            description="Once transactions start syncing, your spend and income snapshot will appear here."
          />
        }
      >
        {(metrics) => (
          <div className="grid grid-cols-1 gap-md sm:grid-cols-3">
            {metrics.map((metric) => (
              <KPICard key={metric.id} metric={metric} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}
