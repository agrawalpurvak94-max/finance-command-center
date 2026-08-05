import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CreditCardHealth } from '@/domain/CreditCard'

const healthConfig: Record<CreditCardHealth, { label: string; className: string }> = {
  healthy: {
    label: 'Healthy',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  due_soon: { label: 'Due Soon', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  high_utilization: {
    label: 'High Utilization',
    className: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  },
  payment_overdue: {
    label: 'Payment Overdue',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

interface CreditCardHealthBadgeProps {
  health: CreditCardHealth
}

export function CreditCardHealthBadge({ health }: CreditCardHealthBadgeProps) {
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
