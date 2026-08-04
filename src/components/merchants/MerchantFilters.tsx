import { Tag, ListFilter, Wand2, Hash } from 'lucide-react'
import { FilterChip } from '@/components/transactions/FilterChip'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Category } from '@/domain/Category'
import type { MerchantFilters as MerchantFiltersType } from '@/domain/Merchant'

interface MerchantFiltersProps {
  draft: MerchantFiltersType
  onChange: (patch: Partial<MerchantFiltersType>) => void
  onApply: () => void
  onClear: () => void
  categories: readonly Category[]
}

// Base UI's Select.Value renders the raw value string unless given a
// children render-function to resolve a label — same pattern established in
// components/transactions/FilterToolbar.tsx's ReferenceSelect.
function ReferenceSelect({
  value,
  placeholder,
  options,
  onChange,
  ariaLabel,
}: {
  value: string | undefined
  placeholder: string
  options: readonly { id: string; name: string }[]
  onChange: (value: string | undefined) => void
  ariaLabel: string
}) {
  const ALL_VALUE = '__all__'
  const labelsById: Record<string, string> = { [ALL_VALUE]: 'All' }
  for (const option of options) labelsById[option.id] = option.name

  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? undefined : (v ?? undefined))}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={placeholder}>
          {(current: string) => labelsById[current] ?? current}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function MerchantFilters({
  draft,
  onChange,
  onApply,
  onClear,
  categories,
}: MerchantFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
      <FilterChip icon={Tag} label="Category" isActive={!!draft.categoryId}>
        <ReferenceSelect
          value={draft.categoryId}
          placeholder="All categories"
          options={categories}
          onChange={(v) => onChange({ categoryId: v })}
          ariaLabel="Category filter"
        />
      </FilterChip>

      <FilterChip icon={ListFilter} label="Status" isActive={!!draft.status}>
        <ReferenceSelect
          value={draft.status}
          placeholder="Any status"
          options={[
            { id: 'active', name: 'Active' },
            { id: 'inactive', name: 'Inactive' },
          ]}
          onChange={(v) => onChange({ status: v as MerchantFiltersType['status'] })}
          ariaLabel="Status filter"
        />
      </FilterChip>

      <FilterChip icon={Wand2} label="Has Rules" isActive={draft.hasRules !== undefined}>
        <ReferenceSelect
          value={draft.hasRules === undefined ? undefined : draft.hasRules ? 'yes' : 'no'}
          placeholder="Any"
          options={[
            { id: 'yes', name: 'Has rules' },
            { id: 'no', name: 'No rules' },
          ]}
          onChange={(v) => onChange({ hasRules: v === undefined ? undefined : v === 'yes' })}
          ariaLabel="Has rules filter"
        />
      </FilterChip>

      <FilterChip
        icon={Hash}
        label="Transaction Count"
        isActive={
          draft.minTransactionCount !== undefined || draft.maxTransactionCount !== undefined
        }
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="merchant-filter-txn-count-min">Min</Label>
            <Input
              id="merchant-filter-txn-count-min"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.minTransactionCount ?? ''}
              onChange={(e) =>
                onChange({
                  minTransactionCount: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="merchant-filter-txn-count-max">Max</Label>
            <Input
              id="merchant-filter-txn-count-max"
              type="number"
              inputMode="numeric"
              min={0}
              value={draft.maxTransactionCount ?? ''}
              onChange={(e) =>
                onChange({
                  maxTransactionCount: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
        </div>
      </FilterChip>

      <div className="mx-sm h-6 w-px bg-border" />

      <div className="flex gap-xs">
        <Button variant="ghost" size="sm" className="text-primary" onClick={onApply}>
          Apply Filters
        </Button>
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Filters
        </Button>
      </div>
    </div>
  )
}
