import { useState } from 'react'
import { Store, Sparkles, Receipt, History } from 'lucide-react'
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
import { MerchantStatusBadge } from '@/components/merchants/MerchantStatusBadge'
import { CategorySelector } from '@/components/transactions/CategorySelector'
import { AccountCell } from '@/components/transactions/AccountCell'
import { useTransactionsList } from '@/hooks/useTransactions'
import { useUpdateMerchant } from '@/hooks/useMerchants'
import { formatINR } from '@/utils/currency'
import type { MerchantRecord, MerchantStatus } from '@/domain/Merchant'

interface MerchantReviewDrawerProps {
  merchant: MerchantRecord | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClosed?: () => void
  onViewAllTransactions: (merchant: MerchantRecord) => void
  onSaved: (message: string) => void
}

export function MerchantReviewDrawer({
  merchant,
  open,
  onOpenChange,
  onClosed,
  onViewAllTransactions,
  onSaved,
}: MerchantReviewDrawerProps) {
  return (
    <EntityReviewDrawer
      open={open}
      onOpenChange={onOpenChange}
      onClosed={onClosed}
      title="Merchant Review"
    >
      {/* Rendered only while open, and keyed by merchant id, so switching
          merchants (or reopening the same one after a cancelled edit)
          always mounts a fresh instance seeded straight from props — the
          same fix CategoryFormDialog/MerchantFormDialog/
          TransactionDetailsDrawer already use instead of an effect. */}
      {open && merchant && (
        <DrawerBody
          key={merchant.id}
          merchant={merchant}
          onClose={() => onOpenChange(false)}
          onViewAllTransactions={onViewAllTransactions}
          onSaved={onSaved}
        />
      )}
    </EntityReviewDrawer>
  )
}

interface DrawerBodyProps {
  merchant: MerchantRecord
  onClose: () => void
  onViewAllTransactions: (merchant: MerchantRecord) => void
  onSaved: (message: string) => void
}

function DrawerBody({ merchant, onClose, onViewAllTransactions, onSaved }: DrawerBodyProps) {
  const [name, setName] = useState(merchant.name)
  const [status, setStatus] = useState<MerchantStatus>(merchant.status)
  const [defaultCategoryId, setDefaultCategoryId] = useState(merchant.defaultCategory?.id ?? null)
  const [notes, setNotes] = useState(merchant.notes ?? '')

  const updateMerchant = useUpdateMerchant()

  const recentQuery = useTransactionsList({
    page: 1,
    pageSize: 5,
    sort: { id: 'date', desc: true },
    filters: { merchantId: merchant.id },
  })
  const firstSeenQuery = useTransactionsList({
    page: 1,
    pageSize: 1,
    sort: { id: 'date', desc: false },
    filters: { merchantId: merchant.id },
  })
  const firstSeenAt = firstSeenQuery.data?.rows[0]?.date ?? null

  function handleSave() {
    const savedName = name.trim() || merchant.name
    updateMerchant.mutate(
      {
        id: merchant.id,
        input: { name: savedName, defaultCategoryId, status, notes: notes.trim() || null },
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
      {/* Section 1 — Merchant Identity */}
      <section className="flex flex-col gap-md">
        <div className="flex items-center gap-md">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Store className="size-6" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <Label htmlFor="merchant-review-name">Merchant Name</Label>
            <Input
              id="merchant-review-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="merchant-review-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as MerchantStatus) ?? 'active')}
            >
              <SelectTrigger id="merchant-review-status" className="w-full">
                <SelectValue placeholder="Status">
                  {(current: MerchantStatus) => (current === 'active' ? 'Active' : 'Inactive')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Current Status</Label>
            <div className="flex h-9 items-center">
              <MerchantStatusBadge status={merchant.status} />
            </div>
          </div>
        </div>

        <div>
          <Label htmlFor="merchant-review-id">Merchant ID</Label>
          <Input id="merchant-review-id" value="Assigned automatically — coming soon" disabled />
        </div>
      </section>

      <Separator />

      {/* Section 2 — Classification */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Sparkles className="size-3.5" aria-hidden="true" />
          Classification
        </h3>

        <div>
          <Label>Default Category</Label>
          <CategorySelector category={merchant.defaultCategory} onChange={setDefaultCategoryId} />
        </div>

        <div>
          <Label htmlFor="merchant-review-client">Client Mapping</Label>
          <Input id="merchant-review-client" placeholder="Client mapping coming soon" disabled />
        </div>

        <div>
          <Label htmlFor="merchant-review-notes">Notes</Label>
          <Textarea
            id="merchant-review-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Internal notes about this merchant…"
          />
        </div>
      </section>

      <Separator />

      {/* Section 3 — Merchant Intelligence (read-only) */}
      <section className="flex flex-col gap-md">
        <h3 className="flex items-center gap-xs text-label-caps uppercase text-muted-foreground">
          <Receipt className="size-3.5" aria-hidden="true" />
          Merchant Intelligence
        </h3>
        <div className="grid grid-cols-2 gap-md">
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Total Transactions
            </p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {merchant.transactionCount.toLocaleString('en-IN')}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">Total Spend</p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(merchant.totalSpend)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Average Transaction
            </p>
            <p className="text-body-md font-semibold tabular-nums text-foreground">
              {formatINR(merchant.averageTransaction)}
            </p>
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">First Seen</p>
            {firstSeenQuery.isLoading ? (
              <Skeleton className="h-5 w-20" />
            ) : (
              <p className="text-body-md text-foreground">{firstSeenAt ?? '—'}</p>
            )}
          </div>
          <div>
            <p className="mb-xs text-label-caps uppercase text-muted-foreground">
              Last Transaction
            </p>
            <p className="text-body-md text-foreground">{merchant.lastTransactionAt ?? '—'}</p>
          </div>
        </div>
      </section>

      <Separator />

      {/* Section 4 — Recent Transactions */}
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
            onClick={() => onViewAllTransactions(merchant)}
          >
            View All Transactions
          </Button>
        </div>

        {recentQuery.isLoading ? (
          <div className="flex flex-col gap-sm">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : recentQuery.data && recentQuery.data.rows.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Date</th>
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Amount</th>
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">Category</th>
                  <th className="p-sm text-label-caps uppercase text-muted-foreground">
                    Account/Card
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentQuery.data.rows.map((txn) => (
                  <tr key={txn.id}>
                    <td className="whitespace-nowrap p-sm text-table-mono tabular-nums text-body-sm text-muted-foreground">
                      {txn.date}
                    </td>
                    <td className="p-sm text-table-mono tabular-nums text-body-sm text-foreground">
                      {formatINR(txn.amount)}
                    </td>
                    <td className="p-sm text-body-sm text-muted-foreground">
                      {txn.category?.name ?? 'Uncategorized'}
                    </td>
                    <td className="p-sm">
                      <AccountCell account={txn.account} />
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

      <EntityReviewDrawerFooter
        onCancel={onClose}
        onSave={handleSave}
        isSaving={updateMerchant.isPending}
      />
    </>
  )
}
