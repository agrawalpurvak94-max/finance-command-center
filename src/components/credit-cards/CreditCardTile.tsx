import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CreditCardHealthBadge } from '@/components/credit-cards/CreditCardHealthBadge'
import { getBankInitials } from '@/utils/bank'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { CardNetwork } from '@/domain/CreditCard'
import type { CreditCardRecord } from '@/domain/CreditCard'

const networkClassName: Record<CardNetwork, string> = {
  VISA: 'bg-blue-500/10 text-blue-400',
  Mastercard: 'bg-amber-500/10 text-amber-400',
  AMEX: 'bg-emerald-500/10 text-emerald-400',
}

function utilizationBarClassName(utilizationPercent: number): string {
  if (utilizationPercent >= 80) return 'bg-destructive'
  if (utilizationPercent >= 50) return 'bg-amber-400'
  return 'bg-secondary'
}

interface CreditCardTileProps {
  card: CreditCardRecord
  isSelected?: boolean
  onOpen: (card: CreditCardRecord) => void
}

export function CreditCardTile({ card, isSelected, onOpen }: CreditCardTileProps) {
  return (
    <button
      type="button"
      data-credit-card-tile-trigger={card.id}
      onClick={() => onOpen(card)}
      aria-label={`View ${card.nickname ?? card.cardName}`}
      className={cn(
        'group flex flex-col gap-md rounded-xl border border-border bg-card p-md text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isSelected && 'border-primary/50 ring-2 ring-primary/30',
      )}
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="flex items-center gap-sm">
          <Avatar>
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {getBankInitials(card.bankName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-foreground">
              {card.nickname ?? card.cardName}
            </p>
            <p className="text-body-sm text-muted-foreground">{card.bankName}</p>
          </div>
        </div>
        <CreditCardHealthBadge health={card.health} />
      </div>

      <div className="flex items-center gap-xs text-body-sm">
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-label-caps font-semibold uppercase tracking-wide',
            networkClassName[card.network],
          )}
        >
          {card.network}
        </span>
        <span className="text-table-mono tabular-nums text-muted-foreground">
          •••• {card.last4}
        </span>
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <p className="text-label-caps uppercase text-muted-foreground">Outstanding</p>
          <p className="text-body-sm text-muted-foreground">{card.utilizationPercent}% used</p>
        </div>
        <p className="text-display-kpi tabular-nums text-foreground break-all">
          {formatINR(card.outstanding)}
        </p>
        <div className="mt-xs h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full', utilizationBarClassName(card.utilizationPercent))}
            style={{ width: `${Math.min(100, card.utilizationPercent)}%` }}
          />
        </div>
        <div className="mt-xs flex items-center justify-between text-body-sm text-muted-foreground">
          <span>Limit: {formatINR(card.creditLimit)}</span>
          <span>Available: {formatINR(card.availableCredit)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-sm rounded-lg bg-muted/40 p-sm text-table-mono text-xs">
        <div>
          <p className="text-muted-foreground">Statement Date</p>
          <p className="font-semibold text-foreground">{card.statementDate}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Due Date</p>
          <p className="font-semibold text-foreground">{card.dueDate}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Minimum Due</p>
          <p className="font-semibold text-foreground">{formatINR(card.minimumDue)}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Monthly Spend</p>
          <p className="font-semibold text-foreground">{formatINR(card.monthlySpend)}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-sm text-body-sm text-muted-foreground">
        <span className="min-w-0 truncate">Top: {card.topMerchant?.name ?? '—'}</span>
        <span className="shrink-0">Last Txn: {card.lastTransactionAt ?? '—'}</span>
      </div>
    </button>
  )
}
