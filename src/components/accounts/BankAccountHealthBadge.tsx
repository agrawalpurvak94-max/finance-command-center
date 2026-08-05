import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { BankAccountHealth } from '@/domain/Account'

const healthConfig: Record<BankAccountHealth, { label: string; className: string }> = {
  healthy: {
    label: 'Healthy',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  low_balance: {
    label: 'Low Balance',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  },
  sync_required: {
    label: 'Sync Required',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  needs_review: {
    label: 'Needs Review',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  },
}

interface BankAccountHealthBadgeProps {
  health: BankAccountHealth
}

export function BankAccountHealthBadge({ health }: BankAccountHealthBadgeProps) {
  const config = healthConfig[health]
  return (
    <Badge
      variant="outline"
      className={cn('text-label-caps font-semibold uppercase tracking-wide', config.className)}
    >
      {config.label}
    </Badge>
  )
}
