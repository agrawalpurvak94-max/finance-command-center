import { FileText, NotebookPen, Clock, ScrollText } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { IconChip } from '@/components/ui/icon-chip'
import { DrawerSectionHeader, DrawerStat } from '@/components/EntityReviewDrawer'
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
      <SheetHeader className="sr-only">
        <SheetTitle>{statement.fileName}</SheetTitle>
        <SheetDescription>Full details for the selected statement.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        <div className="flex items-start gap-md">
          <IconChip size="lg" tone="info">
            <FileText className="size-6" aria-hidden="true" />
          </IconChip>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-sm">
              <p className="truncate text-headline-sm text-foreground">{statement.fileName}</p>
              <StatementStatusBadge status={statement.status} />
            </div>
            <p className="text-body-sm text-muted-foreground">{statement.statementPeriodLabel}</p>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-md">
          <DrawerStat label="Bank" value={account.bankName} valueClassName="font-normal" />
          <DrawerStat
            label="Account"
            value={
              account.kind === 'credit_card' && account.cardNetwork
                ? `${account.cardNetwork} •••• ${account.last4}`
                : `•••• ${account.last4}`
            }
            valueClassName="font-mono text-[13px] font-normal"
          />
          <DrawerStat
            label="Statement Period"
            value={statement.statementPeriodLabel}
            valueClassName="font-normal"
          />
          <DrawerStat
            label="Uploaded Date"
            value={statement.importedAt}
            valueClassName="font-normal"
          />
          {statement.client && (
            <DrawerStat label="Client" value={statement.client.name} valueClassName="font-normal" />
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-md">
          <p className="text-label-caps text-muted-foreground uppercase">Transactions Extracted</p>
          <p className="text-display-kpi tabular-nums text-foreground">
            {statement.transactionsExtracted}
          </p>
        </div>

        <Separator />

        <div>
          <DrawerSectionHeader icon={NotebookPen}>Notes</DrawerSectionHeader>
          <p className="mt-sm text-body-sm text-muted-foreground">
            {statement.notes ?? 'No notes on this statement yet.'}
          </p>
        </div>

        <div>
          <DrawerSectionHeader icon={Clock}>Processing Timeline</DrawerSectionHeader>
          <div className="mt-sm rounded-lg border border-dashed border-border bg-muted/20 px-md py-sm text-body-sm text-muted-foreground">
            A step-by-step processing timeline isn't tracked yet — planned once this module reads
            from Supabase.
          </div>
        </div>

        <div>
          <DrawerSectionHeader icon={ScrollText}>Import Logs</DrawerSectionHeader>
          <div className="mt-sm rounded-lg border border-dashed border-border bg-muted/20 px-md py-sm text-body-sm text-muted-foreground">
            Import logs aren't captured yet — planned once this module reads from Supabase.
          </div>
        </div>
      </div>
    </>
  )
}
