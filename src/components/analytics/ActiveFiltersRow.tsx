import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/ui/button'
import type { Category } from '@/domain/Category'
import type { Client } from '@/domain/Client'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type { AnalyticsFilters } from '@/domain/Analytics'

interface ActiveFiltersRowProps {
  filters: AnalyticsFilters
  onRemove: (key: keyof AnalyticsFilters) => void
  onClearAll: () => void
  categories: readonly Category[]
  clients: readonly Client[]
  merchants: readonly Merchant[]
  accounts: readonly TransactionAccount[]
}

const FILTER_LABELS: Partial<Record<keyof AnalyticsFilters, string>> = {
  categoryId: 'Category',
  clientId: 'Client',
  merchantId: 'Merchant',
  bankAccountId: 'Bank Account',
  creditCardId: 'Credit Card',
  bankName: 'Bank',
  type: 'Type',
  ownerType: 'Biz/Personal',
  paymentMode: 'Payment Mode',
  status: 'Status',
  statementMonth: 'Statement Month',
  amountMin: 'Min Amount',
  amountMax: 'Max Amount',
}

function resolveValueLabel(
  key: keyof AnalyticsFilters,
  filters: AnalyticsFilters,
  refs: Pick<ActiveFiltersRowProps, 'categories' | 'clients' | 'merchants' | 'accounts'>,
): string {
  switch (key) {
    case 'categoryId':
      return (
        refs.categories.find((c) => c.id === filters.categoryId)?.name ?? String(filters.categoryId)
      )
    case 'clientId':
      return refs.clients.find((c) => c.id === filters.clientId)?.name ?? String(filters.clientId)
    case 'merchantId':
      return (
        refs.merchants.find((m) => m.id === filters.merchantId)?.name ?? String(filters.merchantId)
      )
    case 'bankAccountId':
    case 'creditCardId': {
      const id = filters[key]
      const account = refs.accounts.find((a) => a.id === id)
      return account ? `${account.bankName} •••• ${account.last4}` : String(id)
    }
    default:
      return String(filters[key])
  }
}

/** Removable chips for the stacked cross-filters currently applied — the
 * visual record of "click → cross-filter" accumulating, distinct from the
 * `GlobalFilterBar`'s draft/apply controls above it. */
export function ActiveFiltersRow({
  filters,
  onRemove,
  onClearAll,
  categories,
  clients,
  merchants,
  accounts,
}: ActiveFiltersRowProps) {
  const activeKeys = (Object.keys(filters) as (keyof AnalyticsFilters)[]).filter(
    (key) => filters[key] !== undefined && FILTER_LABELS[key],
  )

  if (activeKeys.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-xs">
      <AnimatePresence initial={false}>
        {activeKeys.map((key) => (
          <motion.span
            key={key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-xs rounded-full border border-primary/30 bg-primary/10 px-sm py-1 text-body-sm text-primary"
          >
            {FILTER_LABELS[key]}:{' '}
            {resolveValueLabel(key, filters, { categories, clients, merchants, accounts })}
            <button
              type="button"
              aria-label={`Remove ${FILTER_LABELS[key]} filter`}
              className="rounded-full p-0.5 hover:bg-primary/20"
              onClick={() => onRemove(key)}
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>
      {activeKeys.length > 1 && (
        <Button variant="ghost" size="sm" className="h-7 text-body-sm" onClick={onClearAll}>
          Clear all
        </Button>
      )}
    </div>
  )
}
