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
import { cn } from '@/lib/utils'
import { KNOWN_CARD_NETWORKS } from '@/domain/CreditCard'
import type {
  CardNetwork,
  CreditCardCreateInput,
  CreditCardRecordStatus,
} from '@/domain/CreditCard'

interface CreditCardFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending?: boolean
  onSubmit: (input: CreditCardCreateInput) => void
}

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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function defaultDueDateIso(): string {
  const d = new Date()
  d.setDate(d.getDate() + 20)
  return d.toISOString().slice(0, 10)
}

export function CreditCardFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: CreditCardFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* sm:max-w-128 (numbered scale, = 32rem), not sm:max-w-lg — this app's
          --spacing-lg token shadows Tailwind's named max-w-lg scale; see
          ui/dialog.tsx. */}
      <DialogContent className="sm:max-w-128">
        {open && (
          <CreditCardFormBody
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CreditCardFormBodyProps {
  isPending?: boolean
  onSubmit: (input: CreditCardCreateInput) => void
  onCancel: () => void
}

function CreditCardFormBody({ isPending, onSubmit, onCancel }: CreditCardFormBodyProps) {
  const [bankName, setBankName] = useState('')
  const [cardName, setCardName] = useState('')
  const [network, setNetwork] = useState<CardNetwork>('VISA')
  const [last4, setLast4] = useState('')
  const [creditLimit, setCreditLimit] = useState('')
  const [statementDate, setStatementDate] = useState(todayIso())
  const [dueDate, setDueDate] = useState(defaultDueDateIso())
  const [status, setStatus] = useState<CreditCardRecordStatus>('active')
  const [submitted, setSubmitted] = useState(false)

  const bankNameError = bankName.trim().length === 0 ? 'Enter a bank name.' : null
  const cardNameError = cardName.trim().length === 0 ? 'Enter a card name.' : null
  const last4Error = !/^\d{4}$/.test(last4.trim()) ? 'Enter exactly 4 digits.' : null
  const creditLimitError =
    !creditLimit.trim() || Number(creditLimit) <= 0 ? 'Enter a credit limit greater than 0.' : null
  const canSubmit = !bankNameError && !cardNameError && !last4Error && !creditLimitError

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    onSubmit({
      bankName: bankName.trim(),
      cardName: cardName.trim(),
      network,
      last4: last4.trim(),
      creditLimit: Number(creditLimit),
      statementDate,
      dueDate,
      status,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Credit Card</DialogTitle>
        <DialogDescription>
          Register a new credit card. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="credit-card-bank">
              Bank
              <RequiredMark />
            </Label>
            <Input
              id="credit-card-bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="e.g. HDFC Bank"
              aria-required="true"
              aria-invalid={submitted && !!bankNameError}
              className={cn(submitted && bankNameError && 'border-destructive')}
            />
            {submitted && bankNameError && <FieldError>{bankNameError}</FieldError>}
          </div>
          <div>
            <Label htmlFor="credit-card-network">
              Network
              <RequiredMark />
            </Label>
            <Select value={network} onValueChange={(v) => setNetwork((v as CardNetwork) ?? 'VISA')}>
              <SelectTrigger id="credit-card-network" className="w-full">
                <SelectValue placeholder="Network">{(current: CardNetwork) => current}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {KNOWN_CARD_NETWORKS.map((n) => (
                  <SelectItem key={n} value={n}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="credit-card-name">
            Card Name
            <RequiredMark />
          </Label>
          <Input
            id="credit-card-name"
            value={cardName}
            onChange={(e) => setCardName(e.target.value)}
            placeholder="e.g. HDFC Corporate Platinum"
            aria-required="true"
            aria-invalid={submitted && !!cardNameError}
            className={cn(submitted && cardNameError && 'border-destructive')}
          />
          {submitted && cardNameError && <FieldError>{cardNameError}</FieldError>}
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="credit-card-last4">
              Last 4 Digits
              <RequiredMark />
            </Label>
            <Input
              id="credit-card-last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
              placeholder="e.g. 4292"
              maxLength={4}
              inputMode="numeric"
              aria-required="true"
              aria-invalid={submitted && !!last4Error}
              className={cn(submitted && last4Error && 'border-destructive')}
            />
            {submitted && last4Error && <FieldError>{last4Error}</FieldError>}
          </div>
          <div>
            <Label htmlFor="credit-card-limit">
              Credit Limit
              <RequiredMark />
            </Label>
            <Input
              id="credit-card-limit"
              type="number"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              placeholder="e.g. 500000"
              aria-required="true"
              aria-invalid={submitted && !!creditLimitError}
              className={cn(submitted && creditLimitError && 'border-destructive')}
            />
            {submitted && creditLimitError && <FieldError>{creditLimitError}</FieldError>}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="credit-card-statement-date">Statement Date</Label>
            <Input
              id="credit-card-statement-date"
              type="date"
              value={statementDate}
              onChange={(e) => setStatementDate(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="credit-card-due-date">Due Date</Label>
            <Input
              id="credit-card-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="credit-card-status">Status</Label>
          <Select
            value={status}
            onValueChange={(v) => setStatus((v as CreditCardRecordStatus) ?? 'active')}
          >
            <SelectTrigger id="credit-card-status" className="w-full">
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
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Adding…' : 'Add Credit Card'}
        </Button>
      </DialogFooter>
    </>
  )
}
