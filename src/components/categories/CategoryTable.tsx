import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CategoryStatusBadge } from '@/components/categories/CategoryStatusBadge'
import { CategoryRowActionsMenu } from '@/components/categories/CategoryRowActionsMenu'
import {
  categoryColorClassNames,
  resolveCategoryIcon,
} from '@/components/categories/categoryVisuals'
import type { CategoryRecord, CategorySort } from '@/domain/Category'

interface CategoryTableProps {
  categories: readonly CategoryRecord[]
  sort: CategorySort | undefined
  onSortChange: (sort: CategorySort) => void
  onViewTransactions: (category: CategoryRecord) => void
  onViewMerchants: (category: CategoryRecord) => void
  onEdit: (category: CategoryRecord) => void
  onDelete: (category: CategoryRecord) => void
}

const sortableColumns: CategorySort['id'][] = [
  'name',
  'transactionCount',
  'merchantsAssigned',
  'lastUpdatedAt',
]

export function CategoryTable({
  categories,
  sort,
  onSortChange,
  onViewTransactions,
  onViewMerchants,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  const columns = useMemo<ColumnDef<CategoryRecord>[]>(
    () => [
      {
        id: 'name',
        header: 'Category Name',
        cell: ({ row }) => {
          const category = row.original
          const Icon = resolveCategoryIcon(category.icon)
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded',
                  categoryColorClassNames[category.color],
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <span className="text-body-sm font-semibold text-foreground">{category.name}</span>
            </div>
          )
        },
      },
      {
        id: 'parentCategory',
        header: 'Parent Category',
        cell: ({ row }) => (
          <span className="text-body-sm text-muted-foreground">
            {row.original.parentCategory?.name ?? '—'}
          </span>
        ),
      },
      {
        id: 'description',
        header: 'Description',
        cell: ({ row }) => (
          <span className="block max-w-64 truncate text-body-sm text-muted-foreground">
            {row.original.description}
          </span>
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
        id: 'merchantsAssigned',
        header: 'Merchants Assigned',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-foreground">
            {row.original.merchantsAssigned.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <CategoryStatusBadge status={row.original.status} />,
      },
      {
        id: 'lastUpdatedAt',
        header: 'Last Updated',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono tabular-nums text-body-sm text-muted-foreground">
            {new Date(row.original.lastUpdatedAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <CategoryRowActionsMenu
            category={row.original}
            onViewTransactions={onViewTransactions}
            onViewMerchants={onViewMerchants}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onViewTransactions, onViewMerchants, onEdit, onDelete],
  )

  const table = useReactTable({
    data: categories as CategoryRecord[],
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
                const sortId = header.column.id as CategorySort['id']
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
            <tr key={row.id} className="transition-colors hover:bg-accent/40">
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
