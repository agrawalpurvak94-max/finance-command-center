import { getMerchantIdentity } from '@/lib/merchantIdentity'
import { cn } from '@/lib/utils'

interface MerchantIdentityCellProps {
  merchantId: string
  name: string
  onReview: () => void
}

/**
 * The merchant identity anchor for a table row — avatar mark (initials +
 * deterministic accent, see merchantIdentity.ts) plus the name, which
 * remains the click target that opens the review drawer exactly as
 * before (same `data-merchant-row-trigger` used for focus restoration).
 */
export function MerchantIdentityCell({ merchantId, name, onReview }: MerchantIdentityCellProps) {
  const identity = getMerchantIdentity(name)

  return (
    <div className="group/identity flex min-w-0 items-center gap-sm">
      <div
        aria-hidden="true"
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-semibold transition-transform duration-150 group-hover/identity:scale-105',
          identity.chipClassName,
        )}
      >
        {identity.initials}
      </div>
      <button
        type="button"
        data-merchant-row-trigger={merchantId}
        title={name}
        onClick={(e) => {
          e.stopPropagation()
          onReview()
        }}
        className="min-w-0 max-w-56 truncate text-left text-body-sm font-semibold text-foreground underline-offset-2 hover:underline focus-visible:underline"
      >
        {name}
      </button>
    </div>
  )
}
