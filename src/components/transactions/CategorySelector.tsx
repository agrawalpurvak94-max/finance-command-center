import { InlineSelector } from '@/components/transactions/InlineSelector'
import { useTransactionCategories } from '@/hooks/useTransactions'
import type { Category } from '@/domain/Category'

interface CategorySelectorProps {
  category: Category | null
  onChange: (categoryId: string | null) => void
}

export function CategorySelector({ category, onChange }: CategorySelectorProps) {
  const { data: categories = [] } = useTransactionCategories()

  return (
    <InlineSelector
      value={category?.id ?? null}
      options={categories}
      placeholder="Uncategorized"
      emptyLabel="Uncategorized"
      onChange={onChange}
      aria-label="Category"
    />
  )
}
