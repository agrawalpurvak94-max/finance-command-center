import { useState } from 'react'
import { Landmark, Wallet, History, FileText, StickyNote } from 'lucide-react'
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
import { BankAccountHealthBadge } from '@/components/accounts/BankAccountHealthBadge'
import { useTransactionsList } from '@/hooks/useTransactions'
import { useStatementsList } from '@/hooks/useStatements'
import { useUpdateBankAccount } from '@/hooks/useAccounts'
import { formatINR } from '@/utils/currency'
import type { BankAccountRecord, BankAccountRecordStatus } from '@/domain/Account'

const accountTypeLabel: Record<BankAccountRecord['accountType'], string> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'Overdraft',
}

interface BankAccountDrawerProps {
  account: BankAccountRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
  onViewAllTransactions: (account: BankAccountRecord) => void
  onViewAllStatements: (account: BankAccountRecord) => void
  onSaved: (message: string) => void
}

export function BankAccountDrawer({
  account,
  open,
  onOpenChange,
  onClosed,
  onViewAllTransactions,
  onViewAllStatements,
  onSaved,
}: BankAccountDrawerProps) {
  return (
    <EntityReviewDrawer
      open={open}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title="Account Review"
    >
      {open && account && (
        <DrawerBody
          key={account.id}
          account={account}
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
  account: BankAccountRecord
  onClose: () => void
  onViewAllTransactions: (account: BankAccountRecord) => void
  onViewAllStatements: (account: BankAccountRecord) => void
  onSaved: (message: string) => void
}

function DrawerBody({
  account,
  onClose,
  onViewAllTransactions,
  onViewAllStatements,
  onSaved,
}: DrawerBodyProps) {
  const [nickname, setNickname] = useState(account.nickname ?? '')
  const [status, setStatus] = useState<BankAccountRecordStatus>(account.status)
  const [notes, setNotes] = useState(account.notes ?? '')

  const updateAccount = useUpdateBankAccount()

  const recentTxnsQuery = useTransactionsList({
    page: 1,
    pageSize: 10,
    sort: { id: 'date', desc: true },
    filters: { bankAccountId: account.id },
  })
  const statementsQuery = useStatementsList({
    page: 1,
    pageSize: 5,
    sort: { id: 'statementDate', desc: true },
    filters: { accountId: account.id },
  })

  function handleSave() {
    updateAccount.mutate(
      {
        id: account.id,
        input: { nickname: nickname.trim() || null, status, notes: notes.trim() || null },
      },
      {
        onSuccess: () => {
          onSaved(`${nickname.trim() || account.accountName} saved.`)
          onClose()
        },
      },
    )
  }

  return (
    <>
      {/* Section 1 — Account Summary */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center gap-md">
          <IconChip size="lg" tone="info">
            <Landmark className="size-6" aria-hidden="true" />
          </IconChip>
          <div className="min-w-0 flex-1">
            <Label htmlFor="bank-account-review-nickname">Nickname</Label>
            <Input
              id="bank-account-review-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder={account.accountName}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label>Bank</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">{account.bankName}</p>
          </div>
          <div>
            <Label>Account Name</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">
              {account.accountName}
            </p>
          </div>
          <div>
            <Label>Account Type</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">
              {accountTypeLabel[account.accountType]}
            </p>
          </div>
          <div>
            <Label>Account Number</Label>
            <p className="flex h-9 items-center font-mono text-body-md text-foreground">
              {account.maskedAccountNumber}
            </p>
          </div>
          <div>
            <Label htmlFor="bank-account-review-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as BankAccountRecordStatus) ?? 'active')}
            >
              <SelectTrigger id="bank-account-review-status" className="w-full">
                <SelectValue placeholder="Status">
                  {(current: BankAccountRecordStatus) =>
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
            <Label>Account Health</Label>
            <div className="flex h-9 items-center">
              <BankAccountHealthBadge health={account.health} />
            </div>
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 2 — Financial Overview */}
      <section className="flex flex-col gap-md">
        <DrawerSectionHeader icon={Wallet}>Financial Overview</DrawerSectionHeader>

        <DrawerHero
          label="Current Balance"
          value={formatINR(account.currentBalance)}
          caption={`Available: ${formatINR(account.availableBalance)}`}
        />

        <div className="grid grid-cols-2 gap-md">
          <DrawerStat
            label="Monthly Credits"
            value={`+${formatINR(account.monthlyCredits)}`}
            valueClassName="text-secondary"
          />
          <DrawerStat
            label="Monthly Debits"
            value={`-${formatINR(account.monthlyDebits)}`}
            valueClassName="text-destructive"
          />
          <DrawerStat label="Last Sync" value={account.lastSyncAt} valueClassName="font-normal" />
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
              onClick={() => onViewAllTransactions(account)}
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
              onClick={() => onViewAllStatements(account)}
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
          <Label htmlFor="bank-account-review-notes">Internal Notes</Label>
          <Textarea
            id="bank-account-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this account…"
          />
        </div>
      </section>

      <EntityReviewDrawerFooter
        onCancel={onClose}
        onSave={handleSave}
        isSaving={updateAccount.isPending}
      />
    </>
  )
}
