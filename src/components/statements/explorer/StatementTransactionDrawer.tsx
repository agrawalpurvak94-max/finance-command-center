import { useNavigate } from 'react-router'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { InlineSelector } from '@/components/transactions/InlineSelector'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type {
  StatementExplorerDetail,
  StatementTransactionRow,
} from '@/domain/StatementTransaction'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { OwnerType } from '@/domain/Transaction'

interface StatementTransactionDrawerProps {
  row: StatementTransactionRow | null
  detail: StatementExplorerDetail | null
  onOpenChange: (open: boolean) => void
  categoryOptions: readonly Category[]
  onUpdateCategory: (rowId: string, category: string) => void
  clientOptions: readonly Client[]
  onUpdateClient: (rowId: string, clientId: string | null) => void
  onUpdateOwnerType: (rowId: string, ownerType: OwnerType) => void
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="min-w-0">
      <p className="text-label-caps uppercase text-muted-foreground">{label}</p>
      <p className="truncate text-body-sm text-foreground">{value || '—'}</p>
    </div>
  )
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * Statement Explorer's transaction side drawer — stays on Statement
 * Explorer, no navigation on open. "View in Transactions" scopes to the
 * same account (and this row's own date) rather than deep-linking a specific
 * `transactions` row: `statement_transactions` has no reliable FK to
 * `transactions.id`, so pretending the two records are the same row would
 * be a fabricated relationship.
 */
export function StatementTransactionDrawer({
  row,
  detail,
  onOpenChange,
  categoryOptions,
  onUpdateCategory,
  clientOptions,
  onUpdateClient,
  onUpdateOwnerType,
}: StatementTransactionDrawerProps) {
  const navigate = useNavigate()
  const open = row !== null

  const account = detail?.statement.account
  const isCard = account?.kind === 'credit_card'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-112">
        <SheetHeader>
          <SheetTitle className="sr-only">{row?.merchant ?? 'Transaction'}</SheetTitle>
          <SheetDescription className="sr-only">
            Full details for this statement transaction.
          </SheetDescription>
        </SheetHeader>

        {row && (
          <div className="flex flex-col gap-lg px-lg pb-lg">
            {/* Transaction */}
            <div className="flex flex-col gap-sm">
              <p className="text-label-caps uppercase text-muted-foreground">Transaction</p>
              <div className="flex items-start justify-between gap-sm">
                <div className="min-w-0">
                  <p className="truncate text-headline-sm text-foreground">{row.merchant}</p>
                  <p className="text-body-sm text-muted-foreground">{formatDate(row.date)}</p>
                </div>
                <p
                  className={cn(
                    'shrink-0 text-headline-lg tabular-nums',
                    row.type === 'debit' ? 'text-destructive' : 'text-secondary',
                  )}
                >
                  {row.type === 'debit' ? '−' : '+'}
                  {formatINR(row.amount)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <Field label="Debit/Credit" value={row.type === 'debit' ? 'Debit' : 'Credit'} />
                <div className="min-w-0">
                  <p className="text-label-caps uppercase text-muted-foreground">Category</p>
                  <InlineSelector
                    value={row.category}
                    options={categoryOptions
                      .filter((c) => c.name !== 'Uncategorized')
                      .map((c) => ({ id: c.name, name: c.name }))}
                    placeholder="Uncategorized"
                    emptyLabel="Uncategorized"
                    onChange={(v) => onUpdateCategory(row.id, v ?? 'Uncategorized')}
                    aria-label="Category"
                  />
                </div>
                <Field label="Category Source" value={row.categorySource} />
                <Field label="Transaction Type" value={row.type} />
                <Field
                  label="Confidence"
                  value={row.confidence !== null ? `${row.confidence}%` : null}
                />
                <Field label="Processing Status" value={row.status} />
                <div className="min-w-0">
                  <p className="text-label-caps uppercase text-muted-foreground">Client</p>
                  <InlineSelector
                    value={row.clientId}
                    options={clientOptions}
                    placeholder="No client"
                    emptyLabel="No client"
                    onChange={(v) => onUpdateClient(row.id, v)}
                    aria-label="Client"
                  />
                </div>
                <div className="min-w-0">
                  <p className="mb-xs text-label-caps uppercase text-muted-foreground">
                    Business / Personal
                  </p>
                  <BizPersonalPill
                    value={row.ownerType}
                    onChange={(v) => onUpdateOwnerType(row.id, v)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Account / Card */}
            <div className="flex flex-col gap-sm">
              <p className="text-label-caps uppercase text-muted-foreground">
                {isCard ? 'Card' : 'Account'}
              </p>
              <div className="grid grid-cols-2 gap-sm">
                <Field label="Bank" value={account?.bankName} />
                <Field label={isCard ? 'Card Name' : 'Account Name'} value={detail?.accountName} />
                <Field label="Account Type" value={isCard ? 'Credit Card' : 'Bank Account'} />
                <Field label="Last 4" value={detail?.last4 ? `•••• ${detail.last4}` : null} />
              </div>
            </div>

            <Separator />

            {/* Statement */}
            <div className="flex flex-col gap-sm">
              <p className="text-label-caps uppercase text-muted-foreground">Statement</p>
              <div className="grid grid-cols-2 gap-sm">
                <Field label="Statement Name" value={detail?.statement.fileName} />
                <Field label="Statement Period" value={detail?.statement.statementPeriodLabel} />
                <Field
                  label="Statement Date"
                  value={
                    detail?.statement.statementDate || detail?.statement.statementPeriodEnd || null
                  }
                />
                <Field label="Due Date" value={formatDate(detail?.statement.dueDate)} />
              </div>
            </div>

            {(row.sourceMessageId || row.emailSubject || row.rawDescription) && (
              <>
                <Separator />
                {/* Source */}
                <div className="flex flex-col gap-sm">
                  <p className="text-label-caps uppercase text-muted-foreground">Source</p>
                  <div className="flex flex-col gap-sm">
                    <Field label="Source Email Subject" value={row.emailSubject} />
                    <Field label="Source Message ID" value={row.sourceMessageId} />
                    <Field label="Raw Description" value={row.rawDescription} />
                  </div>
                </div>
              </>
            )}

            {row.confidence !== null && row.confidence < 50 && (
              <Badge
                variant="outline"
                className="w-fit border-destructive/30 bg-destructive/10 text-destructive"
              >
                Low confidence extraction — verify before relying on this row
              </Badge>
            )}

            {account && (
              <Button
                variant="outline"
                onClick={() => {
                  const param = isCard ? 'creditCardId' : 'bankAccountId'
                  const day = row.date
                  navigate(
                    `/transactions?${param}=${encodeURIComponent(account.id)}${
                      day ? `&dateFrom=${day}&dateTo=${day}` : ''
                    }`,
                  )
                }}
              >
                View in Transactions
              </Button>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
