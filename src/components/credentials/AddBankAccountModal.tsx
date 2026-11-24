import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
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
import { findDuplicateCredential } from '@/utils/credentials'
import { useCreateBankAccount } from '@/hooks/useAccounts'
import type { AccountCredentialRecord } from '@/domain/Credential'
import type { BankAccountCreateInput, BankAccountType } from '@/domain/Account'

interface AddBankAccountModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingCredentials: readonly AccountCredentialRecord[]
  onCreated: (message: string, description?: string) => void
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

/**
 * Centered modal, extending the same Stitch visual language
 * `AddCreditCardModal` uses — kept even though the Stitch reference has no
 * Bank Account screen at all, per explicit product decision (Bank Accounts
 * stay part of Credentials). Statement Password stays optional here (unlike
 * the credit card modal) since not every bank sends password-protected
 * statements.
 */
export function AddBankAccountModal({
  open,
  onOpenChange,
  existingCredentials,
  onCreated,
}: AddBankAccountModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-112">
        {open && (
          <ModalBody
            existingCredentials={existingCredentials}
            onCancel={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface ModalBodyProps {
  existingCredentials: readonly AccountCredentialRecord[]
  onCancel: () => void
  onCreated: (message: string, description?: string) => void
}

function ModalBody({ existingCredentials, onCancel, onCreated }: ModalBodyProps) {
  const [bankName, setBankName] = useState('')
  const [accountType, setAccountType] = useState<BankAccountType>('savings')
  const [last4, setLast4] = useState('')
  const [nickname, setNickname] = useState('')
  const [statementPassword, setStatementPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  const createAccount = useCreateBankAccount()

  const bankNameError = bankName.trim().length === 0 ? 'Enter the bank name.' : null
  const last4Error = !/^\d{4}$/.test(last4.trim()) ? 'Enter exactly 4 digits.' : null
  const canSubmit = !bankNameError && !last4Error

  function handleSubmit() {
    setSubmitted(true)
    setDuplicateError(null)
    if (!canSubmit) return

    const duplicate = findDuplicateCredential(existingCredentials, 'bank', bankName, last4.trim())
    if (duplicate) {
      setDuplicateError('This bank account already exists.')
      return
    }

    const trimmedNickname = nickname.trim()
    const input: BankAccountCreateInput = {
      bankName: bankName.trim(),
      accountType,
      accountName: trimmedNickname || `${bankName.trim()} ${accountTypeLabels[accountType]}`,
      nickname: trimmedNickname || null,
      accountNumber: last4.trim(),
      openingBalance: 0,
      status: 'active',
      statementPassword: statementPassword.trim() || null,
    }

    createAccount.mutate(input, {
      onSuccess: () => {
        onCreated(
          'Bank account added successfully.',
          `Stored to Supabase · ${bankName.trim()} •••• ${last4.trim()}`,
        )
        onCancel()
      },
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Bank Account</DialogTitle>
        <DialogDescription>
          Register a new bank account into Supabase. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="add-bank-name">
              Bank
              <RequiredMark />
            </Label>
            <Input
              id="add-bank-name"
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
            <Label htmlFor="add-bank-type">Account Type</Label>
            <Select
              value={accountType}
              onValueChange={(v) => setAccountType((v as BankAccountType) ?? 'savings')}
            >
              <SelectTrigger id="add-bank-type" className="w-full">
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

        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="add-bank-last4">
              Account Last 4
              <RequiredMark />
            </Label>
            <Input
              id="add-bank-last4"
              value={last4}
              onChange={(e) => setLast4(e.target.value)}
              placeholder="e.g. 4821"
              maxLength={4}
              inputMode="numeric"
              aria-required="true"
              aria-invalid={submitted && !!last4Error}
              className={cn(submitted && last4Error && 'border-destructive')}
            />
            {submitted && last4Error && <FieldError>{last4Error}</FieldError>}
          </div>
          <div>
            <Label htmlFor="add-bank-nickname">Account Name / Nickname</Label>
            <Input
              id="add-bank-nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="e.g. Primary Operating Account"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="add-bank-password">Statement PDF Decryption Password</Label>
          <div className="relative flex items-center">
            <Input
              id="add-bank-password"
              type={revealed ? 'text' : 'password'}
              value={statementPassword}
              onChange={(e) => setStatementPassword(e.target.value)}
              autoComplete="off"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-3 text-muted-foreground hover:text-foreground"
              aria-label={revealed ? 'Hide password' : 'Reveal password'}
            >
              {revealed ? (
                <EyeOff className="size-4" aria-hidden="true" />
              ) : (
                <Eye className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="mt-xs text-[11px] text-muted-foreground">
            Leave empty if this bank doesn't send password-protected statements.
          </p>
        </div>

        {duplicateError && <FieldError>{duplicateError}</FieldError>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createAccount.isPending}>
          {createAccount.isPending ? 'Creating…' : 'Create Account'}
        </Button>
      </DialogFooter>
    </>
  )
}
