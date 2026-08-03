import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { StatementStatus } from '@/domain/Statement'

const statusConfig: Record<StatementStatus, { label: string; className: string }> = {
  processed: {
    label: 'Processed',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  imported: {
    label: 'Imported',
    className: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
  },
  processing: {
    label: 'Processing',
    className: 'border-primary/30 bg-primary/10 text-primary',
  },
  pending_review: {
    label: 'Pending Review',
    className: 'border-tertiary/30 bg-tertiary/10 text-tertiary',
  },
  failed: {
    label: 'Failed',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

interface StatementStatusBadgeProps {
  status: StatementStatus
}

export function StatementStatusBadge({ status }: StatementStatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-label-caps font-semibold uppercase tracking-wide', config.className)}
    >
      {config.label}
    </Badge>
  )
}
