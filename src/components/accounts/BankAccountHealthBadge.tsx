import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { BankAccountHealth } from '@/domain/Account'

const healthConfig: Record<BankAccountHealth, { label: string; tone: SemanticTone }> = {
  healthy: { label: 'Healthy', tone: 'success' },
  low_balance: { label: 'Low Balance', tone: 'warning' },
  sync_required: { label: 'Sync Required', tone: 'info' },
  // "Needs review" is an action state (review required), not an error
  // state — `attention` is the correct tone; `danger` is reserved for
  // actual failure/problem states (suspended/overdue/duplicate).
  needs_review: { label: 'Needs Review', tone: 'attention' },
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
