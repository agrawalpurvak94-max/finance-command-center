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
import { CATEGORY_COLORS, type CategoryColor, type CategoryStatus } from '@/domain/Category'
import {
  categoryColorClassNames,
  categoryColorLabels,
} from '@/components/categories/categoryVisuals'
import type {
  Category,
  CategoryCreateInput,
  CategoryRecord,
  CategoryUpdateInput,
} from '@/domain/Category'

interface CategoryFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: CategoryRecord | null
  parentOptions: readonly Category[]
  isPending?: boolean
  onSubmit: (input: CategoryCreateInput | CategoryUpdateInput) => void
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

const NO_PARENT_VALUE = '__none__'

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  parentOptions,
  isPending,
  onSubmit,
}: CategoryFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* Rendered only while open, so every open (including switching
            between Add and Edit) mounts a fresh instance with state seeded
            straight from props — no effect needed to "reset" stale state. */}
        {open && (
          <CategoryFormBody
            category={category}
            parentOptions={parentOptions}
            isPending={isPending}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

interface CategoryFormBodyProps {
  category: CategoryRecord | null
  parentOptions: readonly Category[]
  isPending?: boolean
  onSubmit: (input: CategoryCreateInput | CategoryUpdateInput) => void
  onCancel: () => void
}

function CategoryFormBody({
  category,
  parentOptions,
  isPending,
  onSubmit,
  onCancel,
}: CategoryFormBodyProps) {
  const isEditMode = category !== null

  const [name, setName] = useState(category?.name ?? '')
  const [parentCategoryId, setParentCategoryId] = useState(
    category?.parentCategory?.id ?? NO_PARENT_VALUE,
  )
  const [description, setDescription] = useState(category?.description ?? '')
  const [status, setStatus] = useState<CategoryStatus>(category?.status ?? 'active')
  const [color, setColor] = useState<CategoryColor>(category?.color ?? 'primary')
  const [submitted, setSubmitted] = useState(false)

  const selectableParents = parentOptions.filter((option) => option.id !== category?.id)

  const nameError = name.trim().length === 0 ? 'Enter a category name.' : null
  const descriptionError = description.trim().length === 0 ? 'Enter a description.' : null
  const canSubmit = !nameError && !descriptionError

  function handleSubmit() {
    setSubmitted(true)
    if (!canSubmit) return
    onSubmit({
      name: name.trim(),
      description: description.trim(),
      parentCategoryId: parentCategoryId === NO_PARENT_VALUE ? null : parentCategoryId,
      status,
      color,
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{isEditMode ? 'Edit Category' : 'Add Category'}</DialogTitle>
        <DialogDescription>
          {isEditMode
            ? 'Update this category. Fields marked with * are required.'
            : 'Define a new transaction classification. Fields marked with * are required.'}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-md">
        <div>
          <Label htmlFor="category-name">
            Category Name
            <RequiredMark />
          </Label>
          <Input
            id="category-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Technology & Software"
            aria-required="true"
            aria-invalid={submitted && !!nameError}
            className={cn(submitted && nameError && 'border-destructive')}
          />
          {submitted && nameError && <FieldError>{nameError}</FieldError>}
        </div>

        <div>
          <Label htmlFor="category-parent">Parent Category</Label>
          <Select
            value={parentCategoryId}
            onValueChange={(v) => setParentCategoryId(v ?? NO_PARENT_VALUE)}
          >
            <SelectTrigger id="category-parent" className="w-full">
              <SelectValue placeholder="None">
                {(current: string) =>
                  current === NO_PARENT_VALUE
                    ? 'None'
                    : (selectableParents.find((p) => p.id === current)?.name ?? current)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_PARENT_VALUE}>None</SelectItem>
              {selectableParents.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="category-description">
            Description
            <RequiredMark />
          </Label>
          <Textarea
            id="category-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Define the scope of this transaction classification…"
            rows={3}
            aria-required="true"
            aria-invalid={submitted && !!descriptionError}
            className={cn(submitted && descriptionError && 'border-destructive')}
          />
          {submitted && descriptionError && <FieldError>{descriptionError}</FieldError>}
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div>
            <Label htmlFor="category-status">Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setStatus((v as CategoryStatus) ?? 'active')}
            >
              <SelectTrigger id="category-status" className="w-full">
                <SelectValue placeholder="Status">
                  {(current: CategoryStatus) => (current === 'active' ? 'Active' : 'Inactive')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="category-color">Color</Label>
            <Select
              value={color}
              onValueChange={(v) => setColor((v as CategoryColor) ?? 'primary')}
            >
              <SelectTrigger id="category-color" className="w-full">
                <SelectValue placeholder="Color">
                  {(current: CategoryColor) => categoryColorLabels[current] ?? current}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_COLORS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="flex items-center gap-xs">
                      <span
                        className={cn('size-3 rounded-full', categoryColorClassNames[option])}
                        aria-hidden="true"
                      />
                      {categoryColorLabels[option]}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="category-icon">Icon</Label>
          <Input id="category-icon" placeholder="Icon picker coming soon" disabled />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isPending}>
          {isEditMode ? 'Save Changes' : 'Create Category'}
        </Button>
      </DialogFooter>
    </>
  )
}
