import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown, Store } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MerchantStatusBadge } from '@/components/merchants/MerchantStatusBadge'
import { MerchantRowActionsMenu } from '@/components/merchants/MerchantRowActionsMenu'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { formatINR } from '@/utils/currency'
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
}

const sortableColumns: MerchantSort['id'][] = [
  'name',
  'transactionCount',
  'totalSpend',
  'averageTransaction',
  'lastTransactionAt',
]

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
}: MerchantTableProps) {
  const columns = useMemo<ColumnDef<MerchantRecord>[]>(
    () => [
      {
        id: 'name',
        header: 'Merchant Name',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <Store className="size-4" aria-hidden="true" />
            </div>
            <button
              type="button"
              data-merchant-row-trigger={row.original.id}
              onClick={(e) => {
                e.stopPropagation()
                onReview(row.original)
              }}
              className="text-body-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline"
            >
              {row.original.name}
            </button>
          </div>
        ),
      },
      {
        id: 'defaultCategory',
        header: 'Default Category',
        cell: ({ row }) => (
          <CategorySelector
            category={row.original.defaultCategory}
            onChange={(categoryId) => onChangeCategory(row.original, categoryId)}
          />
        ),
      },
      {
        id: 'transactionCount',
        header: 'Transaction Count',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums font-bold text-foreground">
            {row.original.transactionCount.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'totalSpend',
        header: 'Total Spend',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-foreground">
            {formatINR(row.original.totalSpend)}
          </span>
        ),
      },
      {
        id: 'averageTransaction',
        header: 'Average Transaction',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-muted-foreground">
            {formatINR(row.original.averageTransaction)}
          </span>
        ),
      },
      {
        id: 'lastTransactionAt',
        header: 'Last Transaction',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono tabular-nums text-body-sm text-muted-foreground">
            {row.original.lastTransactionAt
              ? new Date(row.original.lastTransactionAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : '—'}
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
        size: 48,
        cell: ({ row }) => (
          <MerchantRowActionsMenu
            merchant={row.original}
            onReview={onReview}
            onViewTransactions={onViewTransactions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onReview, onViewTransactions, onEdit, onChangeCategory, onDelete],
  )

  const table = useReactTable({
    data: merchants as MerchantRecord[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="overflow-x-auto">
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
                    className="p-md text-label-caps uppercase text-muted-foreground"
                  >
                    {isSortable ? (
                      <button
                        type="button"
                        onClick={() =>
                          onSortChange({ id: sortId, desc: isActive ? !sort?.desc : false })
                        }
                        className={cn(
                          'flex items-center gap-xs transition-colors hover:text-foreground',
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
                          <ArrowUpDown className="size-3 opacity-40" aria-hidden="true" />
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
                'cursor-pointer transition-colors hover:bg-accent/40',
                row.original.id === selectedMerchantId && 'bg-accent/60 hover:bg-accent/60',
              )}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="p-md align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
