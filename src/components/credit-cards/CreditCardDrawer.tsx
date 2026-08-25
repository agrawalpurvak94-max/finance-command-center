import { useState } from 'react'
import { CreditCard as CreditCardIcon, Wallet, History, FileText, StickyNote } from 'lucide-react'
import {
  EntityReviewDrawer,
  EntityReviewDrawerFooter,
  DrawerSectionHeader,
  DrawerStat,
  DrawerHero,
} from '@/components/EntityReviewDrawer'
import { IconChip } from '@/components/ui/icon-chip'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreditCardHealthBadge } from '@/components/credit-cards/CreditCardHealthBadge'
import { useTransactionsList } from '@/hooks/useTransactions'
import { useStatementsList } from '@/hooks/useStatements'
import { useUpdateCreditCard } from '@/hooks/useCreditCards'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { CreditCardRecord, CreditCardRecordStatus } from '@/domain/CreditCard'

interface CreditCardDrawerProps {
  card: CreditCardRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
  onViewAllTransactions: (card: CreditCardRecord) => void
  onViewAllStatements: (card: CreditCardRecord) => void
  onSaved: (message: string) => void
}

export function CreditCardDrawer({
  card,
  open,
  onOpenChange,
  onClosed,
  onViewAllTransactions,
  onViewAllStatements,
  onSaved,
}: CreditCardDrawerProps) {
  return (
    <EntityReviewDrawer
      open={open}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title="Card Review"
    >
      {open && card && (
        <DrawerBody
          key={card.id}
          card={card}
          onClose={() => onOpenChange(false)}
          onViewAllTransactions={onViewAllTransactions}
          onViewAllStatements={onViewAllStatements}
          onSaved={onSaved}
        />
      )}
    </EntityReviewDrawer>
  )
}

interface DrawerBodyProps {
  card: CreditCardRecord
  onClose: () => void
  onViewAllTransactions: (card: CreditCardRecord) => void
  onViewAllStatements: (card: CreditCardRecord) => void
  onSaved: (message: string) => void
}

function utilizationBarClassName(utilizationPercent: number): string {
  if (utilizationPercent >= 80) return 'bg-destructive'
  if (utilizationPercent >= 50) return 'bg-amber-400'
  return 'bg-secondary'
}

