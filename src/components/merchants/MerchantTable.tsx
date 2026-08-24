import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MerchantStatusBadge } from '@/components/merchants/MerchantStatusBadge'
import { MerchantRowActionsMenu } from '@/components/merchants/MerchantRowActionsMenu'
import { MerchantIdentityCell } from '@/components/merchants/MerchantIdentityCell'
import {
  MerchantCategoryControl,
  type CategoryVisual,
} from '@/components/merchants/MerchantCategoryControl'
import { formatINR } from '@/utils/currency'
import type { Category } from '@/domain/Category'
import type { MerchantRecord, MerchantSort } from '@/domain/Merchant'

interface MerchantTableProps {
  merchants: readonly MerchantRecord[]
  sort: MerchantSort | undefined
  onSortChange: (sort: MerchantSort) => void
  onReview: (merchant: MerchantRecord) => void
  onViewTransactions: (merchant: MerchantRecord) => void
  onEdit: (merchant: MerchantRecord) => void
  onChangeCategory: (merchant: MerchantRecord, categoryId: string | null) => void
  onDelete: (merchant: MerchantRecord) => void
  selectedMerchantId?: string | null
  /** Selectable options — unchanged from the shared CategorySelector's own
   * data source, just passed down instead of fetched again here. */
  categories: readonly Category[]
  /** Read-only icon/color enrichment for display only; never affects which
   * categories are selectable. */
  categoryVisualsById: ReadonlyMap<string, CategoryVisual>
}

const sortableColumns: MerchantSort['id'][] = [
  'name',
  'transactionCount',
  'totalSpend',
  'averageTransaction',
  'lastTransactionAt',
]

function formatLastTransaction(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function MerchantTable({
  merchants,
  sort,
  onSortChange,
  onReview,
  onViewTransactions,
  onEdit,
  onChangeCategory,
  onDelete,
  selectedMerchantId,
  categories,
  categoryVisualsById,
}: MerchantTableProps) {
  const shouldReduceMotion = useReducedMotion()

  const columns = useMemo<ColumnDef<MerchantRecord>[]>(
    () => [
      {
        id: 'name',
        header: 'Merchant',
        cell: ({ row }) => (
          <MerchantIdentityCell
            merchantId={row.original.id}
            name={row.original.name}
            onReview={() => onReview(row.original)}
          />
        ),
      },
      {
        id: 'defaultCategory',
        header: 'Category',
        cell: ({ row }) => (
          <MerchantCategoryControl
            category={row.original.defaultCategory}
            categories={categories}
            categoryVisualsById={categoryVisualsById}
            onChange={(categoryId) => onChangeCategory(row.original, categoryId)}
          />
        ),
      },
      {
        id: 'transactionCount',
        header: 'Activity',
        cell: ({ row }) => (
          <span className="tabular-nums text-body-sm font-semibold text-foreground">
            {row.original.transactionCount.toLocaleString('en-IN')}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">txns</span>
          </span>
        ),
      },
      {
        id: 'totalSpend',
        header: 'Total Spend',
        cell: ({ row }) => {
          const isZero = row.original.totalSpend === 0
          return (
            <span
              className={cn(
                'tabular-nums text-body-sm',
                isZero ? 'text-muted-foreground' : 'font-bold text-foreground',
              )}
            >
              {formatINR(row.original.totalSpend)}
            </span>
          )
        },
      },
      {
        id: 'averageTransaction',
        header: 'Avg. Transaction',
        cell: ({ row }) => (
          <span className="tabular-nums text-body-sm text-muted-foreground">
            {formatINR(row.original.averageTransaction)}
          </span>
        ),
      },
      {
        id: 'lastTransactionAt',
        header: 'Last Transaction',
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-body-sm text-muted-foreground">
            {formatLastTransaction(row.original.lastTransactionAt)}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <MerchantStatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
            <MerchantRowActionsMenu
              merchant={row.original}
              onReview={onReview}
              onViewTransactions={onViewTransactions}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        ),
      },
    ],
    [
      onReview,
      onViewTransactions,
      onEdit,
      onChangeCategory,
      onDelete,
      categories,
      categoryVisualsById,
    ],
  )

  const table = useReactTable({
    data: merchants as MerchantRecord[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const columnWidths: Record<string, string> = {
    name: 'w-64',
    defaultCategory: 'w-44',
    transactionCount: 'w-28',
    totalSpend: 'w-32',
    averageTransaction: 'w-32',
    lastTransactionAt: 'w-32',
    status: 'w-24',
    actions: 'w-20',
  }

  const alignRight = new Set([
    'transactionCount',
    'totalSpend',
    'averageTransaction',
    'lastTransactionAt',
  ])
  const alignCenter = new Set(['status', 'actions'])

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="overflow-x-auto"
    >
      <table className="w-full min-w-240 border-collapse text-left">
        <thead className="sticky top-0 z-10 bg-card">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border">
              {headerGroup.headers.map((header) => {
                const sortId = header.column.id as MerchantSort['id']
                const isSortable = sortableColumns.includes(sortId)
                const isActive = sort?.id === sortId
                return (
                  <th
                    key={header.id}
                    className={cn(
                      'group/header p-md text-label-caps text-muted-foreground uppercase',
                      columnWidths[header.column.id],
                      alignRight.has(header.column.id) && 'text-right',
                      alignCenter.has(header.column.id) && 'text-center',
                    )}
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({ id: sortId, desc: isActive ? !sort?.desc : false })
                        }
                        className={cn(
                          'flex items-center gap-xs transition-colors hover:text-foreground',
                          alignRight.has(header.column.id) && 'ml-auto',
                          isActive && 'text-foreground',
                        )}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {isActive ? (
                          sort?.desc ? (
                            <ArrowDown className="size-3" aria-hidden="true" />
                          ) : (
                            <ArrowUp className="size-3" aria-hidden="true" />
                          )
                        ) : (
                          <ArrowUpDown
                            className="size-3 opacity-0 transition-opacity group-hover/header:opacity-50"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                )
              })}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y divide-border">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={(e) => {
                // Whole-row click is a mouse convenience layered on top of
                // the name button and the "Review Merchant" menu item,
                // which are the fully keyboard-accessible equivalents — so
                // this only needs to no-op when the click originated from
                // one of the row's own interactive controls (category
                // selector, row action buttons) rather than implement its
                // own keyboard handling.
                const target = e.target as HTMLElement
                if (target.closest('button, [role="combobox"], [role="menuitem"]')) return
                onReview(row.original)
              }}
              className={cn(
                'group/row cursor-pointer transition-colors hover:bg-surface-hover',
                row.original.id === selectedMerchantId &&
                  'bg-surface-selected hover:bg-surface-selected',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td
                  key={cell.id}
                  className={cn(
                    'px-md py-sm align-middle',
                    alignRight.has(cell.column.id) && 'text-right',
                    alignCenter.has(cell.column.id) && 'text-center',
                  )}
                >
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </motion.div>
  )
}
