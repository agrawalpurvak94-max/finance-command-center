import type { UseQueryResult } from '@tanstack/react-query'
import { Users } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { ClientSummary } from '@/domain/Client'

interface ClientSummaryWidgetProps {
  query: UseQueryResult<ClientSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

// Total Spend is the only currency-valued card in this row — same mixed
// formatting reasoning MerchantSummaryWidget/AccountSummaryWidget document.
function toMetrics(
  summary: ClientSummary,
): readonly (FinancialSnapshotMetric & { formatValue: (value: number) => string })[] {
  return [
    {
      id: 'totalClients',
      label: 'Total Clients',
      value: summary.totalClients,
      formatValue: formatCount,
    },
    { id: 'totalSpend', label: 'Total Spent', value: summary.totalSpend, formatValue: formatINR },
    {
      id: 'clientsRequiringReview',
      label: 'Clients Requiring Review',
      value: summary.clientsRequiringReview,
      formatValue: formatCount,
    },
    {
      id: 'activeClients',
      label: 'Active Clients',
      value: summary.activeClients,
      formatValue: formatCount,
    },
  ]
}

export function ClientSummaryWidget({ query }: ClientSummaryWidgetProps) {
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
      isEmpty={(data) => data.totalClients === 0}
      empty={
        <EmptyState
          icon={Users}
          title="No clients yet"
          description="Add a client to start tracking their spend, accounts, and statements."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {toMetrics(summary).map((metric) => (
            <KPICard
              key={metric.id}
              metric={metric}
              formatValue={metric.formatValue}
              valueClassName="text-headline-lg sm:text-2xl"
            />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
