import { useState, type ReactNode } from 'react'
import { Paperclip, History } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { StatusBadge } from '@/components/transactions/StatusBadge'
import { MerchantCell } from '@/components/transactions/MerchantCell'
import { AccountCell } from '@/components/transactions/AccountCell'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { ClientSelector } from '@/components/transactions/ClientSelector'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import type { Transaction, TransactionPatch } from '@/domain/Transaction'

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-xs text-label-caps text-muted-foreground uppercase">{children}</p>
}

interface TransactionDetailsDrawerProps {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: (id: string, patch: TransactionPatch) => void
}

export function TransactionDetailsDrawer({
  transaction,
  open,
  onOpenChange,
  onUpdate,
}: TransactionDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-112 (numbered scale, = 28rem), not sm:max-w-md — this app's
          --spacing-md token shadows Tailwind's named max-w-md scale; see
          ui/dialog.tsx. */}
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        {transaction && (
          // Keyed by id so switching transactions remounts (and resets local
          // notes-draft state) instead of syncing it via an effect.
          <DrawerBody key={transaction.id} transaction={transaction} onUpdate={onUpdate} />
        )}
      </SheetContent>
    </Sheet>
  )
}

interface DrawerBodyProps {
  transaction: Transaction
  onUpdate: (id: string, patch: TransactionPatch) => void
}

function DrawerBody({ transaction, onUpdate }: DrawerBodyProps) {
  const [notesDraft, setNotesDraft] = useState(transaction.notes ?? '')

  return (
    <>
      <SheetHeader>
        <SheetTitle>Transaction Details</SheetTitle>
        <SheetDescription className="sr-only">
          Full details for the selected transaction.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        <div className="flex items-center justify-between gap-sm">
          <MerchantCell merchant={transaction.merchant} />
          <StatusBadge status={transaction.status} />
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-md">
          <FieldLabel>Amount</FieldLabel>
          <p
            className={cn(
              'text-display-kpi tabular-nums',
              transaction.type === 'credit' ? 'text-secondary' : 'text-foreground',
            )}
          >
            {transaction.type === 'credit' ? '+' : '−'}
            {formatINR(transaction.amount)}
          </p>
          <p className="mt-xs text-table-mono tabular-nums text-muted-foreground">
            {transaction.date}
          </p>
        </div>

        <Separator />

        <div>
          <p className="mb-sm text-label-caps font-semibold text-muted-foreground uppercase">
            Account
          </p>
          <AccountCell account={transaction.account} />
        </div>

        <div>
          <p className="mb-sm text-label-caps font-semibold text-muted-foreground uppercase">
            Classification
          </p>
          <div className="grid grid-cols-2 gap-md">
            <div>
              <FieldLabel>Category</FieldLabel>
              <CategorySelector
                category={transaction.category}
                onChange={(categoryId) => onUpdate(transaction.id, { categoryId })}
              />
            </div>
            <div>
              <FieldLabel>Client</FieldLabel>
              <ClientSelector
                client={transaction.client}
                onChange={(clientId) => onUpdate(transaction.id, { clientId })}
              />
            </div>
          </div>
          <div className="mt-md">
            <FieldLabel>Business / Personal</FieldLabel>
            <BizPersonalPill
              value={transaction.ownerType}
              onChange={(ownerType) => onUpdate(transaction.id, { ownerType })}
            />
          </div>
        </div>

        <Separator />

        <div>
          <Label htmlFor="drawer-notes">Notes</Label>
          <Textarea
            id="drawer-notes"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            rows={3}
            placeholder="Add a note…"
            className="mt-xs"
          />
          <Button
            size="sm"
            className="mt-sm"
            disabled={notesDraft === (transaction.notes ?? '')}
            onClick={() => onUpdate(transaction.id, { notes: notesDraft || null })}
          >
            Save Note
          </Button>
        </div>

        <Separator />

        <div>
          <p className="mb-sm flex items-center gap-xs text-label-caps text-muted-foreground uppercase">
            <Paperclip className="size-3.5" aria-hidden="true" />
            Attachments
          </p>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-md py-sm text-body-sm text-muted-foreground">
            No attachments yet — receipt upload is planned for a future module.
          </div>
        </div>

        <div>
          <p className="mb-sm flex items-center gap-xs text-label-caps text-muted-foreground uppercase">
            <History className="size-3.5" aria-hidden="true" />
            Audit Timeline
          </p>
          <div className="rounded-lg border border-dashed border-border bg-muted/20 px-md py-sm text-body-sm text-muted-foreground">
            Change history isn't tracked yet — planned once this module reads from Supabase.
          </div>
        </div>
      </div>
    </>
  )
}
