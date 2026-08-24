import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { TransactionStatus } from '@/domain/Transaction'

const statusConfig: Record<TransactionStatus, { label: string; tone: SemanticTone }> = {
  reviewed: { label: 'Reviewed', tone: 'success' },
  verified: { label: 'Verified', tone: 'info' },
  uncategorized: { label: 'Uncategorized', tone: 'neutral' },
  pending_review: { label: 'Pending Review', tone: 'attention' },
  flagged: { label: 'Flagged', tone: 'attention' },
  duplicate: { label: 'Duplicate', tone: 'danger' },
}

interface StatusBadgeProps {
  status: TransactionStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status]
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