function DrawerBody({
  card,
  onClose,
  onViewAllTransactions,
  onViewAllStatements,
  onSaved,
}: DrawerBodyProps) {
  const [nickname, setNickname] = useState(card.nickname ?? '')
  const [status, setStatus] = useState<CreditCardRecordStatus>(card.status)
  const [notes, setNotes] = useState(card.notes ?? '')
  const [creditLimitInput, setCreditLimitInput] = useState(String(card.creditLimit))
  const [submitted, setSubmitted] = useState(false)

  const updateCard = useUpdateCreditCard()

  const creditLimitError =
    !creditLimitInput.trim() || Number(creditLimitInput) <= 0
      ? 'Enter a credit limit greater than 0.'
      : null

  const recentTxnsQuery = useTransactionsList({
    page: 1,
    pageSize: 10,
    sort: { id: 'date', desc: true },
    filters: { creditCardId: card.id },
  })
  const statementsQuery = useStatementsList({
    page: 1,
    pageSize: 5,
    sort: { id: 'statementDate', desc: true },
    filters: { accountId: card.id },
  })

  function handleSave() {
    setSubmitted(true)
    if (creditLimitError) return
    updateCard.mutate(
      {
        id: card.id,
        input: {
          nickname: nickname.trim() || null,
          status,
          notes: notes.trim() || null,
          creditLimit: Number(creditLimitInput),
        },
      },
      {
        onSuccess: () => {
          onSaved(`${nickname.trim() || card.cardName} saved.`)
          onClose()
        },
      },
    )
  }

  return (
    <>
      {/* Section 1 — Card Summary */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center gap-md">
          <IconChip size="lg" tone="attention">
            <CreditCardIcon className="size-6" aria-hidden="true" />
          </IconChip>
          <div className="min-w-0 flex-1">
            <Label htmlFor="credit-card-review-nickname">Nickname</Label>
            <Input
              id="credit-card-review-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={card.cardName}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label>Bank</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">{card.bankName}</p>
          </div>
          <div>
            <Label>Card Name</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">{card.cardName}</p>
          </div>
          <div>
            <Label>Network</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">{card.network}</p>
          </div>
          <div>
            <Label>Last 4 Digits</Label>
            <p className="flex h-9 items-center font-mono text-body-md text-foreground">
              {card.maskedNumber}
            </p>
          </div>
          <div>
            <Label htmlFor="credit-card-review-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as CreditCardRecordStatus) ?? 'active')}
            >
              <SelectTrigger id="credit-card-review-status" className="w-full">
                <SelectValue placeholder="Status">
                  {(current: CreditCardRecordStatus) =>
                    current === 'active' ? 'Active' : 'Inactive'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Card Health</Label>
            <div className="flex h-9 items-center">
              <CreditCardHealthBadge health={card.health} />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 2 — Financial Overview */}
      <section className="flex flex-col gap-md">
        <DrawerSectionHeader icon={Wallet}>Financial Overview</DrawerSectionHeader>

        <DrawerHero
          label="Outstanding"
          value={formatINR(card.outstanding)}
          caption={`Available Credit: ${formatINR(card.availableCredit)}`}
        />

        <div>
          <div className="flex items-baseline justify-between gap-sm">
            <p className="text-label-caps text-muted-foreground uppercase">Utilization</p>
            <p className="text-body-sm text-muted-foreground">{card.utilizationPercent}% used</p>
          </div>
          <div className="mt-xs h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full',
                utilizationBarClassName(card.utilizationPercent),
              )}
              style={{ width: `${Math.min(100, card.utilizationPercent)}%` }}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="credit-card-review-limit">Credit Limit</Label>
          <Input
            id="credit-card-review-limit"
            type="number"
            value={creditLimitInput}
            onChange={(e) => setCreditLimitInput(e.target.value)}
            placeholder="e.g. 500000"
            aria-required="true"
            aria-invalid={submitted && !!creditLimitError}
            className={cn(submitted && creditLimitError && 'border-destructive')}
          />
          {submitted && creditLimitError && (
            <p role="alert" className="mt-xs text-[11px] text-destructive">
              {creditLimitError}
            </p>
          )}
          <p className="mt-xs text-[11px] text-muted-foreground">
            Adjust as your issuer raises or lowers this limit with your credit score.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <DrawerStat
            label="Statement Date"
            value={card.statementDate}
            valueClassName="font-normal"
          />
          <DrawerStat label="Due Date" value={card.dueDate} valueClassName="font-normal" />
          <DrawerStat label="Minimum Due" value={formatINR(card.minimumDue)} />
        </div>
      </section>

      <Separator />

      {/* Section 3 — Latest Transactions */}
      <section className="flex flex-col gap-md">
        <DrawerSectionHeader
          icon={History}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => onViewAllTransactions(card)}
            >
              View All Transactions
            </Button>
          }
        >
          Latest Transactions
        </DrawerSectionHeader>

        {recentTxnsQuery.isLoading ? (
          <div className="flex flex-col gap-sm">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentTxnsQuery.data && recentTxnsQuery.data.rows.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="p-sm text-label-caps text-muted-foreground uppercase">Date</th>
                  <th className="p-sm text-label-caps text-muted-foreground uppercase">Merchant</th>
                  <th className="p-sm text-label-caps text-muted-foreground uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTxnsQuery.data.rows.map((txn) => (
                  <tr key={txn.id} className="transition-colors hover:bg-surface-hover">
                    <td className="p-sm text-table-mono tabular-nums whitespace-nowrap text-muted-foreground">
                      {txn.date}
                    </td>
                    <td className="p-sm text-body-sm text-foreground">{txn.merchant.name}</td>
                    <td className="p-sm text-table-mono tabular-nums font-semibold text-foreground">
                      {formatINR(txn.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">No transactions recorded yet.</p>
        )}
      </section>

      <Separator />

      {/* Section 4 — Statements */}
      <section className="flex flex-col gap-md">
        <DrawerSectionHeader
          icon={FileText}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="text-primary"
              onClick={() => onViewAllStatements(card)}
            >
              View All Statements
            </Button>
          }
        >
          Statements
        </DrawerSectionHeader>

        {statementsQuery.isLoading ? (
          <div className="flex flex-col gap-sm">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : statementsQuery.data && statementsQuery.data.rows.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {statementsQuery.data.rows.map((statement) => (
              <li
                key={statement.id}
                className="flex items-center justify-between rounded-lg border border-border p-sm text-body-sm"
              >
                <span className="truncate text-foreground">{statement.statementPeriodLabel}</span>
                <span className="text-muted-foreground capitalize">
                  {statement.status.replace('_', ' ')}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">No statements imported yet.</p>
        )}
      </section>

      <Separator />

      {/* Section 5 — Notes */}
      <section className="flex flex-col gap-md">
        <DrawerSectionHeader icon={StickyNote}>Notes</DrawerSectionHeader>
        <div>
          <Label htmlFor="credit-card-review-notes">Internal Notes</Label>
          <Textarea
            id="credit-card-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this card…"
          />
        </div>
      </section>

      <EntityReviewDrawerFooter
        onCancel={onClose}
        onSave={handleSave}
        isSaving={updateCard.isPending}
      />
    </>
  )
}
