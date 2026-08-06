import { ArrowUpRight, Pencil, Trash2, MoreVertical, IdCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { ClientRecord } from '@/domain/Client'

interface ClientRowActionsMenuProps {
  client: ClientRecord
  onReview: (client: ClientRecord) => void
  onViewTransactions: (client: ClientRecord) => void
  onEdit: (client: ClientRecord) => void
  onDelete: (client: ClientRecord) => void
}

export function ClientRowActionsMenu({
  client,
  onReview,
  onViewTransactions,
  onEdit,
  onDelete,
}: ClientRowActionsMenuProps) {
  return (
    <div className="flex items-center justify-center gap-xs">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`View transactions for ${client.name}`}
        title="View Transactions"
        onClick={() => onViewTransactions(client)}
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`More actions for ${client.name}`} />
          }
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onReview(client)}>
            <IdCard className="size-4" aria-hidden="true" />
            Review Client
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => onEdit(client)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit Client
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(client)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
