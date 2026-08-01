import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TransactionStatus } from '@/types/transaction'

const statusConfig: Record<TransactionStatus, { label: string; className: string }> = {
  reviewed: {
    label: 'Reviewed',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  verified: { label: 'Verified', className: 'border-primary/30 bg-primary/10 text-primary' },
  uncategorized: {
    label: 'Uncategorized',
    className: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
  },
  pending_review: {
    label: 'Pending Review',
    className: 'border-tertiary/30 bg-tertiary/10 text-tertiary',
  },
  flagged: { label: 'Flagged', className: 'border-tertiary/30 bg-tertiary/10 text-tertiary' },
  duplicate: {
    label: 'Duplicate',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

interface StatusBadgeProps {
  status: TransactionStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
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
