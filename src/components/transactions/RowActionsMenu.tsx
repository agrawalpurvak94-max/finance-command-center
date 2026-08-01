import {
  Eye,
  Pencil,
  Tag,
  Store,
  Users,
  NotebookPen,
  SplitSquareHorizontal,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Transaction } from '@/domain/Transaction'

interface RowActionsMenuProps {
  transaction: Transaction
  onOpenDetails: (transaction: Transaction) => void
  onDelete: (transaction: Transaction) => void
}

export function RowActionsMenu({ transaction, onOpenDetails, onDelete }: RowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Actions for ${transaction.merchant.name}`}
          />
        }
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <Eye className="size-4" aria-hidden="true" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <Pencil className="size-4" aria-hidden="true" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <Tag className="size-4" aria-hidden="true" />
          Change Category
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <Store className="size-4" aria-hidden="true" />
          Assign Merchant
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <Users className="size-4" aria-hidden="true" />
          Assign Client
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onOpenDetails(transaction)}>
          <NotebookPen className="size-4" aria-hidden="true" />
          Add Note
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <SplitSquareHorizontal className="size-4" aria-hidden="true" />
          Split Transaction
          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(transaction)}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
