import {
  Search,
  ListFilter,
  ArrowLeftRight,
  Tag,
  CircleCheck,
  Gauge,
  Users,
  UserRound,
  Briefcase,
  CircleAlert,
} from 'lucide-react'
import { FilterChip } from '@/components/transactions/FilterChip'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { StatementTransactionFilters as FiltersType } from '@/domain/StatementTransaction'
import type { Client } from '@/domain/Client'

interface StatementTransactionFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filters: FiltersType
  onFiltersChange: (patch: Partial<FiltersType>) => void
  onClear: () => void
  categoryOptions: readonly string[]
  categorySourceOptions: readonly string[]
  statusOptions: readonly string[]
  clientOptions: readonly Client[]
  accountHolders: readonly string[]
}

// Same small pattern as StatementFilters.tsx's local ReferenceSelect —
// Base UI's Select.Value needs a children render-function to resolve a
// label from a raw value string.
function OptionSelect({
  value,
  placeholder,
  options,
  onChange,
  ariaLabel,
}: {
  value: string | undefined
  placeholder: string
  options: readonly { id: string; label: string }[]
  onChange: (value: string | undefined) => void
  ariaLabel: string
}) {
  const ALL_VALUE = '__all__'
  const labelsById: Record<string, string> = { [ALL_VALUE]: 'All' }
  for (const option of options) labelsById[option.id] = option.label

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
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const CONFIDENCE_TIERS = [
  { id: 'high', label: 'High (80%+)' },
  { id: 'medium', label: 'Medium (50–79%)' },
  { id: 'low', label: 'Low (<50%)' },
]

export function StatementTransactionFilters({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  onClear,
  categoryOptions,
  categorySourceOptions,
  statusOptions,
  clientOptions,
  accountHolders,
}: StatementTransactionFiltersProps) {
  const hasActiveFilters =
    !!filters.category ||
    !!filters.uncategorizedOnly ||
    !!filters.type ||
    !!filters.categorySource ||
    !!filters.status ||
    !!filters.confidenceTier ||
    !!filters.clientId ||
    !!filters.accountHolder ||
    !!filters.ownerType

  return (
    <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
      <div className="relative min-w-56 flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search transactions…"
          className="pl-9"
          aria-label="Search statement transactions"
        />
      </div>

      <FilterChip icon={Tag} label="Category" isActive={!!filters.category}>
        <OptionSelect
          value={filters.category}
          placeholder="All categories"
          options={categoryOptions.map((c) => ({ id: c, label: c }))}
          onChange={(v) => onFiltersChange({ category: v })}
          ariaLabel="Category filter"
        />
      </FilterChip>

      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-pressed={!!filters.uncategorizedOnly}
        onClick={() =>
          onFiltersChange({ uncategorizedOnly: filters.uncategorizedOnly ? undefined : true })
        }
        className={cn(
          'gap-xs rounded-md border-border bg-card text-body-sm font-medium',
          filters.uncategorizedOnly && 'border-primary/50 bg-primary/10 text-primary',
        )}
      >
        <CircleAlert className="size-3.5 text-muted-foreground" aria-hidden="true" />
        Uncategorized Only
      </Button>

      <FilterChip icon={ArrowLeftRight} label="Debit/Credit" isActive={!!filters.type}>
        <OptionSelect
          value={filters.type}
          placeholder="Debit or credit"
          options={[
            { id: 'debit', label: 'Debit' },
            { id: 'credit', label: 'Credit' },
          ]}
          onChange={(v) => onFiltersChange({ type: v as FiltersType['type'] })}
          ariaLabel="Debit or credit filter"
        />
      </FilterChip>

      <FilterChip icon={ListFilter} label="Type" isActive={!!filters.categorySource}>
        <OptionSelect
          value={filters.categorySource}
          placeholder="Category source"
          options={categorySourceOptions.map((s) => ({
            id: s,
            label: s === 'ai' ? 'AI Categorized' : s,
          }))}
          onChange={(v) => onFiltersChange({ categorySource: v })}
          ariaLabel="Category source filter"
        />
      </FilterChip>

      <FilterChip icon={CircleCheck} label="Status" isActive={!!filters.status}>
        <OptionSelect
          value={filters.status}
          placeholder="Any status"
          options={statusOptions.map((s) => ({
            id: s,
            label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '),
          }))}
          onChange={(v) => onFiltersChange({ status: v })}
          ariaLabel="Status filter"
        />
      </FilterChip>

      <FilterChip icon={Gauge} label="Confidence" isActive={!!filters.confidenceTier}>
        <OptionSelect
          value={filters.confidenceTier}
          placeholder="Any confidence"
          options={CONFIDENCE_TIERS}
          onChange={(v) => onFiltersChange({ confidenceTier: v as FiltersType['confidenceTier'] })}
          ariaLabel="Confidence filter"
        />
      </FilterChip>

      <FilterChip icon={Users} label="Client" isActive={!!filters.clientId}>
        <OptionSelect
          value={filters.clientId}
          placeholder="All clients"
          options={clientOptions.map((c) => ({ id: c.id, label: c.name }))}
          onChange={(v) => onFiltersChange({ clientId: v })}
          ariaLabel="Client filter"
        />
      </FilterChip>

      <FilterChip icon={UserRound} label="Account Holder" isActive={!!filters.accountHolder}>
        <OptionSelect
          value={filters.accountHolder}
          placeholder="All holders"
          options={accountHolders.map((name) => ({ id: name, label: name }))}
          onChange={(v) => onFiltersChange({ accountHolder: v })}
          ariaLabel="Account holder filter"
        />
      </FilterChip>

      <FilterChip icon={Briefcase} label="Biz/Pers" isActive={!!filters.ownerType}>
        <OptionSelect
          value={filters.ownerType}
          placeholder="Business or personal"
          options={[
            { id: 'business', label: 'Business' },
            { id: 'personal', label: 'Personal' },
          ]}
          onChange={(v) => onFiltersChange({ ownerType: v as FiltersType['ownerType'] })}
          ariaLabel="Business or personal filter"
        />
      </FilterChip>

      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Clear Filters
        </Button>
      )}
    </div>
  )
}
