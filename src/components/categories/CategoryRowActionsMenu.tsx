import { ArrowUpRight, Pencil, Store, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { CategoryRecord } from '@/domain/Category'

interface CategoryRowActionsMenuProps {
  category: CategoryRecord
  onViewTransactions: (category: CategoryRecord) => void
  onViewMerchants: (category: CategoryRecord) => void
  onEdit: (category: CategoryRecord) => void
  onDelete: (category: CategoryRecord) => void
}

export function CategoryRowActionsMenu({
  category,
  onViewTransactions,
  onViewMerchants,
  onEdit,
  onDelete,
}: CategoryRowActionsMenuProps) {
  return (
    <div className="flex items-center justify-center gap-xs">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`View transactions for ${category.name}`}
        title="View Transactions"
        onClick={() => onViewTransactions(category)}
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`More actions for ${category.name}`} />
          }
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onViewMerchants(category)}>
            <Store className="size-4" aria-hidden="true" />
            View Merchants
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(category)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
