import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { InlineSelector } from '@/components/transactions/InlineSelector'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { StatementTransactionRow } from '@/domain/StatementTransaction'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { OwnerType } from '@/domain/Transaction'

interface StatementTransactionTableProps {
  rows: readonly StatementTransactionRow[]
  isLoading: boolean
  onOpenRow: (row: StatementTransactionRow) => void
  categoryOptions: readonly Category[]
  onUpdateCategory: (rowId: string, category: string) => void
  clientOptions: readonly Client[]
  onUpdateClient: (rowId: string, clientId: string | null) => void
  onUpdateOwnerType: (rowId: string, ownerType: OwnerType) => void
}

function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

function confidenceDotClass(confidence: number): string {
  if (confidence >= 80) return 'bg-secondary'
  if (confidence >= 50) return 'bg-amber-400'
  return 'bg-destructive'
}

function statusBadgeClass(status: string): string {
  if (status.toLowerCase() === 'processed')
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
  return 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground'
}

export function StatementTransactionTable({
  rows,
  isLoading,
  onOpenRow,
  categoryOptions,
  onUpdateCategory,
  clientOptions,
  onUpdateClient,
  onUpdateOwnerType,
}: StatementTransactionTableProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-xs p-md">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="p-xl text-center text-body-sm text-muted-foreground">
        No statement transactions available
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-280 border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border">
            <th className="p-md text-label-caps uppercase text-muted-foreground">Date</th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Merchant</th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Description</th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Category</th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Client</th>
            <th className="p-md text-center text-label-caps uppercase text-muted-foreground">
              Biz/Pers
            </th>
            <th className="p-md text-right text-label-caps uppercase text-muted-foreground">
              Debit
            </th>
            <th className="p-md text-right text-label-caps uppercase text-muted-foreground">
              Credit
            </th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Type</th>
            <th className="p-md text-center text-label-caps uppercase text-muted-foreground">
              Confidence
            </th>
            <th className="p-md text-label-caps uppercase text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr
              key={row.id}
              onClick={() => onOpenRow(row)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenRow(row)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`View transaction: ${row.merchant}`}
              className={cn(
                'cursor-pointer transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                row.confidence !== null && row.confidence < 50 && 'border-l-2 border-l-destructive',
              )}
            >
              <td className="whitespace-nowrap p-md text-table-mono tabular-nums text-body-sm text-foreground">
                {formatDate(row.date)}
              </td>
              <td className="p-md text-body-sm font-medium text-foreground">{row.merchant}</td>
              <td
                className="max-w-56 truncate p-md text-body-sm text-muted-foreground"
                title={row.rawDescription ?? undefined}
              >
                {row.rawDescription ?? '—'}
              </td>
              {/* stopPropagation only: InlineSelector is fully keyboard/mouse
                  accessible on its own — this just stops the click from
                  bubbling into the row's onOpenRow. Same select-based
                  "selection" component the global Transactions table uses,
                  for a consistent look across the app. */}
              <td className="p-md" onClick={(e) => e.stopPropagation()}>
                <InlineSelector
                  value={row.category}
                  // "Uncategorized" is already the built-in "none" slot below
                  // (emptyLabel) — excluded here so it isn't offered twice.
                  options={categoryOptions
                    .filter((c) => c.name !== 'Uncategorized')
                    .map((c) => ({ id: c.name, name: c.name }))}
                  placeholder="Uncategorized"
                  emptyLabel="Uncategorized"
                  onChange={(v) => onUpdateCategory(row.id, v ?? 'Uncategorized')}
                  aria-label={`Category for ${row.merchant}`}
                />
              </td>
              <td className="p-md" onClick={(e) => e.stopPropagation()}>
                <InlineSelector
                  value={row.clientId}
                  options={clientOptions}
                  placeholder="No client"
                  emptyLabel="No client"
                  onChange={(v) => onUpdateClient(row.id, v)}
                  aria-label={`Client for ${row.merchant}`}
                />
              </td>
              <td className="p-md text-center" onClick={(e) => e.stopPropagation()}>
                <BizPersonalPill
                  value={row.ownerType}
                  onChange={(v) => onUpdateOwnerType(row.id, v)}
                />
              </td>
              <td className="whitespace-nowrap p-md text-right text-table-mono tabular-nums text-foreground">
                {row.type === 'debit' ? formatINR(row.amount) : '—'}
              </td>
              <td className="whitespace-nowrap p-md text-right text-table-mono tabular-nums text-secondary">
                {row.type === 'credit' ? formatINR(row.amount) : '—'}
              </td>
              <td className="p-md text-body-sm capitalize text-foreground">{row.type}</td>
              <td className="p-md text-center text-table-mono tabular-nums text-foreground">
                {row.confidence === null ? (
                  '—'
                ) : (
                  <span className="inline-flex items-center gap-xs">
                    <span
                      className={cn('size-1.5 rounded-full', confidenceDotClass(row.confidence))}
                    />
                    {row.confidence}%
                  </span>
                )}
              </td>
              <td className="p-md">
                <Badge
                  variant="outline"
                  className={cn('text-[10px] font-medium capitalize', statusBadgeClass(row.status))}
                >
                  {row.status}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
