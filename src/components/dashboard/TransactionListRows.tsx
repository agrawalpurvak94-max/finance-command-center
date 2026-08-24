import { Skeleton } from '@/components/ui/skeleton'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { RecentTransaction, RecentTransactionStatus } from '@/domain/Dashboard'

const statusDotClass: Record<RecentTransactionStatus, string> = {
  processed: 'bg-secondary',
  pending: 'bg-muted-foreground',
  flagged: 'bg-destructive',
}
const statusLabel: Record<RecentTransactionStatus, string> = {
  processed: 'Processed',
  pending: 'Pending',
  flagged: 'Flagged',
}

interface TransactionListRowsProps {
  transactions: RecentTransaction[] | undefined
  isLoading: boolean
  emptyMessage: string
  /** Shows the account label per row (consolidated drawers) — hidden for a single-account drawer where it's redundant. */
  showAccount?: boolean
}

/** Shared row list for the Spend/Inflow/account-activity drawers — same data shape (`RecentTransaction`), same rendering rules. */
export function TransactionListRows({
  transactions,
  isLoading,
  emptyMessage,
  showAccount = true,
}: TransactionListRowsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-sm">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return <p className="py-lg text-center text-body-sm text-muted-foreground">{emptyMessage}</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {transactions.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-sm p-sm">
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-foreground">{t.merchant}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {t.dateLabel}
              {showAccount ? ` · ${t.account}` : ''} · {t.category}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p
              className={cn(
                'text-table-mono tabular-nums',
                t.type === 'debit' ? 'text-destructive' : 'text-secondary',
              )}
            >
              {t.type === 'debit' ? '−' : '+'}
              {formatINR(t.amount)}
            </p>
            <div className="flex items-center justify-end gap-xs text-[10px] text-muted-foreground">
              <span className={cn('size-1.5 rounded-full', statusDotClass[t.status])} />
              {statusLabel[t.status]}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
