import {
  Banknote,
  Bookmark,
  Briefcase,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Landmark,
  ListFilter,
  Store,
  Tag,
  Tags,
  User,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { FilterChip } from '@/components/transactions/FilterChip'
import { FilterReferenceSelect } from '@/components/FilterReferenceSelect'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type { AnalyticsFilters } from '@/domain/Analytics'

interface GlobalFilterBarProps {
  draft: AnalyticsFilters
  onChange: (patch: Partial<AnalyticsFilters>) => void
  onApply: () => void
  onReset: () => void
  categories: readonly Category[]
  clients: readonly Client[]
  merchants: readonly Merchant[]
  bankAccounts: readonly TransactionAccount[]
  creditCards: readonly TransactionAccount[]
  bankNames: readonly string[]
}

function FutureChip({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div
      aria-disabled="true"
      className="flex cursor-not-allowed items-center gap-xs rounded-md border border-dashed border-border px-2.5 py-1.5 text-body-sm text-muted-foreground opacity-60"
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
      <span className="text-label-caps">(future)</span>
    </div>
  )
}

/** The sticky "Power BI-style" filter bar — every dimension is a `FilterChip`
 * popover (reused from the Transactions module) so Analytics never grows a
 * second filter-control pattern. */
export function GlobalFilterBar({
  draft,
  onChange,
  onApply,
  onReset,
  categories,
  clients,
  merchants,
  bankAccounts,
  creditCards,
  bankNames,
}: GlobalFilterBarProps) {
  return (
    <div className="sticky top-0 z-20 flex flex-wrap items-center gap-sm rounded-xl border border-border bg-card/95 p-sm shadow-sm backdrop-blur-sm">
      <FilterChip
        icon={CalendarRange}
        label="Date Range"
        isActive={!!(draft.dateFrom || draft.dateTo)}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="analytics-date-from">From</Label>
            <Input
              id="analytics-date-from"
              type="date"
              value={draft.dateFrom ?? ''}
              onChange={(e) => onChange({ dateFrom: e.target.value || undefined })}
            />
          </div>
          <div>
            <Label htmlFor="analytics-date-to">To</Label>
            <Input
              id="analytics-date-to"
              type="date"
              value={draft.dateTo ?? ''}
              onChange={(e) => onChange({ dateTo: e.target.value || undefined })}
            />
          </div>
        </div>
      </FilterChip>

      <FilterChip icon={User} label="Client" isActive={!!draft.clientId}>
        <FilterReferenceSelect
          value={draft.clientId}
          placeholder="All clients"
          options={clients}
          onChange={(v) => onChange({ clientId: v })}
          ariaLabel="Client filter"
        />
      </FilterChip>

      <FilterChip icon={Tag} label="Category" isActive={!!draft.categoryId}>
        <FilterReferenceSelect
          value={draft.categoryId}
          placeholder="All categories"
          options={categories}
          onChange={(v) => onChange({ categoryId: v })}
          ariaLabel="Category filter"
        />
      </FilterChip>

      <FilterChip icon={Store} label="Merchant" isActive={!!draft.merchantId}>
        <FilterReferenceSelect
          value={draft.merchantId}
          placeholder="All merchants"
          options={merchants}
          onChange={(v) => onChange({ merchantId: v })}
          ariaLabel="Merchant filter"
        />
      </FilterChip>

      <FilterChip icon={Landmark} label="Bank Account" isActive={!!draft.bankAccountId}>
        <FilterReferenceSelect
          value={draft.bankAccountId}
          placeholder="All bank accounts"
          options={bankAccounts.map((a) => ({ id: a.id, name: `${a.bankName} •••• ${a.last4}` }))}
          onChange={(v) => onChange({ bankAccountId: v })}
          ariaLabel="Bank account filter"
        />
      </FilterChip>

      <FilterChip icon={CreditCard} label="Credit Card" isActive={!!draft.creditCardId}>
        <FilterReferenceSelect
          value={draft.creditCardId}
          placeholder="All credit cards"
          options={creditCards.map((a) => ({ id: a.id, name: `${a.bankName} •••• ${a.last4}` }))}
          onChange={(v) => onChange({ creditCardId: v })}
          ariaLabel="Credit card filter"
        />
      </FilterChip>

      <FilterChip icon={Landmark} label="Bank" isActive={!!draft.bankName}>
        <FilterReferenceSelect
          value={draft.bankName}
          placeholder="All banks"
          options={bankNames.map((name) => ({ id: name, name }))}
          onChange={(v) => onChange({ bankName: v })}
          ariaLabel="Bank filter"
        />
      </FilterChip>

      <FilterChip icon={CalendarDays} label="Statement Month" isActive={!!draft.statementMonth}>
        <div>
          <Label htmlFor="analytics-statement-month">Month</Label>
          <Input
            id="analytics-statement-month"
            type="month"
            value={draft.statementMonth ?? ''}
            onChange={(e) => onChange({ statementMonth: e.target.value || undefined })}
          />
          <p className="mt-xs text-body-sm text-muted-foreground">
            Only scopes Statement Processing Status.
          </p>
        </div>
      </FilterChip>

      <FilterChip icon={ListFilter} label="Transaction Type" isActive={!!draft.type}>
        <FilterReferenceSelect
          value={draft.type}
          placeholder="Debit or credit"
          options={[
            { id: 'debit', name: 'Debit' },
            { id: 'credit', name: 'Credit' },
          ]}
          onChange={(v) => onChange({ type: v as AnalyticsFilters['type'] })}
          ariaLabel="Transaction type filter"
        />
      </FilterChip>

      <FilterChip icon={Briefcase} label="Biz / Personal" isActive={!!draft.ownerType}>
        <FilterReferenceSelect
          value={draft.ownerType}
          placeholder="Business or personal"
          options={[
            { id: 'business', name: 'Business' },
            { id: 'personal', name: 'Personal' },
          ]}
          onChange={(v) => onChange({ ownerType: v as AnalyticsFilters['ownerType'] })}
          ariaLabel="Business or personal filter"
        />
      </FilterChip>

      <FilterChip icon={Wallet} label="Payment Mode" isActive={!!draft.paymentMode}>
        <FilterReferenceSelect
          value={draft.paymentMode}
          placeholder="Any payment mode"
          options={[
            { id: 'upi', name: 'UPI' },
            { id: 'card', name: 'Card' },
            { id: 'netbanking', name: 'Net Banking' },
            { id: 'cash', name: 'Cash' },
            { id: 'cheque', name: 'Cheque' },
            { id: 'auto_debit', name: 'Auto Debit' },
          ]}
          onChange={(v) => onChange({ paymentMode: v as AnalyticsFilters['paymentMode'] })}
          ariaLabel="Payment mode filter"
        />
      </FilterChip>

      <FilterChip
        icon={Banknote}
        label="Amount Range"
        isActive={draft.amountMin !== undefined || draft.amountMax !== undefined}
      >
        <div className="flex flex-col gap-sm">
          <div>
            <Label htmlFor="analytics-amount-min">Min (₹)</Label>
            <Input
              id="analytics-amount-min"
              type="number"
              inputMode="decimal"
              value={draft.amountMin ?? ''}
              onChange={(e) =>
                onChange({ amountMin: e.target.value === '' ? undefined : Number(e.target.value) })
              }
            />
          </div>
          <div>
            <Label htmlFor="analytics-amount-max">Max (₹)</Label>
            <Input
              id="analytics-amount-max"
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

      <FutureChip icon={Tags} label="Tags" />
      <FutureChip icon={Bookmark} label="Saved Views" />

      <div className="mx-sm h-6 w-px bg-border" />

      <div className="flex gap-xs">
        <Button variant="ghost" size="sm" className="text-primary" onClick={onApply}>
          Apply
        </Button>
        <Button variant="ghost" size="sm" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  )
}
