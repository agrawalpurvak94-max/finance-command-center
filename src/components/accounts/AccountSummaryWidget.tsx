import type { UseQueryResult } from '@tanstack/react-query'
import { Landmark } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'
import type { BankAccountSummary } from '@/domain/Account'

interface AccountSummaryWidgetProps {
  query: UseQueryResult<BankAccountSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

function toMetrics(
  summary: BankAccountSummary,
): readonly (FinancialSnapshotMetric & { formatValue: (value: number) => string })[] {
  return [
    {
      id: 'totalBankAccounts',
      label: 'Total Bank Accounts',
      value: summary.totalBankAccounts,
      formatValue: formatCount,
    },
    {
      id: 'totalCurrentBalance',
      label: 'Total Current Balance',
      value: summary.totalCurrentBalance,
      formatValue: formatINR,
    },
    {
      id: 'totalAvailableBalance',
      label: 'Total Available Balance',
      value: summary.totalAvailableBalance,
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

export function AccountSummaryWidget({ query }: AccountSummaryWidgetProps) {
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
      isEmpty={(data) => data.totalBankAccounts === 0}
      empty={
        <EmptyState
          icon={Landmark}
          title="No bank accounts linked yet"
          description="Link a bank account to start seeing balances and activity here."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          {toMetrics(summary).map((metric) => (
            <KPICard key={metric.id} metric={metric} formatValue={metric.formatValue} />
          ))}
        </div>
      )}
    </QueryBoundary>
  )
}
