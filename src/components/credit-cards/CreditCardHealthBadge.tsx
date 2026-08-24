import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { CreditCardHealth } from '@/domain/CreditCard'

const healthConfig: Record<CreditCardHealth, { label: string; tone: SemanticTone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  due_soon: { label: 'Due Soon', tone: 'warning' },
  high_utilization: { label: 'High Utilization', tone: 'info' },
  payment_overdue: { label: 'Payment Overdue', tone: 'danger' },
}

interface CreditCardHealthBadgeProps {
  health: CreditCardHealth
}

export function CreditCardHealthBadge({ health }: CreditCardHealthBadgeProps) {
  const config = healthConfig[health]
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-label-caps font-semibold uppercase tracking-wide',
        semanticToneBadgeClassName(config.tone),
      )}
    >
      {config.label}
    </Badge>
  )
}
