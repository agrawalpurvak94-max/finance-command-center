import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { Receipt } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { RecentTransaction, TransactionStatus } from '@/types/dashboard'

const statusDotClass: Record<TransactionStatus, string> = {
  processed: 'bg-secondary',
  pending: 'bg-muted-foreground',
  flagged: 'bg-destructive',
}

const statusTextClass: Record<TransactionStatus, string> = {
  processed: 'text-secondary',
  pending: 'text-muted-foreground',
  flagged: 'text-destructive',
}

const statusLabel: Record<TransactionStatus, string> = {
  processed: 'Processed',
  pending: 'Pending',
  flagged: 'Flagged',
}

interface RecentTransactionsWidgetProps {
  query: UseQueryResult<RecentTransaction[]>
}

export function RecentTransactionsWidget({ query }: RecentTransactionsWidgetProps) {
  return (
    <div className="flex h-full flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm text-foreground">Recent Transactions</h2>
        <Link to="/transactions" className="text-body-sm text-primary hover:underline">
          View All Records
        </Link>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-muted">
        <QueryBoundary
          query={query}
          skeleton={
            <div className="flex flex-col gap-2 p-md">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          }
          isEmpty={(data) => data.length === 0}
          empty={
            <EmptyState
              icon={Receipt}
              title="No transactions yet"
              description="Once transactions sync in, they'll appear here."
              action={{ label: 'Go to Transactions', href: '/transactions' }}
            />
          }
        >
          {(transactions) => (
            <div className="overflow-x-auto">
              <table className="w-full min-w-140 border-collapse text-left">
                <thead>
                  <tr className="bg-card">
                    <th className="px-md py-sm text-label-caps uppercase text-muted-foreground">
                      Date
                    </th>
                    <th className="px-md py-sm text-label-caps uppercase text-muted-foreground">
                      Merchant
                    </th>
                    <th className="px-md py-sm text-label-caps uppercase text-muted-foreground">
                      Category
                    </th>
                    <th className="px-md py-sm text-right text-label-caps uppercase text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-md py-sm text-label-caps uppercase text-muted-foreground">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="transition-colors hover:bg-accent">
                      <td className="px-md py-sm text-table-mono tabular-nums text-muted-foreground">
                        {txn.dateLabel}
                      </td>
                      <td className="px-md py-sm text-body-sm text-foreground">{txn.merchant}</td>
                      <td className="px-md py-sm">
                        <span className="rounded bg-muted-foreground/10 px-sm py-0.5 text-[10px] text-muted-foreground">
                          {txn.category}
                        </span>
                      </td>
                      <td className="px-md py-sm text-right text-table-mono tabular-nums text-foreground">
                        {formatINR(txn.amount)}
                      </td>
                      <td className="px-md py-sm">
                        <div
                          className={cn(
                            'flex items-center gap-xs text-[10px] font-bold uppercase tracking-wider',
                            statusTextClass[txn.status],
                          )}
                        >
                          <span
                            className={cn('size-1.5 rounded-full', statusDotClass[txn.status])}
                          />
                          {statusLabel[txn.status]}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryBoundary>
      </div>
    </div>
  )
}
