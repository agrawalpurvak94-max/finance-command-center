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
import { cn } from '@/lib/utils'
import { findDuplicateCredential } from '@/utils/credentials'
import { useCreateCreditCard } from '@/hooks/useCreditCards'
import type { AccountCredentialRecord } from '@/domain/Credential'
import type { CreditCardCreateInput } from '@/domain/CreditCard'

interface AddCreditCardModalProps {
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

/**
 * Centered modal, per the Stitch Credentials reference's "Add Credit Card
 * Account" dialog — not a slide-over drawer. Field set matches what Stitch
 * shows minus Billing Cycle Day (fetched by n8n, not entered here) and
 * minus a fixed bank dropdown (the live data model has no enum for
 * `institution_name` — Workflow D resolves arbitrary bank names dynamically,
 * so constraining this to a hardcoded list would misrepresent what the
 * product actually supports). Statement Password is required, per explicit
 * product decision (Stitch itself marks it optional — overridden here).
 */
export function AddCreditCardModal({
  open,
  onOpenChange,
  existingCredentials,
  onCreated,
}: AddCreditCardModalProps) {
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
  const [cardProduct, setCardProduct] = useState('')
  const [last4, setLast4] = useState('')
  const [statementPassword, setStatementPassword] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [duplicateError, setDuplicateError] = useState<string | null>(null)

  const createCard = useCreateCreditCard()

  const bankNameError = bankName.trim().length === 0 ? 'Enter the issuing bank.' : null
  const cardProductError = cardProduct.trim().length === 0 ? 'Enter a card product.' : null
  const last4Error = !/^\d{4}$/.test(last4.trim()) ? 'Enter exactly 4 digits.' : null
  const passwordError = statementPassword.trim().length === 0 ? 'Enter a statement password.' : null
  const canSubmit = !bankNameError && !cardProductError && !last4Error && !passwordError

  function handleSubmit() {
    setSubmitted(true)
    setDuplicateError(null)
    if (!canSubmit) return

    const duplicate = findDuplicateCredential(
      existingCredentials,
      'credit_card',
      bankName,
      last4.trim(),
    )
    if (duplicate) {
      setDuplicateError('This credit card already exists.')
      return
    }

    const todayIso = new Date().toISOString().slice(0, 10)
    const input: CreditCardCreateInput = {
      bankName: bankName.trim(),
      cardName: cardProduct.trim(),
      network: 'VISA',
      last4: last4.trim(),
      creditLimit: 0,
      statementDate: todayIso,
      dueDate: todayIso,
      status: 'active',
      cardProduct: cardProduct.trim(),
      statementPassword: statementPassword.trim(),
    }

    createCard.mutate(input, {
      onSuccess: () => {
        onCreated(
          'Credit card added successfully.',
          `Stored to Supabase · ${bankName.trim()} •••• ${last4.trim()}`,
        )
        onCancel()
      },
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Credit Card</DialogTitle>
        <DialogDescription>
          Register a new card into Supabase. Fields marked with * are required.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <div>
            <Label htmlFor="add-cc-bank">
              Issuing Bank
              <RequiredMark />
            </Label>
            <Input
              id="add-cc-bank"
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
            <Label htmlFor="add-cc-product">
              Card Product
              <RequiredMark />
            </Label>
            <Input
              id="add-cc-product"
              value={cardProduct}
              onChange={(e) => setCardProduct(e.target.value)}
              placeholder="e.g. Diners Club Black"
              aria-required="true"
              aria-invalid={submitted && !!cardProductError}
              className={cn(submitted && cardProductError && 'border-destructive')}
            />
            {submitted && cardProductError && <FieldError>{cardProductError}</FieldError>}
          </div>
        </div>

        <div>
          <Label htmlFor="add-cc-last4">
            Last 4 Digits
            <RequiredMark />
          </Label>
          <Input
            id="add-cc-last4"
            value={last4}
            onChange={(e) => setLast4(e.target.value)}
            placeholder="e.g. 7125"
            maxLength={4}
            inputMode="numeric"
            aria-required="true"
            aria-invalid={submitted && !!last4Error}
            className={cn(submitted && last4Error && 'border-destructive')}
          />
          {submitted && last4Error && <FieldError>{last4Error}</FieldError>}
        </div>

        <div>
          <Label htmlFor="add-cc-password">
            Statement PDF Decryption Password
            <RequiredMark />
          </Label>
          <div className="relative flex items-center">
            <Input
              id="add-cc-password"
              type={revealed ? 'text' : 'password'}
              value={statementPassword}
              onChange={(e) => setStatementPassword(e.target.value)}
              autoComplete="off"
              aria-required="true"
              aria-invalid={submitted && !!passwordError}
              className={cn('pr-10', submitted && passwordError && 'border-destructive')}
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
          {submitted && passwordError && <FieldError>{passwordError}</FieldError>}
        </div>

        {duplicateError && <FieldError>{duplicateError}</FieldError>}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={createCard.isPending}>
          {createCard.isPending ? 'Creating…' : 'Create Account'}
        </Button>
      </DialogFooter>
    </>
  )
}
