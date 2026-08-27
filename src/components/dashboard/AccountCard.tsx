import { Landmark, CreditCard, FileX, ChevronRight } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
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
 * Institution identity (avatar color/initials, accent bar, header wash) is
 * the same data-driven `getInstitutionIdentity` system Account Statements'
 * tiles already use — reused here rather than a second identity treatment,
 * so a bank looks the same wherever its tile appears in the app.
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
  const identity = getInstitutionIdentity(account.institutionName || account.name)

  return (
    <button
      type="button"
      onClick={() => onOpen(account)}
      className={cn(
        'group relative flex w-full flex-col overflow-hidden rounded-xl border bg-card p-md text-left shadow-sm ring-0 transition-all duration-200',
        isUrgent
          ? 'border-destructive/50 hover:border-destructive'
          : cn(
              'border-border hover:border-transparent hover:shadow-lg hover:ring-1',
              identity.ringClassName,
            ),
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute inset-x-0 top-0 h-0.75', identity.barClassName)}
      />
      <span
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-x-0 top-0 h-20 bg-linear-to-br opacity-60',
          identity.gradientClassName,
        )}
      />

      <div className="relative mb-md flex items-start justify-between gap-sm">
        <div className="flex min-w-0 items-center gap-sm">
          <Avatar className="shrink-0 transition-transform duration-200 group-hover:scale-105">
            <AvatarFallback className={cn('font-semibold', identity.chipClassName)}>
              {identity.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            {/* Bumped from text-[10px]/font-semibold to text-body-sm/font-bold
                per explicit instruction — it read as illegible at the
                original size. Colored with this tile's own institution
                accent (identity.textClassName) rather than a fixed
                text-primary, so the holder name always matches the tile's
                own accent bar/avatar instead of reading blue on every tile
                regardless of bank. */}
            <p
              className={cn(
                'truncate text-body-sm font-bold uppercase tracking-wide',
                identity.textClassName,
              )}
            >
              {account.accountHolder || 'Holder not assigned'}
            </p>
            <p className="truncate text-body-sm font-semibold text-foreground">{account.name}</p>
            <p className="truncate text-label-caps text-muted-foreground">
              {[account.institutionName, account.accountTypeLabel].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-xs">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
          <ChevronRight
            className="size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
          />
        </div>
      </div>

      <p className="relative mb-md font-mono text-xs tracking-wider text-muted-foreground">
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
