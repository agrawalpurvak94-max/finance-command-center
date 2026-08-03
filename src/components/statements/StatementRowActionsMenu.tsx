import { Eye, RefreshCw, Download, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Statement } from '@/domain/Statement'

interface StatementRowActionsMenuProps {
  statement: Statement
  onOpenDetails: (statement: Statement) => void
  onReprocess: (statement: Statement) => void
  onDelete: (statement: Statement) => void
  isReprocessing?: boolean
}

export function StatementRowActionsMenu({
  statement,
  onOpenDetails,
  onReprocess,
  onDelete,
  isReprocessing,
}: StatementRowActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" aria-label={`Actions for ${statement.fileName}`} />
        }
      >
        <MoreVertical className="size-4" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onOpenDetails(statement)}>
          <Eye className="size-4" aria-hidden="true" />
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isReprocessing} onClick={() => onReprocess(statement)}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Reprocess
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Download className="size-4" aria-hidden="true" />
          Download Original
          <span className="ml-auto text-[10px] text-muted-foreground">No file</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => onDelete(statement)}>
          <Trash2 className="size-4" aria-hidden="true" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
