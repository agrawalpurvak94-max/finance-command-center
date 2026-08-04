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
import { Textarea } from '@/components/ui/textarea'
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
  MerchantCreateInput,
  MerchantRecord,
  MerchantStatus,
  MerchantUpdateInput,
} from '@/domain/Merchant'
import type { Category } from '@/domain/Category'

interface MerchantFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  merchant: MerchantRecord | null
  categories: readonly Category[]
  isPending?: boolean
  onSubmit: (input: MerchantCreateInput | MerchantUpdateInput) => void
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

const NO_CATEGORY_VALUE = '__none__'

export function MerchantFormDialog({
  open,
  onOpenChange,
  merchant,
  categories,
  isPending,
  onSubmit,
}: MerchantFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Rendered only while open, so every open (including switching
            between Add and Edit) mounts a fresh instance with state seeded
            straight from props — no effect needed to "reset" stale state.
            Same fix as CategoryFormDialog's identical issue. */}
        {open && (
          <MerchantFormBody
            merchant={merchant}
            categories={categories}
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface MerchantFormBodyProps {
  merchant: MerchantRecord | null
  categories: readonly Category[]
  isPending?: boolean
  onSubmit: (input: MerchantCreateInput | MerchantUpdateInput) => void
  onCancel: () => void
}

function MerchantFormBody({
  merchant,
  categories,
  isPending,
  onSubmit,
  onCancel,
}: MerchantFormBodyProps) {
  const isEditMode = merchant !== null

  const [name, setName] = useState(merchant?.name ?? '')
  const [defaultCategoryId, setDefaultCategoryId] = useState(
    merchant?.defaultCategory?.id ?? NO_CATEGORY_VALUE,
  )
  const [status, setStatus] = useState<MerchantStatus>(merchant?.status ?? 'active')
  const [notes, setNotes] = useState(merchant?.notes ?? '')
  const [submitted, setSubmitted] = useState(false)

  const nameError = name.trim().length === 0 ? 'Enter a merchant name.' : null
  const canSubmit = !nameError

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      defaultCategoryId: defaultCategoryId === NO_CATEGORY_VALUE ? null : defaultCategoryId,
      status,
      notes: notes.trim() || null,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Merchant' : 'Add Merchant'}</DialogTitle>
        <DialogDescription>
          {isEditMode
            ? 'Update this merchant. Fields marked with * are required.'
            : 'Register a new merchant. Fields marked with * are required.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div>
          <Label htmlFor="merchant-name">
            Merchant Name
            <RequiredMark />
          </Label>
          <Input
            id="merchant-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Amazon Web Services"
            aria-required="true"
            aria-invalid={submitted && !!nameError}
            className={cn(submitted && nameError && 'border-destructive')}
          />
          {submitted && nameError && <FieldError>{nameError}</FieldError>}
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="merchant-category">Default Category</Label>
            <Select
              value={defaultCategoryId}
              onValueChange={(v) => setDefaultCategoryId(v ?? NO_CATEGORY_VALUE)}
            >
              <SelectTrigger id="merchant-category" className="w-full">
                <SelectValue placeholder="Uncategorized">
                  {(current: string) =>
                    current === NO_CATEGORY_VALUE
                      ? 'Uncategorized'
                      : (categories.find((c) => c.id === current)?.name ?? current)
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY_VALUE}>Uncategorized</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="merchant-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as MerchantStatus) ?? 'active')}
            >
              <SelectTrigger id="merchant-status" className="w-full">
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
        </div>

        <div>
          <Label htmlFor="merchant-notes">Notes</Label>
          <Textarea
            id="merchant-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this merchant…"
            rows={3}
          />
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="merchant-aliases">Aliases</Label>
            <Input id="merchant-aliases" placeholder="Alias manager coming soon" disabled />
          </div>
          <div>
            <Label htmlFor="merchant-rules">Merchant Rules</Label>
            <Input id="merchant-rules" placeholder="Rule builder coming soon" disabled />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isEditMode ? 'Save Changes' : 'Add Merchant'}
        </Button>
      </DialogFooter>
    </>
  )
}
