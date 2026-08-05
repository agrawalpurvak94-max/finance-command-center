import { NotebookPen, Clock, ScrollText } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import type { Statement } from '@/domain/Statement'

interface StatementDetailsDrawerProps {
  statement: Statement | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function StatementDetailsDrawer({
  statement,
  open,
  onOpenChange,
}: StatementDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-112 (numbered scale, = 28rem), not sm:max-w-md — this app's
          --spacing-md token shadows Tailwind's named max-w-md scale; see
          ui/dialog.tsx. */}
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        {statement && <DrawerBody statement={statement} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({ statement }: { statement: Statement }) {
  const { account } = statement

  return (
    <>
      <SheetHeader>
        <SheetTitle>Statement Details</SheetTitle>
        <SheetDescription className="sr-only">
          Full details for the selected statement.
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-body-sm font-medium text-foreground">{statement.fileName}</p>
            <p className="text-[11px] text-muted-foreground">{statement.statementPeriodLabel}</p>
          </div>
          <StatementStatusBadge status={statement.status} />
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Bank</p>
            <p className="text-body-sm text-foreground">{account.bankName}</p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Account</p>
            <p className="text-[11px] tabular-nums text-muted-foreground">
              {account.kind === 'credit_card'
                ? `${account.cardNetwork} •••• ${account.last4}`
                : `•••• ${account.last4}`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Statement Period
            </p>
            <p className="text-body-sm text-foreground">{statement.statementPeriodLabel}</p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Uploaded Date</p>
            <p className="text-body-sm text-foreground">{statement.importedAt}</p>
          </div>
        </div>

        <div>
          <p className="mb-xs text-label-caps uppercase text-muted-foreground">
            Transactions Extracted
          </p>
          <p className="text-display-kpi tabular-nums text-foreground">
            {statement.transactionsExtracted}
          </p>
        </div>

        {statement.client && (
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Client</p>
            <p className="text-body-sm text-foreground">{statement.client.name}</p>
          </div>
        )}

        <Separator />

        <div>
          <p className="mb-sm flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <NotebookPen className="size-3.5" aria-hidden="true" />
            Notes
          </p>
          <p className="text-body-sm text-muted-foreground">
            {statement.notes ?? 'No notes on this statement yet.'}
          </p>
        </div>

        <div>
          <p className="mb-sm flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            Processing Timeline
          </p>
          <p className="text-body-sm text-muted-foreground">
            A step-by-step processing timeline isn't tracked yet — planned once this module reads
            from Supabase.
          </p>
        </div>

        <div>
          <p className="mb-sm flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <ScrollText className="size-3.5" aria-hidden="true" />
            Import Logs
          </p>
          <p className="text-body-sm text-muted-foreground">
            Import logs aren't captured yet — planned once this module reads from Supabase.
          </p>
        </div>
      </div>
    </>
  )
}
