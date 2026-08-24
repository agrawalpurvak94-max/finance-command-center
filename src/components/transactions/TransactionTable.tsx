import { useMemo } from 'react'
import {
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { MerchantCell } from '@/components/transactions/MerchantCell'
import { AccountCell } from '@/components/transactions/AccountCell'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { ClientSelector } from '@/components/transactions/ClientSelector'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { StatusBadge } from '@/components/transactions/StatusBadge'
import { RowActionsMenu } from '@/components/transactions/RowActionsMenu'
import type { Transaction, TransactionPatch, TransactionSort } from '@/domain/Transaction'

interface TransactionTableProps {
  transactions: readonly Transaction[]
  sort: TransactionSort | undefined
  onSortChange: (sort: TransactionSort) => void
  rowSelection: RowSelectionState
  onRowSelectionChange: OnChangeFn<RowSelectionState>
  onOpenDetails: (transaction: Transaction) => void
  onDeleteOne: (transaction: Transaction) => void
  onUpdateOne: (id: string, patch: TransactionPatch) => void
}

const sortableColumns: TransactionSort['id'][] = ['date', 'merchant', 'amount', 'status']

export function TransactionTable({
  transactions,
  sort,
  onSortChange,
  rowSelection,
  onRowSelectionChange,
  onOpenDetails,
  onDeleteOne,
  onUpdateOne,
}: TransactionTableProps) {
  const shouldReduceMotion = useReducedMotion()

  const columns = useMemo<ColumnDef<Transaction>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllRowsSelected()}
            indeterminate={table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()}
            onCheckedChange={(checked) => table.toggleAllRowsSelected(!!checked)}
            aria-label="Select all transactions"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(checked) => row.toggleSelected(!!checked)}
            aria-label={`Select transaction with ${row.original.merchant.name}`}
          />
        ),
      },
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ getValue }) => (
          <span className="whitespace-nowrap text-table-mono tabular-nums text-muted-foreground">
            {new Date(getValue<string>()).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'merchant',
        accessorFn: (row) => row.merchant.name,
        header: 'Merchant',
        cell: ({ row }) => <MerchantCell merchant={row.original.merchant} />,
      },
      {
        id: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <CategorySelector
            category={row.original.category}
            onChange={(categoryId) => onUpdateOne(row.original.id, { categoryId })}
          />
        ),
      },
      {
        id: 'client',
        header: 'Client',
        cell: ({ row }) => (
          <ClientSelector
            client={row.original.client}
            onChange={(clientId) => onUpdateOne(row.original.id, { clientId })}
          />
        ),
      },
      {
        id: 'account',
        header: 'Bank / Card',
        cell: ({ row }) => <AccountCell account={row.original.account} />,
      },
      {
        id: 'ownerType',
        header: 'Biz/Pers',
        cell: ({ row }) => (
          <BizPersonalPill
            value={row.original.ownerType}
            onChange={(ownerType) => onUpdateOne(row.original.id, { ownerType })}
          />
        ),
      },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => {
          const isCredit = row.original.type === 'credit'
          return (
            <span
              className={cn(
                'whitespace-nowrap tabular-nums text-body-sm font-bold',
                isCredit ? 'text-secondary' : 'text-foreground',
              )}
            >
              {isCredit ? '+' : '−'}
              {formatINR(row.original.amount)}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue<Transaction['status']>()} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100">
            <RowActionsMenu
              transaction={row.original}
              onOpenDetails={onOpenDetails}
              onDelete={onDeleteOne}
            />
          </div>
        ),
      },
    ],
    [onOpenDetails, onDeleteOne, onUpdateOne],
  )

  const table = useReactTable({
    data: transactions as Transaction[],
    columns,
    state: { rowSelection },
    onRowSelectionChange,
    getRowId: (row) => row.id,
    getCoreRowModel: getCoreRowModel(),
    enableRowSelection: true,
  })

  const columnWidths: Record<string, string> = {
    select: 'w-10',
    date: 'w-28',
    merchant: 'w-56',
    category: 'w-40',
    client: 'w-36',
    account: 'w-36',
    ownerType: 'w-20',
    amount: 'w-32',
    status: 'w-28',
    actions: 'w-14',
  }

  const alignRight = new Set(['amount'])
  const alignCenter = new Set(['select', 'ownerType', 'actions'])

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
                const sortId = header.column.id as TransactionSort['id']
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
              data-state={row.getIsSelected() ? 'selected' : undefined}
              className="group/row transition-colors hover:bg-surface-hover data-[state=selected]:bg-surface-selected data-[state=selected]:hover:bg-surface-selected"
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
