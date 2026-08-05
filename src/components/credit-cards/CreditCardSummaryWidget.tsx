import type { UseQueryResult } from '@tanstack/react-query'
import { CreditCard } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { CreditCardSummary } from '@/domain/CreditCard'

interface CreditCardSummaryWidgetProps {
  query: UseQueryResult<CreditCardSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

function toMetrics(
  summary: CreditCardSummary,
): readonly (FinancialSnapshotMetric & { formatValue: (value: number) => string })[] {
  return [
    {
      id: 'totalCreditCards',
      label: 'Total Credit Cards',
      value: summary.totalCreditCards,
      formatValue: formatCount,
    },
    {
      id: 'totalCreditLimit',
      label: 'Total Credit Limit',
      value: summary.totalCreditLimit,
      formatValue: formatINR,
    },
    {
      id: 'totalOutstanding',
      label: 'Total Outstanding',
      value: summary.totalOutstanding,
      formatValue: formatINR,
    },
    {
      id: 'totalAvailableCredit',
      label: 'Total Available Credit',
      value: summary.totalAvailableCredit,
      formatValue: formatINR,
    },
    {
      id: 'statementsImportedThisMonth',
      label: 'Statements Imported This Month',
      value: summary.statementsImportedThisMonth,
      formatValue: formatCount,
    },
  ]
}

export function CreditCardSummaryWidget({ query }: CreditCardSummaryWidgetProps) {
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
      isEmpty={(data) => data.totalCreditCards === 0}
      empty={
        <EmptyState
          icon={CreditCard}
          title="No credit cards linked yet"
          description="Add a credit card to start tracking limits, utilization, and due dates here."
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
