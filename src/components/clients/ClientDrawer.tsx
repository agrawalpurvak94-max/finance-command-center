import { useState } from 'react'
import {
  IdCard,
  Wallet,
  PieChart,
  Store,
  History,
  FileText,
  StickyNote,
  Landmark,
  CreditCard,
} from 'lucide-react'
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
import { ClientStatusBadge } from '@/components/clients/ClientStatusBadge'
import { useTransactionsList } from '@/hooks/useTransactions'
import { useStatementsList } from '@/hooks/useStatements'
import { useUpdateClient } from '@/hooks/useClients'
import { formatINR } from '@/utils/currency'
import type { ClientRecord, ClientRecordStatus } from '@/domain/Client'

const clientTypeLabels: Record<ClientRecord['clientType'], string> = {
  personal: 'Personal',
  family_member: 'Family Member',
  company: 'Company',
  business_unit: 'Business Unit',
  trust: 'Trust',
}

interface ClientDrawerProps {
  client: ClientRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
  onViewAllTransactions: (client: ClientRecord) => void
  onViewAllStatements: (client: ClientRecord) => void
  onViewAccounts: (client: ClientRecord) => void
  onViewCreditCards: (client: ClientRecord) => void
  onSaved: (message: string) => void
}

export function ClientDrawer({
  client,
  open,
  onOpenChange,
  onClosed,
  onViewAllTransactions,
  onViewAllStatements,
  onViewAccounts,
  onViewCreditCards,
  onSaved,
}: ClientDrawerProps) {
  return (
    <EntityReviewDrawer
      open={open}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title="Client Review"
    >
      {open && client && (
        <DrawerBody
          key={client.id}
          client={client}
          onClose={() => onOpenChange(false)}
          onViewAllTransactions={onViewAllTransactions}
          onViewAllStatements={onViewAllStatements}
          onViewAccounts={onViewAccounts}
          onViewCreditCards={onViewCreditCards}
          onSaved={onSaved}
        />
      )}
    </EntityReviewDrawer>
  )
}

interface DrawerBodyProps {
  client: ClientRecord
  onClose: () => void
  onViewAllTransactions: (client: ClientRecord) => void
  onViewAllStatements: (client: ClientRecord) => void
  onViewAccounts: (client: ClientRecord) => void
  onViewCreditCards: (client: ClientRecord) => void
  onSaved: (message: string) => void
}

