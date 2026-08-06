import { useMemo } from 'react'
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ClientStatusBadge } from '@/components/clients/ClientStatusBadge'
import { ClientRowActionsMenu } from '@/components/clients/ClientRowActionsMenu'
import { getBankInitials } from '@/utils/bank'
import { formatINR } from '@/utils/currency'
import type { ClientRecord, ClientSort } from '@/domain/Client'

interface ClientTableProps {
  clients: readonly ClientRecord[]
  sort: ClientSort | undefined
  onSortChange: (sort: ClientSort) => void
  onReview: (client: ClientRecord) => void
  onViewTransactions: (client: ClientRecord) => void
  onEdit: (client: ClientRecord) => void
  onDelete: (client: ClientRecord) => void
  selectedClientId?: string | null
}

const sortableColumns: ClientSort['id'][] = ['name', 'totalSpend', 'transactionCount', 'createdAt']

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function ClientTable({
  clients,
  sort,
  onSortChange,
  onReview,
  onViewTransactions,
  onEdit,
  onDelete,
  selectedClientId,
}: ClientTableProps) {
  const columns = useMemo<ColumnDef<ClientRecord>[]>(
    () => [
      {
        id: 'name',
        header: 'Client',
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Avatar className="shrink-0">
              <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                {getBankInitials(row.original.name)}
              </AvatarFallback>
            </Avatar>
            <button
              type="button"
              data-client-row-trigger={row.original.id}
              onClick={(e) => {
                e.stopPropagation()
                onReview(row.original)
              }}
              className="truncate text-body-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline"
            >
              {row.original.name}
            </button>
          </div>
        ),
      },
      {
        id: 'email',
        header: 'Email',
        cell: ({ row }) => (
          <span className="text-body-sm text-muted-foreground">{row.original.email ?? '—'}</span>
        ),
      },
      {
        id: 'company',
        header: 'Company',
        cell: ({ row }) => (
          <span className="text-body-sm text-foreground">{row.original.company ?? '—'}</span>
        ),
      },
      {
        id: 'phone',
        header: 'Phone',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono text-body-sm text-muted-foreground">
            {row.original.phone ?? '—'}
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => <ClientStatusBadge status={row.original.status} />,
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
        id: 'transactionCount',
        header: 'Transactions',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-foreground">
            {row.original.transactionCount.toLocaleString('en-IN')}
          </span>
        ),
      },
      {
        id: 'linkedAccountsCount',
        header: 'Accounts',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-muted-foreground">
            {row.original.linkedAccountsCount}
          </span>
        ),
      },
      {
        id: 'linkedCreditCardsCount',
        header: 'Cards',
        cell: ({ row }) => (
          <span className="text-table-mono tabular-nums text-muted-foreground">
            {row.original.linkedCreditCardsCount}
          </span>
        ),
      },
      {
        id: 'createdAt',
        header: 'Created Date',
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-table-mono text-body-sm text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        size: 48,
        cell: ({ row }) => (
          <ClientRowActionsMenu
            client={row.original}
            onReview={onReview}
            onViewTransactions={onViewTransactions}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ),
      },
    ],
    [onReview, onViewTransactions, onEdit, onDelete],
  )

  const table = useReactTable({
    data: clients as ClientRecord[],
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
                const sortId = header.column.id as ClientSort['id']
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
                          'flex items-center gap-xs whitespace-nowrap transition-colors hover:text-foreground',
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
                const target = e.target as HTMLElement
                if (target.closest('button, [role="combobox"], [role="menuitem"]')) return
                onReview(row.original)
              }}
              className={cn(
                'cursor-pointer transition-colors hover:bg-accent/40',
                row.original.id === selectedClientId && 'bg-accent/60 hover:bg-accent/60',
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
