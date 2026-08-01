import { useState } from 'react'
import {
  CheckCircle2,
  Tag,
  Users,
  Store,
  NotebookPen,
  Download,
  Trash2,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import type { Category, Client, Merchant } from '@/types/transaction'

interface BulkActionToolbarProps {
  selectedCount: number
  categories: readonly Category[]
  clients: readonly Client[]
  merchants: readonly Merchant[]
  onMarkReviewed: () => void
  onChangeCategory: (categoryId: string) => void
  onAssignClient: (clientId: string) => void
  onChangeMerchant: (merchantId: string) => void
  onAddNotes: (notes: string) => void
  onExportSelected: () => void
  onDeleteSelected: () => void
  isMutating?: boolean
}

export function BulkActionToolbar({
  selectedCount,
  categories,
  clients,
  merchants,
  onMarkReviewed,
  onChangeCategory,
  onAssignClient,
  onChangeMerchant,
  onAddNotes,
  onExportSelected,
  onDeleteSelected,
  isMutating,
}: BulkActionToolbarProps) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState('')
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  if (selectedCount === 0) return null

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-md py-sm">
        <div className="flex items-center gap-md">
          <span className="text-body-sm font-medium text-foreground">{selectedCount} selected</span>
          <div className="h-4 w-px bg-border" />
          <div className="flex flex-wrap items-center gap-sm">
            <Button variant="ghost" size="sm" onClick={onMarkReviewed} disabled={isMutating}>
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Mark as Reviewed
            </Button>

            <Select
              onValueChange={(value: string | null) => {
                if (value) onChangeCategory(value)
              }}
            >
              <SelectTrigger size="sm" aria-label="Categorize selected transactions">
                <Tag className="size-4 text-muted-foreground" aria-hidden="true" />
                <SelectValue placeholder="Categorize">
                  {(current: string) => categories.find((c) => c.id === current)?.name ?? current}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" />}
                disabled={isMutating}
              >
                <MoreHorizontal className="size-4" aria-hidden="true" />
                More Actions
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => onChangeCategory(categories[0]?.id ?? '')}>
                  <Tag className="size-4" aria-hidden="true" />
                  Change Category
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onAssignClient(clients[0]?.id ?? '')}>
                  <Users className="size-4" aria-hidden="true" />
                  Assign Client
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onChangeMerchant(merchants[0]?.id ?? '')}>
                  <Store className="size-4" aria-hidden="true" />
                  Change Merchant
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNotesOpen(true)}>
                  <NotebookPen className="size-4" aria-hidden="true" />
                  Add Notes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onExportSelected}>
                  <Download className="size-4" aria-hidden="true" />
                  Export Selected
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteConfirmOpen(true)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete Selected
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add notes to {selectedCount} transactions</DialogTitle>
            <DialogDescription>
              This replaces any existing note on the selected rows.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Add a note…"
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                onAddNotes(notesDraft)
                setNotesDraft('')
                setNotesOpen(false)
              }}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={`Delete ${selectedCount} transactions?`}
        description="This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          onDeleteSelected()
          setDeleteConfirmOpen(false)
        }}
        isPending={isMutating}
      />
    </>
  )
}
