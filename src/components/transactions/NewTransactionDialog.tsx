import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BizPersonalPill } from '@/components/transactions/BizPersonalPill'
import { cn } from '@/lib/utils'
import type {
  Category,
  Client,
  OwnerType,
  TransactionAccount,
  TransactionCreateInput,
} from '@/types/transaction'

interface NewTransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: readonly TransactionAccount[]
  categories: readonly Category[]
  clients: readonly Client[]
  onSubmit: (input: TransactionCreateInput) => void
  isPending?: boolean
}

const today = () => new Date().toISOString().slice(0, 10)

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

function FieldError({ children }: { children: string }) {
  return (
    <p role="alert" className="mt-xs text-[11px] text-destructive">
      {children}
    </p>
  )
}

export function NewTransactionDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  clients,
  onSubmit,
  isPending,
}: NewTransactionDialogProps) {
  const [merchantName, setMerchantName] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(today())
  const [accountId, setAccountId] = useState<string>('')
  const [categoryId, setCategoryId] = useState<string>('')
  const [clientId, setClientId] = useState<string>('')
  const [ownerType, setOwnerType] = useState<OwnerType>('business')
  const [submitted, setSubmitted] = useState(false)

  const merchantError = merchantName.trim().length === 0 ? 'Merchant name is required.' : null
  const amountError = !(Number(amount) > 0) ? 'Enter an amount greater than 0.' : null
  const accountError = accountId === '' ? 'Select which account this belongs to.' : null

  const canSubmit = !merchantError && !amountError && !accountError

  function reset() {
    setMerchantName('')
    setAmount('')
    setDate(today())
    setAccountId('')
    setCategoryId('')
    setClientId('')
    setOwnerType('business')
    setSubmitted(false)
  }

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    onSubmit({
      date,
      merchantName: merchantName.trim(),
      accountId,
      categoryId: categoryId || null,
      clientId: clientId || null,
      ownerType,
      type: 'debit',
      amount: Number(amount),
    })
    reset()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Transaction</DialogTitle>
          <DialogDescription>
            Manually record a transaction that hasn't synced yet. Fields marked with{' '}
            <span className="text-destructive">*</span> are required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="new-txn-merchant">
              Merchant
              <RequiredMark />
            </Label>
            <Input
              id="new-txn-merchant"
              value={merchantName}
              onChange={(e) => setMerchantName(e.target.value)}
              placeholder="e.g. Amazon Web Services"
              aria-required="true"
              aria-invalid={submitted && !!merchantError}
              className={cn(submitted && merchantError && 'border-destructive')}
            />
            {submitted && merchantError && <FieldError>{merchantError}</FieldError>}
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <Label htmlFor="new-txn-amount">
                Amount (₹)
                <RequiredMark />
              </Label>
              <Input
                id="new-txn-amount"
                type="number"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-required="true"
                aria-invalid={submitted && !!amountError}
                className={cn(submitted && amountError && 'border-destructive')}
              />
              {submitted && amountError && <FieldError>{amountError}</FieldError>}
            </div>
            <div>
              <Label htmlFor="new-txn-date">Date</Label>
              <Input
                id="new-txn-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="new-txn-account">
              Bank / Card
              <RequiredMark />
            </Label>
            <Select value={accountId} onValueChange={(v) => setAccountId(v ?? '')}>
              <SelectTrigger
                id="new-txn-account"
                className={cn('w-full', submitted && accountError && 'border-destructive')}
                aria-required="true"
                aria-invalid={submitted && !!accountError}
              >
                <SelectValue placeholder="Select account">
                  {(current: string) => {
                    const match = accounts.find((a) => a.id === current)
                    return match ? `${match.bankName} •••• ${match.last4}` : current
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.bankName} •••• {account.last4}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && accountError && <FieldError>{accountError}</FieldError>}
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <Label htmlFor="new-txn-category">Category</Label>
              <Select value={categoryId} onValueChange={(v) => setCategoryId(v ?? '')}>
                <SelectTrigger id="new-txn-category" className="w-full">
                  <SelectValue placeholder="Uncategorized">
                    {(current: string) => categories.find((c) => c.id === current)?.name ?? current}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="new-txn-client">Client</Label>
              <Select value={clientId} onValueChange={(v) => setClientId(v ?? '')}>
                <SelectTrigger id="new-txn-client" className="w-full">
                  <SelectValue placeholder="No client">
                    {(current: string) => clients.find((c) => c.id === current)?.name ?? current}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Business / Personal</Label>
            <div className="mt-xs">
              <BizPersonalPill value={ownerType} onChange={setOwnerType} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            Add Transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
