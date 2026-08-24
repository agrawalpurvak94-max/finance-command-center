import type { UseQueryResult } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { FinancialSnapshotCard } from '@/components/dashboard/FinancialSnapshotCard'
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
      <h2 className="mb-md flex items-center gap-sm text-headline-sm font-semibold text-foreground">
        Financial Snapshot
        <span className="h-px flex-1 bg-border" />
      </h2>
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className="h-32 w-full rounded-lg" />}
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
          <FinancialSnapshotCard
            spend={metrics.find((m) => m.id === 'spend')}
            inflow={metrics.find((m) => m.id === 'inflow')}
            onOpenFlowDrawer={onOpenFlowDrawer}
          />
        )}
      </QueryBoundary>
    </section>
  )
}
