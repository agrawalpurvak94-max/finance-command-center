import { ArrowUpRight, Pencil, Tag, Trash2, MoreVertical, Combine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { MerchantRecord } from '@/domain/Merchant'

interface MerchantRowActionsMenuProps {
  merchant: MerchantRecord
  onViewTransactions: (merchant: MerchantRecord) => void
  onEdit: (merchant: MerchantRecord) => void
  onDelete: (merchant: MerchantRecord) => void
}

export function MerchantRowActionsMenu({
  merchant,
  onViewTransactions,
  onEdit,
  onDelete,
}: MerchantRowActionsMenuProps) {
  return (
    <div className="flex items-center justify-center gap-xs">
      <Button
        variant="ghost"
        size="icon"
        aria-label={`View transactions for ${merchant.name}`}
        title="View Transactions"
        onClick={() => onViewTransactions(merchant)}
      >
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" aria-label={`More actions for ${merchant.name}`} />
          }
        >
          <MoreVertical className="size-4" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(merchant)}>
            <Pencil className="size-4" aria-hidden="true" />
            Edit Merchant
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(merchant)}>
            <Tag className="size-4" aria-hidden="true" />
            Change Category
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Combine className="size-4" aria-hidden="true" />
            Merge Merchants
            <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(merchant)}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
