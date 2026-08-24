import { getMerchantIdentity } from '@/lib/merchantIdentity'
import { cn } from '@/lib/utils'
import type { Merchant } from '@/domain/Merchant'

interface MerchantCellProps {
  merchant: Merchant
}

/**
 * Reuses the Stage 5 Merchant Center identity system (deterministic
 * initials + accent color, see merchantIdentity.ts) instead of the
 * previous generic Building2 icon shared by every row — one identity
 * system for the whole app, not a second one invented for Transactions.
 */
export function MerchantCell({ merchant }: MerchantCellProps) {
  const identity = getMerchantIdentity(merchant.name)

  return (
    <div className="flex min-w-0 items-center gap-sm">
      <div
        aria-hidden="true"
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg text-[11px] font-semibold',
          identity.chipClassName,
        )}
      >
        {identity.initials}
      </div>
      <span className="truncate text-body-sm font-semibold text-foreground">{merchant.name}</span>
    </div>
  )
}
