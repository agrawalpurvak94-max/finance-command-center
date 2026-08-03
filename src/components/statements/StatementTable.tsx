import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import { StatementRowActionsMenu } from '@/components/statements/StatementRowActionsMenu'
import type { Statement, StatementSort } from '@/domain/Statement'

interface StatementTableProps {
  statements: readonly Statement[]
  sort: StatementSort | undefined
  onSortChange: (sort: StatementSort) => void
  onOpenDetails: (statement: Statement) => void
  onReprocess: (statement: Statement) => void
  onDelete: (statement: Statement) => void
  reprocessingId?: string | null
}

const sortableColumns: StatementSort['id'][] = [
  'statementDate',
  'importedAt',
  'transactionsExtracted',
]

export function StatementTable({
  statements,
  sort,
  onSortChange,
  onOpenDetails,
  onReprocess,
  onDelete,
  reprocessingId,
}: StatementTableProps) {
  const columns = useMemo<ColumnDef<Statement>[]>(
    () => [
      {
        id: 'statementDate',
        header: 'Statement Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono tabular-nums text-body-sm">
            {new Date(row.original.statementDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        ),
      },
      {
        id: 'bank',
        header: 'Bank',
        cell: ({ row }) => (
          <span className="text-body-sm font-medium text-foreground">
            {row.original.account.bankName}
          </span>
        ),
      },
      {
        id: 'account',
        header: 'Account/Card',
        cell: ({ row }) => {
          const { account } = row.original
          return (
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {account.kind === 'credit_card'
                ? `${account.cardNetwork} •••• ${account.last4}`
                : `•••• ${account.last4}`}
            </span>
          )
        },
      },
      {
        id: 'statementPeriod',
        header: 'Statement Period',
        cell: ({ row }) => (
          <span className="text-body-sm text-foreground">{row.original.statementPeriodLabel}</span>
        ),
      },
      {
        id: 'fileName',
        header: 'File Name',
        cell: ({ row }) => (
          <span className="text-table-mono text-body-sm text-muted-foreground">
            {row.original.fileName}
          </span>
        ),
      },
      {
        id: 'transactionsExtracted',
        header: 'Transactions Extracted',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums font-bold text-foreground">
            {row.original.transactionsExtracted}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Processing Status',
        cell: ({ row }) => <StatementStatusBadge status={row.original.status} />,
      },
      {
        id: 'importedAt',
        header: 'Imported On',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono tabular-nums text-body-sm text-muted-foreground">
            {new Date(row.original.importedAt).toLocaleDateString('en-IN', {
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
          <StatementRowActionsMenu
            statement={row.original}
            onOpenDetails={onOpenDetails}
            onReprocess={onReprocess}
            onDelete={onDelete}
            isReprocessing={reprocessingId === row.original.id}
          />
        ),
      },
    ],
    [onOpenDetails, onReprocess, onDelete, reprocessingId],
  )

  const table = useReactTable({
    data: statements as Statement[],
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
                const sortId = header.column.id as StatementSort['id']
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
