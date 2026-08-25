import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { motion, useReducedMotion } from 'motion/react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import { StatementRowActionsMenu } from '@/components/statements/StatementRowActionsMenu'
import { getInstitutionIdentity } from '@/lib/institutionIdentity'
import type { Statement, StatementSort } from '@/domain/Statement'

interface StatementTableProps {
  statements: readonly Statement[]
  sort: StatementSort | undefined
  onSortChange: (sort: StatementSort) => void
  onOpenDetails: (statement: Statement) => void
  onReprocess: (statement: Statement) => void
  onDelete: (statement: Statement) => void
  /** Opens Statement Explorer for this row — the row's primary click target. */
  onOpenExplorer: (statement: Statement) => void
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
  onOpenExplorer,
  reprocessingId,
}: StatementTableProps) {
  const columns = useMemo<ColumnDef<Statement>[]>(
    () => [
      {
        id: 'statementDate',
        header: 'Statement Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap tabular-nums text-body-sm">
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
        cell: ({ row }) => {
          const { bankName } = row.original.account
          const identity = getInstitutionIdentity(bankName)
          return (
            <div className="flex min-w-0 items-center gap-xs">
              <div
                aria-hidden="true"
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
                  identity.chipClassName,
                )}
              >
                {identity.initials}
              </div>
              <span className="truncate text-body-sm font-medium text-foreground">{bankName}</span>
            </div>
          )
        },
      },
      {
        id: 'account',
        header: 'Account/Card',
        cell: ({ row }) => {
          const { account } = row.original
          // account.cardNetwork is genuinely null on every live card today
          // (unpopulated in Supabase) -- interpolating it directly rendered
          // the literal string "null" in this column; omit it instead.
          return (
            <span className="font-mono text-[11px] tracking-wide tabular-nums text-muted-foreground">
              {account.kind === 'credit_card' && account.cardNetwork
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
          <span
            title={row.original.statementPeriodLabel}
            className="block max-w-40 truncate text-body-sm text-foreground"
          >
            {row.original.statementPeriodLabel}
          </span>
        ),
      },
      {
        id: 'fileName',
        header: 'File Name',
        cell: ({ row }) => (
          <span
            title={row.original.fileName}
            className="block max-w-48 truncate text-body-sm text-muted-foreground"
          >
            {row.original.fileName}
          </span>
        ),
      },
      {
        id: 'transactionsExtracted',
        header: 'Transactions Extracted',
        cell: ({ row }) => (
          <span className="tabular-nums text-body-sm font-bold text-foreground">
            {row.original.transactionsExtracted}
            <span className="ml-1 text-[10px] font-normal text-muted-foreground">txns</span>
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
          <span className="whitespace-nowrap tabular-nums text-body-sm text-muted-foreground">
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
          // stopPropagation only: this div isn't itself interactive (its
          // child button already has full keyboard/mouse support) — it just
          // stops the click from bubbling to the row's onOpenExplorer, since
          // this cell sits inside a row whose own click opens Statement
          // Explorer and the actions menu is a distinct interaction.
          // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
          <div
            onClick={(e) => e.stopPropagation()}
            className="opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100"
          >
            <StatementRowActionsMenu
              statement={row.original}
              onOpenDetails={onOpenDetails}
              onReprocess={onReprocess}
              onDelete={onDelete}
              isReprocessing={reprocessingId === row.original.id}
            />
          </div>
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

  const shouldReduceMotion = useReducedMotion()

  const columnWidths: Record<string, string> = {
    statementDate: 'w-32',
    bank: 'w-40',
    account: 'w-36',
    statementPeriod: 'w-36',
    fileName: 'w-48',
    transactionsExtracted: 'w-32',
    status: 'w-36',
    importedAt: 'w-32',
    actions: 'w-14',
  }

  const alignRight = new Set(['transactionsExtracted', 'importedAt'])
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
                const sortId = header.column.id as StatementSort['id']
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
                          'flex items-center gap-xs uppercase transition-colors hover:text-foreground',
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
              onClick={() => onOpenExplorer(row.original)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpenExplorer(row.original)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Open Statement Explorer for ${row.original.fileName}`}
              className="group/row cursor-pointer transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
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
