import { CalendarRange, Landmark, FileType2, ListFilter, User } from 'lucide-react'
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
import type { Client } from '@/domain/Client'
import type { StatementFilters as StatementFiltersType } from '@/domain/Statement'

interface StatementFiltersProps {
  draft: StatementFiltersType
  onChange: (patch: Partial<StatementFiltersType>) => void
  onApply: () => void
  onClear: () => void
  bankNames: readonly string[]
  clients: readonly Client[]
}

// Base UI's Select.Value renders the raw value string unless given a
// children render-function to resolve a label — same pattern established
// in components/transactions/FilterToolbar.tsx's ReferenceSelect.
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

export function StatementFilters({
  draft,
  onChange,
  onApply,
  onClear,
  bankNames,
  clients,
}: StatementFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
      <FilterChip
        icon={CalendarRange}
        label="Date Range"
        isActive={!!(draft.dateFrom || draft.dateTo)}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="stmt-filter-date-from">From</Label>
            <Input
              id="stmt-filter-date-from"
              type="date"
              value={draft.dateFrom ?? ''}
              onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor="stmt-filter-date-to">To</Label>
            <Input
              id="stmt-filter-date-to"
              type="date"
              value={draft.dateTo ?? ''}
              onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
            />
          </div>
        </div>
      </FilterChip>

      <FilterChip icon={Landmark} label="Bank" isActive={!!draft.bankName}>
        <ReferenceSelect
          value={draft.bankName}
          placeholder="All banks"
          options={bankNames.map((name) => ({ id: name, name }))}
          onChange={(v) => onChange({ bankName: v })}
          ariaLabel="Bank filter"
        />
      </FilterChip>

      <FilterChip icon={FileType2} label="Statement Type" isActive={!!draft.accountKind}>
        <ReferenceSelect
          value={draft.accountKind}
          placeholder="Bank or credit card"
          options={[
            { id: 'bank', name: 'Bank Statement' },
            { id: 'credit_card', name: 'Credit Card Statement' },
          ]}
          onChange={(v) => onChange({ accountKind: v as StatementFiltersType['accountKind'] })}
          ariaLabel="Statement type filter"
        />
      </FilterChip>

      <FilterChip icon={ListFilter} label="Processing Status" isActive={!!draft.status}>
        <ReferenceSelect
          value={draft.status}
          placeholder="Any status"
          options={[
            { id: 'imported', name: 'Imported' },
            { id: 'processing', name: 'Processing' },
            { id: 'processed', name: 'Processed' },
            { id: 'failed', name: 'Failed' },
            { id: 'pending_review', name: 'Pending Review' },
          ]}
          onChange={(v) => onChange({ status: v as StatementFiltersType['status'] })}
          ariaLabel="Processing status filter"
        />
      </FilterChip>

      <FilterChip icon={User} label="Client" isActive={!!draft.clientId}>
        <ReferenceSelect
          value={draft.clientId}
          placeholder="All clients"
          options={clients}
          onChange={(v) => onChange({ clientId: v })}
          ariaLabel="Client filter"
        />
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
