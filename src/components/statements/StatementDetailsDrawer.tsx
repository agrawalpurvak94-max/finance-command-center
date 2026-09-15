import { useState } from 'react'
import { FileText, NotebookPen, Clock, ScrollText, Pencil } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IconChip } from '@/components/ui/icon-chip'
import {
  DrawerSectionHeader,
  DrawerStat,
  EntityReviewDrawerFooter,
} from '@/components/EntityReviewDrawer'
import { StatementStatusBadge } from '@/components/statements/StatementStatusBadge'
import { formatStatementDate, toDateInputValue } from '@/lib/statementDate'
import { useUpdateStatement } from '@/hooks/useStatements'
import { useUpdateAccountHolder } from '@/hooks/useDashboard'
import type { Statement } from '@/domain/Statement'

interface StatementDetailsDrawerProps {
  statement: Statement | null
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Fires after a successful save with the fresh statement and a toast message — see Statements.tsx. */
  onSaved: (statement: Statement, message: string) => void
}

export function StatementDetailsDrawer({
  statement,
  open,
  onOpenChange,
  onSaved,
}: StatementDetailsDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-112 (numbered scale, = 28rem), not sm:max-w-md — this app's
          --spacing-md token shadows Tailwind's named max-w-md scale; see
          ui/dialog.tsx. */}
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        {/* Keyed by statement id so switching statements (or reopening after
            a cancelled edit) always mounts a fresh instance seeded straight
            from props — same fix MerchantReviewDrawer's DrawerBody uses
            instead of a resync effect. */}
        {statement && <DrawerBody key={statement.id} statement={statement} onSaved={onSaved} />}
      </SheetContent>
    </Sheet>
  )
}

function DrawerBody({
  statement,
  onSaved,
}: {
  statement: Statement
  onSaved: (statement: Statement, message: string) => void
}) {
  const { account } = statement
  const [editing, setEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [accountHolder, setAccountHolder] = useState('')
  const [statementDate, setStatementDate] = useState('')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')

  const updateStatement = useUpdateStatement()
  const updateAccountHolder = useUpdateAccountHolder()

  const periodError =
    periodStart && periodEnd && periodEnd < periodStart
      ? 'Statement Period End must be on or after Statement Period Start.'
      : null

  function startEdit() {
    setAccountHolder(account.accountHolder ?? '')
    setStatementDate(toDateInputValue(statement.statementDate))
    setPeriodStart(toDateInputValue(statement.statementPeriodStart))
    setPeriodEnd(toDateInputValue(statement.statementPeriodEnd))
    setSaveError(null)
    setEditing(true)
  }

  function cancelEdit() {
    setSaveError(null)
    setEditing(false)
  }

  async function handleSave() {
    if (periodError || isSaving) return

    const trimmedHolder = accountHolder.trim()
    const nextHolder = trimmedHolder || null
    const holderChanged = nextHolder !== (account.accountHolder ?? null)
    const metadataChanged =
      statementDate !== toDateInputValue(statement.statementDate) ||
      periodStart !== toDateInputValue(statement.statementPeriodStart) ||
      periodEnd !== toDateInputValue(statement.statementPeriodEnd)

    if (!holderChanged && !metadataChanged) {
      setEditing(false)
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      // Holder first: statements.update() re-fetches through vw_statements /
      // vw_accounts, so running the holder write first means that re-fetch
      // (when metadata also changed) already reflects the new holder.
      if (holderChanged) {
        await updateAccountHolder.mutateAsync({
          accountId: account.id,
          kind: account.kind,
          accountHolder: nextHolder,
        })
      }

      const refreshed = metadataChanged
        ? await updateStatement.mutateAsync({
            id: statement.id,
            input: {
              statementDate: statementDate || null,
              statementPeriodStart: periodStart || null,
              statementPeriodEnd: periodEnd || null,
            },
          })
        : statement

      const finalStatement: Statement =
        holderChanged && !metadataChanged
          ? { ...refreshed, account: { ...refreshed.account, accountHolder: nextHolder } }
          : refreshed

      setEditing(false)
      onSaved(finalStatement, `${statement.fileName || 'Statement'} updated.`)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save changes. Try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <SheetHeader className="sr-only">
        <SheetTitle>{statement.fileName}</SheetTitle>
        <SheetDescription>Full details for the selected statement.</SheetDescription>
      </SheetHeader>

      <div className="flex flex-col gap-lg px-lg pb-lg">
        {/* pr-8: clears the Sheet's own absolute top-3 right-3 close button,
            which this header row would otherwise sit directly under. */}
        <div className="flex items-start gap-md pr-8">
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

        {!editing && (
          <div className="-mt-sm flex justify-end">
            <Button variant="ghost" size="sm" onClick={startEdit}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
          </div>
        )}

        <Separator />

        <div className="grid grid-cols-2 gap-md">
          {editing ? (
            <div className="col-span-2 min-w-0">
              <Label htmlFor={`stmt-edit-holder-${statement.id}`}>Account Holder</Label>
              <Input
                id={`stmt-edit-holder-${statement.id}`}
                value={accountHolder}
                onChange={(e) => setAccountHolder(e.target.value)}
                placeholder="e.g. Husband, Wife, Business"
              />
            </div>
          ) : (
            <DrawerStat
              label="Account Holder"
              value={account.accountHolder ?? 'Unassigned'}
              valueClassName="font-normal"
            />
          )}

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

          {editing ? (
            <div className="min-w-0">
              <Label htmlFor={`stmt-edit-date-${statement.id}`}>Statement Date</Label>
              <Input
                id={`stmt-edit-date-${statement.id}`}
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
              />
            </div>
          ) : (
            <DrawerStat
              label="Statement Date"
              value={formatStatementDate(statement.statementDate)}
              valueClassName="font-normal"
            />
          )}

          {editing ? (
            <div className="col-span-2 min-w-0">
              <p className="mb-xs text-label-caps text-muted-foreground uppercase">
                Statement Period
              </p>
              <div className="grid grid-cols-2 gap-sm">
                <div>
                  <Label htmlFor={`stmt-edit-period-start-${statement.id}`} className="sr-only">
                    Statement period start
                  </Label>
                  <Input
                    id={`stmt-edit-period-start-${statement.id}`}
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    aria-invalid={!!periodError}
                  />
                </div>
                <div>
                  <Label htmlFor={`stmt-edit-period-end-${statement.id}`} className="sr-only">
                    Statement period end
                  </Label>
                  <Input
                    id={`stmt-edit-period-end-${statement.id}`}
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    aria-invalid={!!periodError}
                  />
                </div>
              </div>
              {periodError && (
                <p role="alert" className="mt-xs text-[11px] text-destructive">
                  {periodError}
                </p>
              )}
            </div>
          ) : (
            <DrawerStat
              label="Statement Period"
              value={statement.statementPeriodLabel}
              valueClassName="font-normal"
            />
          )}

          <DrawerStat
            label="Uploaded Date"
            value={statement.importedAt}
            valueClassName="font-normal"
          />
          {statement.client && (
            <DrawerStat label="Client" value={statement.client.name} valueClassName="font-normal" />
          )}
        </div>

        {saveError && (
          <p role="alert" className="text-body-sm text-destructive">
            {saveError}
          </p>
        )}

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

      {editing && (
        <EntityReviewDrawerFooter onCancel={cancelEdit} onSave={handleSave} isSaving={isSaving} />
      )}
    </>
  )
}
