import { Landmark, CreditCard } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { ConnectedAccount } from '@/domain/Account'

interface AccountCardProps {
  account: ConnectedAccount
  onOpen: (account: ConnectedAccount) => void
}

/**
 * Clicking opens the account activity drawer (AccountActivityDrawer) —
 * stays on Financial Pulse, no navigation. The drawer itself has the
 * Transactions/Statements links (reusing the existing bankAccountId/
 * creditCardId and accountId query-param patterns) for when the user
 * explicitly wants to leave. Inflow is never shown for a credit card.
 */
export function AccountCard({ account, onOpen }: AccountCardProps) {
  const Icon = account.kind === 'credit_card' ? CreditCard : Landmark
  const isUrgent = account.status === 'urgent'
  const isCard = account.kind === 'credit_card'

  return (
    <button
      type="button"
      onClick={() => onOpen(account)}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border p-md text-left transition-colors hover:border-primary',
        isUrgent ? 'border-destructive bg-card' : 'border-border bg-card',
      )}
    >
      <div className="mb-md flex items-start justify-between">
        <div>
          <p className="text-label-caps text-muted-foreground">{account.name}</p>
          <p className="text-table-mono tabular-nums text-muted-foreground">
            {account.maskedNumber}
          </p>
        </div>
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>

      <p className="mb-md text-body-sm text-muted-foreground">
        {account.periodLabel ?? 'No statement period available'}
      </p>

      <div className={cn('mb-md grid gap-sm', isCard ? 'grid-cols-1' : 'grid-cols-2')}>
        <div>
          <p className="text-label-caps text-muted-foreground">Spend</p>
          <p className="text-headline-sm text-destructive">{formatINR(account.outflow ?? 0)}</p>
        </div>
        {!isCard && (
          <div>
            <p className="text-label-caps text-muted-foreground">Inflow</p>
            <p className="text-headline-sm text-secondary">{formatINR(account.inflow ?? 0)}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-sm text-table-mono text-xs text-muted-foreground">
        <span>{account.transactionCount ?? 0} transactions</span>
        {account.lastSyncedLabel && <span>Last Sync: {account.lastSyncedLabel}</span>}
      </div>
    </button>
  )
}
