import {
  CalendarRange,
  Tag,
  User,
  Store,
  Landmark,
  CreditCard,
  ArrowLeftRight,
  Briefcase,
  ListFilter,
  Banknote,
} from 'lucide-react'
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
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type { TransactionFilters } from '@/domain/Transaction'

interface FilterToolbarProps {
  draft: TransactionFilters
  onChange: (patch: Partial<TransactionFilters>) => void
  onApply: () => void
  onClear: () => void
  categories: readonly Category[]
  clients: readonly Client[]
  merchants: readonly Merchant[]
  bankAccounts: readonly TransactionAccount[]
  creditCards: readonly TransactionAccount[]
}

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

export function FilterToolbar({
  draft,
  onChange,
  onApply,
  onClear,
  categories,
  clients,
  merchants,
  bankAccounts,
  creditCards,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card p-sm">
      <FilterChip
        icon={CalendarRange}
        label="Date Range"
        isActive={!!(draft.dateFrom || draft.dateTo)}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="filter-date-from">From</Label>
            <Input
              id="filter-date-from"
              type="date"
              value={draft.dateFrom ?? ''}
              onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor="filter-date-to">To</Label>
            <Input
              id="filter-date-to"
              type="date"
              value={draft.dateTo ?? ''}
              onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
            />
          </div>
        </div>
      </FilterChip>

      <FilterChip icon={Tag} label="Category" isActive={!!draft.categoryId}>
        <ReferenceSelect
          value={draft.categoryId}
          placeholder="All categories"
          options={categories}
          onChange={(v) => onChange({ categoryId: v })}
          ariaLabel="Category filter"
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

      <FilterChip icon={Store} label="Merchant" isActive={!!draft.merchantId}>
        <ReferenceSelect
          value={draft.merchantId}
          placeholder="All merchants"
          options={merchants}
          onChange={(v) => onChange({ merchantId: v })}
          ariaLabel="Merchant filter"
        />
      </FilterChip>

      <FilterChip icon={Landmark} label="Bank Account" isActive={!!draft.bankAccountId}>
        <ReferenceSelect
          value={draft.bankAccountId}
          placeholder="All bank accounts"
          options={bankAccounts.map((a) => ({ id: a.id, name: `${a.bankName} •••• ${a.last4}` }))}
          onChange={(v) => onChange({ bankAccountId: v })}
          ariaLabel="Bank account filter"
        />
      </FilterChip>

      <FilterChip icon={CreditCard} label="Credit Card" isActive={!!draft.creditCardId}>
        <ReferenceSelect
          value={draft.creditCardId}
          placeholder="All credit cards"
          options={creditCards.map((a) => ({ id: a.id, name: `${a.bankName} •••• ${a.last4}` }))}
          onChange={(v) => onChange({ creditCardId: v })}
          ariaLabel="Credit card filter"
        />
      </FilterChip>

      <FilterChip icon={ArrowLeftRight} label="Type" isActive={!!draft.type}>
        <ReferenceSelect
          value={draft.type}
          placeholder="Debit or credit"
          options={[
            { id: 'debit', name: 'Debit' },
            { id: 'credit', name: 'Credit' },
          ]}
          onChange={(v) => onChange({ type: v as TransactionFilters['type'] })}
          ariaLabel="Transaction type filter"
        />
      </FilterChip>

      <FilterChip icon={Briefcase} label="Biz / Personal" isActive={!!draft.ownerType}>
        <ReferenceSelect
          value={draft.ownerType}
          placeholder="Business or personal"
          options={[
            { id: 'business', name: 'Business' },
            { id: 'personal', name: 'Personal' },
          ]}
          onChange={(v) => onChange({ ownerType: v as TransactionFilters['ownerType'] })}
          ariaLabel="Business or personal filter"
        />
      </FilterChip>

      <FilterChip icon={ListFilter} label="Status" isActive={!!draft.status}>
        <ReferenceSelect
          value={draft.status}
          placeholder="Any status"
          options={[
            { id: 'reviewed', name: 'Reviewed' },
            { id: 'uncategorized', name: 'Uncategorized' },
            { id: 'duplicate', name: 'Duplicate' },
            { id: 'flagged', name: 'Flagged' },
            { id: 'verified', name: 'Verified' },
            { id: 'pending_review', name: 'Pending Review' },
          ]}
          onChange={(v) => onChange({ status: v as TransactionFilters['status'] })}
          ariaLabel="Status filter"
        />
      </FilterChip>

      <FilterChip
        icon={Banknote}
        label="Amount Range"
        isActive={draft.amountMin !== undefined || draft.amountMax !== undefined}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="filter-amount-min">Min (₹)</Label>
            <Input
              id="filter-amount-min"
              type="number"
              inputMode="decimal"
              value={draft.amountMin ?? ''}
              onChange={(e) =>
                onChange({ amountMin: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="filter-amount-max">Max (₹)</Label>
            <Input
              id="filter-amount-max"
              type="number"
              inputMode="decimal"
              value={draft.amountMax ?? ''}
              onChange={(e) =>
                onChange({ amountMax: e.target.value === '' ? undefined : Number(e.target.value) })
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
          Clear All
        </Button>
      </div>
    </div>
  )
}
