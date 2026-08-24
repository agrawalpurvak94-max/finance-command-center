import { InlineSelector } from '@/components/transactions/InlineSelector'
import { useTransactionCategories } from '@/hooks/useTransactions'
import type { Category } from '@/domain/Category'

interface CategorySelectorProps {
  category: Category | null
  onChange: (categoryId: string | null) => void
}

export function CategorySelector({ category, onChange }: CategorySelectorProps) {
  const { data: categories = [] } = useTransactionCategories()
  // The master category list can itself contain a real "Uncategorized" row
  // — excluded here so it isn't offered twice alongside InlineSelector's
  // own built-in "none" slot (which already renders that same label).
  // Kept in the list when it's the CURRENTLY selected category, though —
  // otherwise InlineSelector can't resolve its label and would fall back to
  // showing the raw UUID.
  const options = categories.filter((c) => c.name !== 'Uncategorized' || c.id === category?.id)

  return (
    <InlineSelector
      value={category?.id ?? null}
      options={options}
      placeholder="Uncategorized"
      emptyLabel="Uncategorized"
      onChange={onChange}
      aria-label="Category"
    />
  )
}
