import { Landmark, CreditCard, FileX, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { IconChip } from '@/components/ui/icon-chip'
import { Badge } from '@/components/ui/badge'
import { semanticToneBadgeClassName } from '@/lib/semanticTone'
import type { ConnectedAccount } from '@/domain/Account'

interface AccountCardProps {
  account: ConnectedAccount
  onOpen: (account: ConnectedAccount) => void
}

/**
 * Shared, data-driven tile for both Connected Accounts and Credit Cards on
 * Financial Pulse — differentiated only by `account.kind`/`accountTypeLabel`,
 * never by bank name, so the same component works for every current and
 * future bank without one-off per-institution styling.
 *
 * Clicking opens the account activity drawer (AccountActivityDrawer) —
 * stays on Financial Pulse, no navigation. The drawer itself has the
 * Transactions/Statements links (reusing the existing bankAccountId/
 * creditCardId and accountId query-param patterns) for when the user
 * explicitly wants to leave. Inflow is never shown for a credit card.
 */
export function AccountCard({ account, onOpen }: AccountCardProps) {
  const isCard = account.kind === 'credit_card'
  const Icon = isCard ? CreditCard : Landmark
  const isUrgent = account.status === 'urgent'
  const isSyncing = account.status === 'syncing'
  // When a period genuinely isn't available (e.g. no statement yet), the
  // service returns EMPTY_ACTIVITY (spend/inflow/count all 0) rather than
  // real data — showing those zeros next to "no statement" previously read
  // as "this account had zero activity" instead of "we don't know yet".
  // Show one honest empty notice instead of misleading zeroed figures.
  const hasPeriod = account.periodAvailable !== false

  return (
    <button
      type="button"
      onClick={() => onOpen(account)}
      className={cn(
        'group flex w-full flex-col rounded-lg border bg-card p-md text-left transition-colors',
        'hover:border-primary hover:bg-surface-hover',
        isUrgent ? 'border-destructive/50' : 'border-border',
      )}
    >
      <div className="mb-md flex items-start justify-between gap-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <IconChip tone={isCard ? 'attention' : 'info'}>
            <Icon className="size-4" aria-hidden="true" />
          </IconChip>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-semibold text-foreground">{account.name}</p>
            <p className="truncate text-label-caps text-muted-foreground">
              {[account.institutionName, account.accountTypeLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>

      <p className="mb-md font-mono text-xs tracking-wider text-muted-foreground">
        {account.maskedNumber}
      </p>

      {hasPeriod ? (
        <>
          <p className="mb-sm text-body-sm text-muted-foreground">{account.periodLabel}</p>
          <div className={cn('mb-md grid gap-sm', isCard ? 'grid-cols-1' : 'grid-cols-2')}>
            <div>
              <p className="text-label-caps text-muted-foreground">Spend</p>
              <p className="text-headline-sm tabular-nums text-destructive">
                {formatINR(account.outflow ?? 0)}
              </p>
            </div>
            {!isCard && (
              <div>
                <p className="text-label-caps text-muted-foreground">Inflow</p>
                <p className="text-headline-sm tabular-nums text-secondary">
                  {formatINR(account.inflow ?? 0)}
                </p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="mb-md flex items-center gap-sm rounded-md border border-dashed border-border bg-muted/30 px-sm py-sm text-body-sm text-muted-foreground">
          <FileX className="size-4 shrink-0" aria-hidden="true" />
          Statement not available
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-sm text-table-mono text-muted-foreground">
        <span>{hasPeriod ? `${account.transactionCount ?? 0} transactions` : '—'}</span>
        <span className="flex items-center gap-xs">
          {isSyncing && (
            <Badge
              variant="outline"
              className={cn('text-[10px]', semanticToneBadgeClassName('info'))}
            >
              Syncing
            </Badge>
          )}
          {isUrgent && (
            <Badge
              variant="outline"
              className={cn('text-[10px]', semanticToneBadgeClassName('danger'))}
            >
              Needs attention
            </Badge>
          )}
          {account.lastSyncedLabel && <span>Last Sync: {account.lastSyncedLabel}</span>}
        </span>
      </div>
    </button>
  )
}
