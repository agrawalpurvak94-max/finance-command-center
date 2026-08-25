import { Tag } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { InlineSelector } from '@/components/transactions/InlineSelector'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { getMerchantIdentity } from '@/lib/merchantIdentity'
import {
  resolveCategoryIcon,
  categoryColorClassNames,
} from '@/components/categories/categoryVisuals'
import type { CategoryVisual } from '@/components/merchants/MerchantCategoryControl'
import { semanticToneBadgeClassName } from '@/lib/semanticTone'
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
  /** Read-only icon/color enrichment for the Category column's display —
   * keyed by name since these rows carry a category name, not a reference. */
  categoryVisualsByName: ReadonlyMap<string, CategoryVisual>
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

/**
 * Lowercase on purpose — see MerchantCategoryControl.tsx's identical
 * `renderCategoryGlyph`: a capitalized function/variable resolving
 * `resolveCategoryIcon()` and rendered as a JSX tag trips React Compiler's
 * "component created during render" check.
 */
function renderCategoryGlyph(iconKey: string | undefined, className: string) {
  const Icon = iconKey ? resolveCategoryIcon(iconKey) : Tag
  return <Icon className={className} aria-hidden="true" />
}

export function StatementTransactionTable({
  rows,
  isLoading,
  onOpenRow,
  categoryOptions,
  categoryVisualsByName,
  onUpdateCategory,
  clientOptions,
  onUpdateClient,
  onUpdateOwnerType,
}: StatementTransactionTableProps) {
  const shouldReduceMotion = useReducedMotion()
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
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-280 border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          <tr className="border-b border-border">
            <th className="w-24 p-md text-label-caps text-muted-foreground uppercase">Date</th>
            <th className="w-48 p-md text-label-caps text-muted-foreground uppercase">Merchant</th>
            <th className="p-md text-label-caps text-muted-foreground uppercase">Description</th>
            <th className="w-40 p-md text-label-caps text-muted-foreground uppercase">Category</th>
            <th className="w-36 p-md text-label-caps text-muted-foreground uppercase">Client</th>
            <th className="w-20 p-md text-center text-label-caps text-muted-foreground uppercase">
              Biz/Pers
            </th>
            <th className="w-28 p-md text-right text-label-caps text-muted-foreground uppercase">
              Debit
            </th>
            <th className="w-28 p-md text-right text-label-caps text-muted-foreground uppercase">
              Credit
            </th>
            <th className="w-20 p-md text-label-caps text-muted-foreground uppercase">Type</th>
            <th className="w-24 p-md text-center text-label-caps text-muted-foreground uppercase">
              Confidence
            </th>
            <th className="w-28 p-md text-label-caps text-muted-foreground uppercase">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => {
            const merchantIdentity = getMerchantIdentity(row.merchant)
            const categoryVisual = row.category
              ? categoryVisualsByName.get(row.category)
              : undefined
            return (
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
                  'cursor-pointer transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                  row.confidence !== null &&
                    row.confidence < 50 &&
                    'border-l-2 border-l-destructive',
                )}
              >
                <td className="whitespace-nowrap px-md py-sm tabular-nums text-body-sm text-foreground">
                  {formatDate(row.date)}
                </td>
                <td className="px-md py-sm">
                  <div className="flex min-w-0 items-center gap-xs">
                    <div
                      aria-hidden="true"
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-semibold',
                        merchantIdentity.chipClassName,
                      )}
                    >
                      {merchantIdentity.initials}
                    </div>
                    <span className="truncate text-body-sm font-medium text-foreground">
                      {row.merchant}
                    </span>
                  </div>
                </td>
                <td
                  className="max-w-56 truncate px-md py-sm text-body-sm text-muted-foreground"
                  title={row.rawDescription ?? undefined}
                >
                  {row.rawDescription ?? '—'}
                </td>
                {/* stopPropagation only: InlineSelector is fully keyboard/mouse
                    accessible on its own — this just stops the click from
                    bubbling into the row's onOpenRow. Same select-based
                    "selection" component the global Transactions table uses,
                    for a consistent look across the app. InlineSelector itself
                    is untouched; the icon chip is purely additive display. */}
                <td className="px-md py-sm" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-xs">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded',
                        categoryVisual
                          ? categoryColorClassNames[categoryVisual.color]
                          : 'bg-muted-foreground/10 text-muted-foreground',
                      )}
                    >
                      {renderCategoryGlyph(categoryVisual?.icon, 'size-3')}
                    </span>
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
                  </div>
                </td>
                <td className="px-md py-sm" onClick={(e) => e.stopPropagation()}>
                  <InlineSelector
                    value={row.clientId}
                    options={clientOptions}
                    placeholder="No client"
                    emptyLabel="No client"
                    onChange={(v) => onUpdateClient(row.id, v)}
                    aria-label={`Client for ${row.merchant}`}
                  />
                </td>
                <td className="px-md py-sm text-center" onClick={(e) => e.stopPropagation()}>
                  <BizPersonalPill
                    value={row.ownerType}
                    onChange={(v) => onUpdateOwnerType(row.id, v)}
                  />
                </td>
                <td className="whitespace-nowrap px-md py-sm text-right tabular-nums text-body-sm font-bold text-foreground">
                  {row.type === 'debit' ? formatINR(row.amount) : '—'}
                </td>
                <td className="whitespace-nowrap px-md py-sm text-right tabular-nums text-body-sm font-bold text-secondary">
                  {row.type === 'credit' ? formatINR(row.amount) : '—'}
                </td>
                <td className="px-md py-sm text-body-sm capitalize text-foreground">{row.type}</td>
                <td className="px-md py-sm text-center tabular-nums text-body-sm text-foreground">
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
                <td className="px-md py-sm">
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-[10px] font-medium capitalize',
                      semanticToneBadgeClassName(
                        row.status.toLowerCase() === 'processed' ? 'success' : 'neutral',
                      ),
                    )}
                  >
                    {row.status}
                  </Badge>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </motion.div>
  )
}
