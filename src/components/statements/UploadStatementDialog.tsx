import { useMemo, useState } from 'react'
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
import type { AccountKind, TransactionAccount } from '@/domain/Account'
import type { StatementCreateInput } from '@/domain/Statement'

interface UploadStatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: readonly TransactionAccount[]
  onSubmit: (input: StatementCreateInput) => void
  isPending?: boolean
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

export function UploadStatementDialog({
  open,
  onOpenChange,
  accounts,
  onSubmit,
  isPending,
}: UploadStatementDialogProps) {
  const [bank, setBank] = useState('')
  const [accountKind, setAccountKind] = useState<AccountKind | ''>('')
  const [accountId, setAccountId] = useState('')
  const [statementPeriodLabel, setStatementPeriodLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const bankNames = useMemo(
    () => Array.from(new Set(accounts.map((a) => a.bankName))).sort(),
    [accounts],
  )

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => a.bankName === bank && a.kind === accountKind),
    [accounts, bank, accountKind],
  )

  const bankError = bank === '' ? 'Select a bank.' : null
  const accountKindError = accountKind === '' ? 'Select a statement type.' : null
  const accountError = accountId === '' ? 'Select an account or card.' : null
  const periodError = statementPeriodLabel.trim().length === 0 ? 'Enter a statement period.' : null
  const fileError = file === null ? 'Choose a PDF to upload.' : null

  const canSubmit = !bankError && !accountKindError && !accountError && !periodError && !fileError

  function reset() {
    setBank('')
    setAccountKind('')
    setAccountId('')
    setStatementPeriodLabel('')
    setFile(null)
    setSubmitted(false)
  }

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit || !file) return
    onSubmit({ accountId, statementPeriodLabel: statementPeriodLabel.trim(), fileName: file.name })
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
          <DialogTitle>Upload Statement</DialogTitle>
          <DialogDescription>
            Manually add a statement that hasn't synced yet. Fields marked with{' '}
            <span className="text-destructive">*</span> are required. This does not upload anywhere
            — it only records mock state.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-md">
          <div>
            <Label htmlFor="upload-stmt-bank">
              Bank
              <RequiredMark />
            </Label>
            <Select
              value={bank}
              onValueChange={(v) => {
                setBank(v ?? '')
                setAccountId('')
              }}
            >
              <SelectTrigger
                id="upload-stmt-bank"
                className={cn('w-full', submitted && bankError && 'border-destructive')}
                aria-required="true"
                aria-invalid={submitted && !!bankError}
              >
                <SelectValue placeholder="Select bank" />
              </SelectTrigger>
              <SelectContent>
                {bankNames.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && bankError && <FieldError>{bankError}</FieldError>}
          </div>

          <div className="grid grid-cols-2 gap-md">
            <div>
              <Label htmlFor="upload-stmt-type">
                Statement Type
                <RequiredMark />
              </Label>
              <Select
                value={accountKind}
                onValueChange={(v) => {
                  setAccountKind((v as AccountKind) ?? '')
                  setAccountId('')
                }}
              >
                <SelectTrigger
                  id="upload-stmt-type"
                  className={cn('w-full', submitted && accountKindError && 'border-destructive')}
                  aria-required="true"
                  aria-invalid={submitted && !!accountKindError}
                >
                  <SelectValue placeholder="Bank or card">
                    {(current: AccountKind) =>
                      current === 'bank' ? 'Bank Statement' : 'Credit Card Statement'
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">Bank Statement</SelectItem>
                  <SelectItem value="credit_card">Credit Card Statement</SelectItem>
                </SelectContent>
              </Select>
              {submitted && accountKindError && <FieldError>{accountKindError}</FieldError>}
            </div>

            <div>
              <Label htmlFor="upload-stmt-account">
                Account/Card
                <RequiredMark />
              </Label>
              <Select value={accountId} onValueChange={(v) => setAccountId(v ?? '')}>
                <SelectTrigger
                  id="upload-stmt-account"
                  className={cn('w-full', submitted && accountError && 'border-destructive')}
                  aria-required="true"
                  aria-invalid={submitted && !!accountError}
                  disabled={!bank || !accountKind}
                >
                  <SelectValue placeholder="Select account">
                    {(current: string) => {
                      const match = filteredAccounts.find((a) => a.id === current)
                      return match ? `•••• ${match.last4}` : current
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      •••• {account.last4}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {submitted && accountError && <FieldError>{accountError}</FieldError>}
            </div>
          </div>

          <div>
            <Label htmlFor="upload-stmt-period">
              Statement Period
              <RequiredMark />
            </Label>
            <Input
              id="upload-stmt-period"
              value={statementPeriodLabel}
              onChange={(e) => setStatementPeriodLabel(e.target.value)}
              placeholder="e.g. Oct 2025"
              aria-required="true"
              aria-invalid={submitted && !!periodError}
              className={cn(submitted && periodError && 'border-destructive')}
            />
            {submitted && periodError && <FieldError>{periodError}</FieldError>}
          </div>

          <div>
            <Label htmlFor="upload-stmt-file">
              Upload PDF
              <RequiredMark />
            </Label>
            <Input
              id="upload-stmt-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              aria-required="true"
              aria-invalid={submitted && !!fileError}
              className={cn(submitted && fileError && 'border-destructive')}
            />
            {file && (
              <p className="mt-xs text-body-sm text-muted-foreground">Selected: {file.name}</p>
            )}
            {submitted && fileError && <FieldError>{fileError}</FieldError>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
