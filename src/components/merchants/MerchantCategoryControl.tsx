import { Tag } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  resolveCategoryIcon,
  categoryColorClassNames,
} from '@/components/categories/categoryVisuals'
import { cn } from '@/lib/utils'
import type { Category, CategoryColor } from '@/domain/Category'

export interface CategoryVisual {
  readonly color: CategoryColor
  readonly icon: string
}

interface MerchantCategoryControlProps {
  category: Category | null
  categories: readonly Category[]
  categoryVisualsById: ReadonlyMap<string, CategoryVisual>
  onChange: (categoryId: string | null) => void
}

const NONE_VALUE = '__none__'

/**
 * Lowercase on purpose — a capitalized `function CategoryGlyph(...)` that
 * resolves `resolveCategoryIcon(key)` and returns `<Icon />` trips React
 * Compiler's "components created during render" check (it treats any
 * capitalized function returning JSX as a component to statically
 * analyze). Called directly as a function rather than JSX (`<Foo/>`)
 * instead, matching how `CategoryTable.tsx` already does the identical
 * `resolveCategoryIcon` lookup inside a plain (lowercase) cell callback.
 */
function renderCategoryGlyph(iconKey: string | undefined, className: string) {
  const Icon = iconKey ? resolveCategoryIcon(iconKey) : Tag
  return <Icon className={className} aria-hidden="true" />
}

/**
 * The merchant table's category cell — deliberately a new, table-scoped
 * component rather than reusing `CategorySelector`/`InlineSelector`, which
 * are shared across Transactions/Statements/the merchant drawer and stay
 * untouched (Stage 5 is scoped to this table only). Calls the exact same
 * `onChange(categoryId)` contract the row's mutation handler already
 * expects — this is a presentation-only swap.
 *
 * `categoryVisualsById` is optional enrichment (icon/color) sourced from
 * the Categories module's own master data — when a category isn't in the
 * map (or has none), the control falls back to a plain neutral tag, never
 * inventing a color.
 */
export function MerchantCategoryControl({
  category,
  categories,
  categoryVisualsById,
  onChange,
}: MerchantCategoryControlProps) {
  const currentVisual = category ? categoryVisualsById.get(category.id) : undefined
  const toneClassName = currentVisual
    ? categoryColorClassNames[currentVisual.color]
    : 'bg-muted-foreground/10 text-muted-foreground'

  return (
    <Select
      value={category?.id ?? NONE_VALUE}
      onValueChange={(next) => onChange(next === NONE_VALUE ? null : next)}
    >
      <SelectTrigger
        size="sm"
        aria-label="Category"
        className={cn(
          'w-fit max-w-44 gap-1.5 rounded-full border-transparent px-2.5 font-medium transition-colors hover:border-input',
          toneClassName,
        )}
      >
        {renderCategoryGlyph(currentVisual?.icon, 'size-3.5 shrink-0')}
        <SelectValue placeholder="Uncategorized">
          {() => <span className="truncate">{category?.name ?? 'Uncategorized'}</span>}
        </SelectValue>
      </SelectTrigger>
      <SelectContent align="start">
        <SelectItem value={NONE_VALUE}>
          <span className="flex size-5 items-center justify-center rounded bg-muted-foreground/10 text-muted-foreground">
            <Tag className="size-3" aria-hidden="true" />
          </span>
          Uncategorized
        </SelectItem>
        {categories.map((c) => {
          const visual = categoryVisualsById.get(c.id)
          return (
            <SelectItem key={c.id} value={c.id}>
              <span
                className={cn(
                  'flex size-5 items-center justify-center rounded',
                  visual
                    ? categoryColorClassNames[visual.color]
                    : 'bg-muted-foreground/10 text-muted-foreground',
                )}
              >
                {renderCategoryGlyph(visual?.icon, 'size-3')}
              </span>
              {c.name}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
