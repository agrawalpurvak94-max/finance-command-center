import { useState } from 'react'
import { Landmark, Wallet, History, FileText, StickyNote } from 'lucide-react'
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
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Landmark className="size-6" aria-hidden="true" />
          </div>
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
            <p className="flex h-9 items-center text-table-mono text-body-md text-foreground">
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
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Wallet className="size-3.5" aria-hidden="true" />
          Financial Overview
        </h3>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Current Balance</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(account.currentBalance)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Available Balance
            </p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(account.availableBalance)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Monthly Credits</p>
            <p className="text-body-md font-semibold tabular-nums text-secondary">
              +{formatINR(account.monthlyCredits)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Monthly Debits</p>
            <p className="text-body-md font-semibold tabular-nums text-destructive">
              -{formatINR(account.monthlyDebits)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Last Sync</p>
            <p className="text-body-md text-foreground">{account.lastSyncAt}</p>
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
            onClick={() => onViewAllTransactions(account)}
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
            onClick={() => onViewAllStatements(account)}
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
          <Label htmlFor="bank-account-review-notes">Internal Notes</Label>
          <Textarea
            id="bank-account-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this account…"
          />
        </div>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="bank-account-rules">Account Rules</Label>
            <Input id="bank-account-rules" placeholder="Account rules coming soon" disabled />
          </div>
          <div>
            <Label htmlFor="bank-account-import-rules">Import Rules</Label>
            <Input id="bank-account-import-rules" placeholder="Import rules coming soon" disabled />
          </div>
        </div>
        <div>
          <Label htmlFor="bank-account-auto-categorization">Auto Categorization Rules</Label>
          <Input
            id="bank-account-auto-categorization"
            placeholder="Auto categorization rules coming soon"
            disabled
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
