import { Landmark, CreditCard, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { Button } from '@/components/ui/button'
import type { ConnectedAccount } from '@/domain/Account'

interface AccountCardProps {
  account: ConnectedAccount
  onPayNow?: (accountId: string) => void
}

export function AccountCard({ account, onPayNow }: AccountCardProps) {
  const Icon = account.kind === 'credit_card' ? CreditCard : Landmark
  const isUrgent = account.status === 'urgent'

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border p-md',
        isUrgent ? 'border-destructive bg-card' : 'border-border bg-card',
      )}
    >
      {isUrgent && (
        <div className="absolute right-0 top-0 bg-destructive px-sm py-xs text-[9px] font-semibold text-destructive-foreground">
          URGENT
        </div>
      )}
      <div className="mb-md flex items-start justify-between">
        <div>
          <p className="text-label-caps text-muted-foreground">{account.name}</p>
          <p className="text-table-mono tabular-nums text-muted-foreground">
            {account.maskedNumber}
          </p>
        </div>
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="mb-md">
        {account.dueAmount !== undefined ? (
          <>
            <p className="text-headline-sm text-foreground">
              {formatINR(account.dueAmount)}{' '}
              <span className="text-xs font-normal text-muted-foreground">due</span>
            </p>
            {account.dueDate && (
              <p className="text-body-sm font-medium text-destructive">
                Due Date: {account.dueDate}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="text-headline-sm text-foreground">{formatINR(account.balance)}</p>
            {account.lastSyncedLabel && (
              <p className="flex items-center gap-xs text-body-sm text-muted-foreground">
                {account.status === 'syncing' && (
                  <RefreshCw className="size-3 animate-spin" aria-hidden="true" />
                )}
                Last Sync: {account.lastSyncedLabel}
              </p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-sm text-table-mono text-xs">
        {account.dailyAverage !== undefined ? (
          <>
            <span className="text-muted-foreground">
              Daily Avg: {formatINR(account.dailyAverage)}
            </span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0"
              onClick={() => onPayNow?.(account.id)}
            >
              Pay Now
            </Button>
          </>
        ) : (
          <>
            <span className="text-secondary">Inflow: +{formatINR(account.inflow ?? 0)}</span>
            <span className="text-destructive">Outflow: -{formatINR(account.outflow ?? 0)}</span>
          </>
        )}
      </div>
    </div>
  )
}
