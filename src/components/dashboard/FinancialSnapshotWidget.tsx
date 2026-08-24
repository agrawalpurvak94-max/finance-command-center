import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { Gauge } from 'lucide-react'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'

interface FinancialSnapshotWidgetProps {
  query: UseQueryResult<FinancialSnapshotMetric[]>
  /** Opens the Spend or Inflow drawer. */
  onOpenFlowDrawer: (kind: 'spend' | 'inflow') => void
}

export function FinancialSnapshotWidget({ query, onOpenFlowDrawer }: FinancialSnapshotWidgetProps) {
  return (
    <section className="mb-xl">
      <h2 className="mb-md text-headline-sm text-foreground">Financial Snapshot</h2>
      <QueryBoundary
        query={query}
        skeleton={
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {[0, 1].map((i) => (
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
          <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
            {metrics.map((metric) => (
              <KPICard
                key={metric.id}
                metric={metric}
                onClick={
                  metric.id === 'spend'
                    ? () => onOpenFlowDrawer('spend')
                    : metric.id === 'inflow'
                      ? () => onOpenFlowDrawer('inflow')
                      : undefined
                }
                ariaLabel={
                  metric.id === 'spend'
                    ? 'View spend details'
                    : metric.id === 'inflow'
                      ? 'View inflow details'
                      : undefined
                }
              />
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}
