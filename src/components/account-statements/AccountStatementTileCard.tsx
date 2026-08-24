import { Landmark, CreditCard as CreditCardIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getBankInitials } from '@/utils/bank'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { AccountStatementTile } from '@/domain/AccountStatements'

function formatDateLong(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAmountOrDash(value: number | null): string {
  return value === null ? '—' : formatINR(value)
}

interface AccountStatementTileCardProps {
  tile: AccountStatementTile
  onOpen: (tile: AccountStatementTile) => void
}

/**
 * Statement-analysis tile — deliberately shows ONLY statement-derived
 * fields (never live/current transaction activity, per Account Statements'
 * "not real-time" purpose). Distinguishes "no statement yet" from "statement
 * exists with a genuine ₹0" — never collapses the two into the same display.
 */
export function AccountStatementTileCard({ tile, onOpen }: AccountStatementTileCardProps) {
  const Icon = tile.kind === 'credit_card' ? CreditCardIcon : Landmark

  return (
    <button
      type="button"
      data-account-statement-tile-trigger={tile.id}
      onClick={() => onOpen(tile)}
      aria-label={`View statements for ${tile.name}`}
      className={cn(
        'group flex h-full flex-col gap-md rounded-xl border border-border bg-card p-md text-left shadow-sm transition-all duration-200',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="flex items-start justify-between gap-sm">
        <div className="flex min-w-0 flex-1 items-center gap-sm">
          <Avatar className="shrink-0">
            <AvatarFallback className="bg-primary/10 font-semibold text-primary">
              {getBankInitials(tile.institutionName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-body-md font-semibold text-foreground">{tile.name}</p>
            <p className="truncate text-body-sm text-muted-foreground">{tile.institutionName}</p>
          </div>
        </div>
        <Icon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>

      <div className="flex min-w-0 items-center gap-xs text-body-sm">
        <span className="shrink-0 rounded bg-muted-foreground/10 px-1.5 py-0.5 text-label-caps font-semibold uppercase tracking-wide text-muted-foreground">
          {tile.accountType}
        </span>
        <span className="shrink-0 text-table-mono tabular-nums text-muted-foreground">
          •••• {tile.maskedNumber.slice(-4)}
        </span>
      </div>

      {!tile.hasStatement ? (
        <div className="flex flex-1 items-center justify-center rounded-lg bg-muted/40 p-md text-body-sm text-muted-foreground">
          Statement not available
        </div>
      ) : (
        <>
          <div className="min-w-0">
            <p className="text-label-caps uppercase text-muted-foreground">Statement Period</p>
            <p className="truncate text-body-md font-semibold text-foreground">
              {tile.statementPeriodLabel || '—'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-sm rounded-lg bg-muted/40 p-sm text-table-mono text-xs">
            <div className="min-w-0">
              <p className="text-muted-foreground">
                {tile.kind === 'credit_card' ? 'Statement Spend' : 'Total Debits'}
              </p>
              <p className="truncate font-semibold text-foreground">
                {formatAmountOrDash(tile.totalDebits)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">
                {tile.kind === 'credit_card' ? 'Statement Credits' : 'Total Credits'}
              </p>
              <p className="truncate font-semibold text-foreground">
                {formatAmountOrDash(tile.totalCredits)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">Statement Date</p>
              <p className="truncate font-semibold text-foreground">
                {formatDateLong(tile.statementDate)}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-muted-foreground">Due Date</p>
              <p className="truncate font-semibold text-foreground">
                {tile.dueDate ? formatDateLong(tile.dueDate) : '—'}
              </p>
            </div>
          </div>

          {tile.kind === 'credit_card' && (
            <div className="grid grid-cols-2 gap-sm rounded-lg bg-primary/5 p-sm text-table-mono text-xs">
              <div className="min-w-0">
                <p className="text-muted-foreground">Total Amount Due</p>
                <p className="truncate font-semibold text-foreground">
                  {formatAmountOrDash(tile.statementTotalAmountDue)}
                </p>
              </div>
              <div className="min-w-0">
                <p className="text-muted-foreground">Minimum Due</p>
                <p className="truncate font-semibold text-foreground">
                  {formatAmountOrDash(tile.minimumDue)}
                </p>
              </div>
            </div>
          )}

          <div className="mt-auto flex items-center justify-between gap-sm border-t border-border pt-sm text-body-sm text-muted-foreground">
            <span>{tile.transactionsExtracted} statement transactions</span>
            {tile.closingBalance !== null && <span>Closing: {formatINR(tile.closingBalance)}</span>}
          </div>
        </>
      )}
    </button>
  )
}
