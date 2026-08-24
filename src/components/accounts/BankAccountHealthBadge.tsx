import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { BankAccountHealth } from '@/domain/Account'

const healthConfig: Record<BankAccountHealth, { label: string; tone: SemanticTone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  low_balance: { label: 'Low Balance', tone: 'warning' },
  sync_required: { label: 'Sync Required', tone: 'info' },
  // Previously a one-off `rose` literal, distinct from every other danger
  // state in the app; consolidated onto the shared `danger` tone (used
  // elsewhere for suspended/overdue/duplicate) as part of Stage 1's
  // semantic-color cleanup — same severity, one fewer ad hoc color.
  needs_review: { label: 'Needs Review', tone: 'danger' },
}

interface BankAccountHealthBadgeProps {
  health: BankAccountHealth
}

export function BankAccountHealthBadge({ health }: BankAccountHealthBadgeProps) {
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
