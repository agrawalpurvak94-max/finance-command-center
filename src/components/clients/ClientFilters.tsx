import { Users2, ListFilter, Tag, CalendarRange } from 'lucide-react'
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
import type { ClientFilters as ClientFiltersType, ClientType } from '@/domain/Client'

interface ClientFiltersProps {
  draft: ClientFiltersType
  onChange: (patch: Partial<ClientFiltersType>) => void
  onApply: () => void
  onClear: () => void
  categories: readonly Category[]
}

const clientTypeLabels: Record<ClientType, string> = {
  personal: 'Personal',
  family_member: 'Family Member',
  company: 'Company',
  business_unit: 'Business Unit',
  trust: 'Trust',
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

export function ClientFilters({
  draft,
  onChange,
  onApply,
  onClear,
  categories,
}: ClientFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
      <FilterChip icon={Users2} label="Client Type" isActive={!!draft.clientType}>
        <ReferenceSelect
          value={draft.clientType}
          placeholder="All types"
          options={Object.entries(clientTypeLabels).map(([id, name]) => ({ id, name }))}
          onChange={(v) => onChange({ clientType: v as ClientType | undefined })}
          ariaLabel="Client type filter"
        />
      </FilterChip>

      <FilterChip icon={ListFilter} label="Status" isActive={!!draft.status}>
        <ReferenceSelect
          value={draft.status}
          placeholder="Any status"
          options={[
            { id: 'active', name: 'Active' },
            { id: 'pending', name: 'Pending' },
            { id: 'suspended', name: 'Suspended' },
          ]}
          onChange={(v) => onChange({ status: v as ClientFiltersType['status'] })}
          ariaLabel="Status filter"
        />
      </FilterChip>

      <FilterChip icon={Tag} label="Category" isActive={!!draft.categoryId}>
        <ReferenceSelect
          value={draft.categoryId}
          placeholder="All categories"
          options={categories}
          onChange={(v) => onChange({ categoryId: v })}
          ariaLabel="Top category filter"
        />
      </FilterChip>

      <FilterChip
        icon={CalendarRange}
        label="Date Added"
        isActive={!!(draft.dateAddedFrom || draft.dateAddedTo)}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="client-filter-date-from">From</Label>
            <Input
              id="client-filter-date-from"
              type="date"
              value={draft.dateAddedFrom ?? ''}
              onChange={(e) => onChange({ dateAddedFrom: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor="client-filter-date-to">To</Label>
            <Input
              id="client-filter-date-to"
              type="date"
              value={draft.dateAddedTo ?? ''}
              onChange={(e) => onChange({ dateAddedTo: e.target.value || undefined })}
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
