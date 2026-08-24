import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { StatementStatus } from '@/domain/Statement'

const statusConfig: Record<StatementStatus, { label: string; tone: SemanticTone }> = {
  processed: { label: 'Processed', tone: 'success' },
  imported: { label: 'Imported', tone: 'neutral' },
  processing: { label: 'Processing', tone: 'info' },
  pending_review: { label: 'Pending Review', tone: 'attention' },
  failed: { label: 'Failed', tone: 'danger' },
}

interface StatementStatusBadgeProps {
  status: StatementStatus
}

export function StatementStatusBadge({ status }: StatementStatusBadgeProps) {
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
