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
import type {
  BankAccountCreateInput,
  BankAccountRecordStatus,
  BankAccountType,
} from '@/domain/Account'

interface BankAccountFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending?: boolean
  onSubmit: (input: BankAccountCreateInput) => void
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

const accountTypeLabels: Record<BankAccountType, string> = {
  savings: 'Savings',
  current: 'Current',
  overdraft: 'Overdraft',
}

export function BankAccountFormDialog({
  open,
  onOpenChange,
  isPending,
  onSubmit,
}: BankAccountFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Rendered only while open, so every open mounts a fresh instance —
            same fix as MerchantFormDialog/CategoryFormDialog. */}
        {open && (
          <BankAccountFormBody
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface BankAccountFormBodyProps {
  isPending?: boolean
  onSubmit: (input: BankAccountCreateInput) => void
  onCancel: () => void
}

function BankAccountFormBody({ isPending, onSubmit, onCancel }: BankAccountFormBodyProps) {
  const [bankName, setBankName] = useState('')
  const [accountType, setAccountType] = useState<BankAccountType>('current')
  const [accountName, setAccountName] = useState('')
  const [nickname, setNickname] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [openingBalance, setOpeningBalance] = useState('0')
  const [status, setStatus] = useState<BankAccountRecordStatus>('active')
  const [submitted, setSubmitted] = useState(false)

  const bankNameError = bankName.trim().length === 0 ? 'Enter a bank name.' : null
  const accountNameError = accountName.trim().length === 0 ? 'Enter an account name.' : null
  const accountNumberError =
    accountNumber.trim().length < 4
      ? 'Enter at least the last 4 digits of the account number.'
      : null
  const canSubmit = !bankNameError && !accountNameError && !accountNumberError

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    onSubmit({
      bankName: bankName.trim(),
      accountType,
      accountName: accountName.trim(),
      nickname: nickname.trim() || null,
      accountNumber: accountNumber.trim(),
      openingBalance: Number(openingBalance) || 0,
      status,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Link Bank Account</DialogTitle>
        <DialogDescription>
          Register a new bank account. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="bank-account-bank">
              Bank
              <RequiredMark />
            </Label>
            <Input
              id="bank-account-bank"
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
            <Label htmlFor="bank-account-type">
              Account Type
              <RequiredMark />
            </Label>
            <Select
              value={accountType}
              onValueChange={(v) => setAccountType((v as BankAccountType) ?? 'current')}
            >
              <SelectTrigger id="bank-account-type" className="w-full">
                <SelectValue placeholder="Account Type">
                  {(current: BankAccountType) => accountTypeLabels[current]}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="savings">Savings</SelectItem>
                <SelectItem value="current">Current</SelectItem>
                <SelectItem value="overdraft">Overdraft</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="bank-account-name">
            Account Name
            <RequiredMark />
          </Label>
          <Input
            id="bank-account-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="e.g. HDFC Bank Current Account"
            aria-required="true"
            aria-invalid={submitted && !!accountNameError}
            className={cn(submitted && accountNameError && 'border-destructive')}
          />
          {submitted && accountNameError && <FieldError>{accountNameError}</FieldError>}
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="bank-account-nickname">Nickname</Label>
            <Input
              id="bank-account-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Primary Operating Account"
            />
          </div>
          <div>
            <Label htmlFor="bank-account-number">
              Account Number
              <RequiredMark />
            </Label>
            <Input
              id="bank-account-number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="e.g. 000123456789"
              aria-required="true"
              aria-invalid={submitted && !!accountNumberError}
              className={cn(submitted && accountNumberError && 'border-destructive')}
            />
            {submitted && accountNumberError && <FieldError>{accountNumberError}</FieldError>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="bank-account-opening-balance">Opening Balance</Label>
            <Input
              id="bank-account-opening-balance"
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
            />
          </div>
          <div>
            <Label htmlFor="bank-account-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as BankAccountRecordStatus) ?? 'active')}
            >
              <SelectTrigger id="bank-account-status" className="w-full">
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
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? 'Linking…' : 'Link Account'}
        </Button>
      </DialogFooter>
    </>
  )
}
