import { Building2 } from 'lucide-react'
import type { Merchant } from '@/types/transaction'

interface MerchantCellProps {
  merchant: Merchant
}

/**
 * Stitch's export hotlinks third-party-hosted merchant logo images; those
 * aren't real owned assets, so this uses a generic icon placeholder until a
 * real merchant-logo asset pipeline exists (see Merchant Center module).
 */
export function MerchantCell({ merchant }: MerchantCellProps) {
  return (
    <div className="flex items-center gap-sm">
      <div className="flex size-8 shrink-0 items-center justify-center rounded border border-border bg-muted">
        <Building2 className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <span className="text-body-sm font-semibold text-foreground">{merchant.name}</span>
    </div>
  )
}
