import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useUpdateAccountHolder } from '@/hooks/useDashboard'
import type { AccountKind } from '@/domain/Account'

interface EditableAccountHolderProps {
  accountId: string
  kind: AccountKind
  accountHolder: string | null
  isLoading?: boolean
}

/**
 * Financial Pulse's inline Account Holder edit — same pencil/check/cancel
 * pattern as `CreditCardActivityDrawer`'s `EditableCreditLimit`, reused here
 * (not duplicated) since both `AccountActivityDrawer` and
 * `CreditCardActivityDrawer` need it. Free text (e.g. "Husband"/"Wife"/
 * "Business") — "Enter" saves, an empty value clears the holder back to
 * null ("Holder not assigned"), never a guessed/defaulted value.
 */
export function EditableAccountHolder({
  accountId,
  kind,
  accountHolder,
  isLoading,
}: EditableAccountHolderProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const updateAccountHolder = useUpdateAccountHolder()

  function startEdit() {
    setValue(accountHolder ?? '')
    updateAccountHolder.reset()
    setEditing(true)
  }

  function handleSave() {
    const trimmed = value.trim()
    updateAccountHolder.mutate(
      { accountId, kind, accountHolder: trimmed || null },
      { onSuccess: () => setEditing(false) },
    )
  }

  if (isLoading) {
    return (
      <div>
        <p className="text-label-caps uppercase text-muted-foreground">Account Holder</p>
        <Skeleton className="mt-xs h-5 w-24" />
      </div>
    )
  }

  if (!editing) {
    return (
      <div>
        <p className="text-label-caps uppercase text-muted-foreground">Account Holder</p>
        <div className="flex items-center gap-xs">
          <p className="truncate text-body-md font-semibold text-foreground">
            {accountHolder || 'Holder not assigned'}
          </p>
          <button
            type="button"
            onClick={startEdit}
            aria-label="Edit account holder"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="text-label-caps uppercase text-muted-foreground">Account Holder</p>
      <div className="flex items-center gap-xs">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. Husband, Wife, Business"
          aria-label="Account holder"
          className="h-8 w-40"
        />
        <button
          type="button"
          onClick={handleSave}
          disabled={updateAccountHolder.isPending}
          aria-label="Save account holder"
          className="text-secondary transition-colors hover:text-secondary/80 disabled:pointer-events-none disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          aria-label="Cancel editing account holder"
          className="text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      {updateAccountHolder.isError && (
        <p role="alert" className="mt-xs text-[11px] text-destructive">
          Failed to save the account holder. Try again.
        </p>
      )}
    </div>
  )
}
