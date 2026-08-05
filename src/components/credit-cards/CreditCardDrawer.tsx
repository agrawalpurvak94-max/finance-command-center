import { useState } from 'react'
import { CreditCard as CreditCardIcon, Wallet, History, FileText, StickyNote } from 'lucide-react'
import { EntityReviewDrawer, EntityReviewDrawerFooter } from '@/components/EntityReviewDrawer'
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

  const updateCard = useUpdateCreditCard()

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
    updateCard.mutate(
      {
        id: card.id,
        input: { nickname: nickname.trim() || null, status, notes: notes.trim() || null },
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
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CreditCardIcon className="size-6" aria-hidden="true" />
          </div>
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
            <p className="flex h-9 items-center text-table-mono text-body-md text-foreground">
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
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Wallet className="size-3.5" aria-hidden="true" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Credit Limit</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(card.creditLimit)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Outstanding</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(card.outstanding)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Available Credit
            </p>
            <p className="text-body-md font-semibold tabular-nums text-secondary">
              {formatINR(card.availableCredit)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Utilization</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {card.utilizationPercent}%
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Statement Date</p>
            <p className="text-body-md text-foreground">{card.statementDate}</p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Due Date</p>
            <p className="text-body-md text-foreground">{card.dueDate}</p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Minimum Due</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(card.minimumDue)}
            </p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 3 — Latest Transactions */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <History className="size-3.5" aria-hidden="true" />
            Latest Transactions
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onViewAllTransactions(card)}
          >
            View All Transactions
          </Button>
        </div>

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
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Date</th>
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Merchant</th>
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentTxnsQuery.data.rows.map((txn) => (
                  <tr key={txn.id}>
                    <td className="whitespace-nowrap p-sm text-table-mono tabular-nums text-body-sm text-muted-foreground">
                      {txn.date}
                    </td>
                    <td className="p-sm text-body-sm text-foreground">{txn.merchant.name}</td>
                    <td className="p-sm text-table-mono tabular-nums text-body-sm text-foreground">
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
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <FileText className="size-3.5" aria-hidden="true" />
            Statements
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onViewAllStatements(card)}
          >
            View All Statements
          </Button>
        </div>

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
                <span className="capitalize text-muted-foreground">
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
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <StickyNote className="size-3.5" aria-hidden="true" />
          Notes
        </h3>
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
