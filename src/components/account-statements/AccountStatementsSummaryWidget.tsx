import type { UseQueryResult } from '@tanstack/react-query'
import { FileStack } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { KPICard } from '@/components/dashboard/KPICard'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import type { AccountStatementsSummary } from '@/domain/AccountStatements'

interface AccountStatementsSummaryWidgetProps {
  query: UseQueryResult<AccountStatementsSummary>
}

function formatCount(value: number): string {
  return value.toLocaleString('en-IN')
}

export function AccountStatementsSummaryWidget({ query }: AccountStatementsSummaryWidgetProps) {
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
      isEmpty={(data) => data.totalAccounts === 0}
      empty={
        <EmptyState
          icon={FileStack}
          title="No accounts linked yet"
          description="Link a credit card or bank account to start seeing statement analysis here."
        />
      }
    >
      {(summary) => (
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            metric={{ id: 'totalAccounts', label: 'Total Accounts', value: summary.totalAccounts }}
            formatValue={formatCount}
            valueClassName="text-headline-lg sm:text-2xl"
          />
          <KPICard
            metric={{
              id: 'latestStatementSpend',
              label: 'Latest Statement Spend',
              value: summary.latestStatementSpend,
            }}
            formatValue={formatINR}
            valueClassName="text-headline-lg sm:text-2xl"
          />
          <KPICard
            metric={{
              id: 'latestStatementInflow',
              label: 'Latest Statement Inflow',
              value: summary.latestStatementInflow,
            }}
            formatValue={formatINR}
            valueClassName="text-headline-lg sm:text-2xl"
            caption="Savings, Current & Overdraft only"
          />
          <KPICard
            metric={{
              id: 'statementsAvailable',
              label: 'Statements Available',
              value: summary.statementsAvailable,
            }}
            formatValue={formatCount}
            valueClassName="text-headline-lg sm:text-2xl"
          />
        </div>
      )}
    </QueryBoundary>
  )
}
