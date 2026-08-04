import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ActiveFilterBannerProps {
  label: string
  onClear: () => void
}

/**
 * Generic drill-down banner — shown when a page's filters were seeded from
 * another module's "View X" row action (e.g. Categories' "View
 * Transactions") rather than set by hand. Not module-specific: the same
 * component is meant to be reused as future modules (Merchant, Client,
 * Account, Credit Card, Statement) grow their own drill-down actions.
 */
export function ActiveFilterBanner({ label, onClear }: ActiveFilterBannerProps) {
  return (
    <div className="flex items-center justify-between gap-sm rounded-lg border border-primary/30 bg-primary/10 px-md py-sm">
      <div className="flex items-center gap-xs text-body-sm text-primary">
        <Filter className="size-4 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="h-7 gap-xs px-2 text-primary hover:text-primary"
      >
        <X className="size-3.5" aria-hidden="true" />
        Clear
      </Button>
    </div>
  )
}