function DrawerBody({
  client,
  onClose,
  onViewAllTransactions,
  onViewAllStatements,
  onViewAccounts,
  onViewCreditCards,
  onSaved,
}: DrawerBodyProps) {
  const [name, setName] = useState(client.name)
  const [company, setCompany] = useState(client.company ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [phone, setPhone] = useState(client.phone ?? '')
  const [status, setStatus] = useState<ClientRecordStatus>(client.status)
  const [notes, setNotes] = useState(client.notes ?? '')

  const updateClient = useUpdateClient()

  const recentTxnsQuery = useTransactionsList({
    page: 1,
    pageSize: 10,
    sort: { id: 'date', desc: true },
    filters: { clientId: client.id },
  })
  const statementsQuery = useStatementsList({
    page: 1,
    pageSize: 5,
    sort: { id: 'statementDate', desc: true },
    filters: { clientId: client.id },
  })

  function handleSave() {
    const savedName = name.trim() || client.name
    updateClient.mutate(
      {
        id: client.id,
        input: {
          name: savedName,
          company: company.trim() || null,
          email: email.trim() || null,
          phone: phone.trim() || null,
          status,
          notes: notes.trim() || null,
        },
      },
      {
        onSuccess: () => {
          onSaved(`${savedName} saved.`)
          onClose()
        },
      },
    )
  }

  return (
    <>
      {/* Section 1 — Client Profile */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center gap-md">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IdCard className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="client-review-name">Client Name</Label>
            <Input id="client-review-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label>Client Type</Label>
            <p className="flex h-9 items-center text-body-md text-foreground">
              {clientTypeLabels[client.clientType]}
            </p>
          </div>
          <div>
            <Label htmlFor="client-review-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as ClientRecordStatus) ?? 'active')}
            >
              <SelectTrigger id="client-review-status" className="w-full">
                <SelectValue placeholder="Status">
                  {(current: ClientRecordStatus) =>
                    current === 'active'
                      ? 'Active'
                      : current === 'pending'
                        ? 'Pending'
                        : 'Suspended'
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="client-review-company">Company</Label>
          <Input
            id="client-review-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="—"
          />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="client-review-email">Email</Label>
            <Input
              id="client-review-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="—"
            />
          </div>
          <div>
            <Label htmlFor="client-review-phone">Phone</Label>
            <Input
              id="client-review-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="—"
            />
          </div>
        </div>

        <div>
          <Label>Current Status</Label>
          <div className="flex h-9 items-center">
            <ClientStatusBadge status={client.status} />
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 2 — Financial Summary */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Wallet className="size-3.5" aria-hidden="true" />
          Financial Summary
        </h3>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Total Spend</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(client.totalSpend)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Total Transactions
            </p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {client.transactionCount.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Linked Accounts</p>
            <div className="flex items-center gap-xs">
              <p className="text-body-md font-semibold tabular-nums text-foreground">
                {client.linkedAccountsCount}
              </p>
              {client.linkedAccountsCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onViewAccounts(client)}
                >
                  <Landmark className="size-3" aria-hidden="true" />
                  View
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Linked Credit Cards
            </p>
            <div className="flex items-center gap-xs">
              <p className="text-body-md font-semibold tabular-nums text-foreground">
                {client.linkedCreditCardsCount}
              </p>
              {client.linkedCreditCardsCount > 0 && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => onViewCreditCards(client)}
                >
                  <CreditCard className="size-3" aria-hidden="true" />
                  View
                </Button>
              )}
            </div>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Linked Statements
            </p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {client.linkedStatementsCount}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              First Transaction
            </p>
            <p className="text-body-md text-foreground">{client.firstTransactionAt ?? '—'}</p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Last Transaction
            </p>
            <p className="text-body-md text-foreground">{client.lastTransactionAt ?? '—'}</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 3 — Top Categories */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <PieChart className="size-3.5" aria-hidden="true" />
          Top Categories
        </h3>
        {client.topCategories.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {client.topCategories.map((entry) => (
              <li
                key={entry.category.id}
                className="flex items-center justify-between rounded-lg border border-border p-sm text-body-sm"
              >
                <span className="truncate text-foreground">{entry.category.name}</span>
                <span className="shrink-0 text-table-mono tabular-nums text-muted-foreground">
                  {formatINR(entry.totalSpend)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">No categorized spend yet.</p>
        )}
      </section>

      <Separator />

      {/* Section 4 — Top Merchants */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Store className="size-3.5" aria-hidden="true" />
          Top Merchants
        </h3>
        {client.topMerchants.length > 0 ? (
          <ul className="flex flex-col gap-xs">
            {client.topMerchants.map((entry) => (
              <li
                key={entry.merchant.id}
                className="flex items-center justify-between rounded-lg border border-border p-sm text-body-sm"
              >
                <span className="truncate text-foreground">{entry.merchant.name}</span>
                <span className="shrink-0 text-table-mono tabular-nums text-muted-foreground">
                  {formatINR(entry.totalSpend)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted-foreground">No merchant spend yet.</p>
        )}
      </section>

      <Separator />

      {/* Section 5 — Recent Transactions */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
            <History className="size-3.5" aria-hidden="true" />
            Recent Transactions
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary"
            onClick={() => onViewAllTransactions(client)}
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
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Category</th>
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
                    <td className="p-sm text-body-sm text-muted-foreground">
                      {txn.category?.name ?? 'Uncategorized'}
                    </td>
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

      {/* Section 6 — Statements */}
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
            onClick={() => onViewAllStatements(client)}
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

      {/* Section 7 — Notes */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <StickyNote className="size-3.5" aria-hidden="true" />
          Notes
        </h3>
        <div>
          <Label htmlFor="client-review-notes">Internal Notes</Label>
          <Textarea
            id="client-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this client…"
          />
        </div>
      </section>

      <EntityReviewDrawerFooter
        onCancel={onClose}
        onSave={handleSave}
        isSaving={updateClient.isPending}
      />
    </>
  )
}
