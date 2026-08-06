import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { ClientRecordStatus } from '@/domain/Client'

const statusConfig: Record<ClientRecordStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  pending: { label: 'Pending', className: 'border-amber-500/30 bg-amber-500/10 text-amber-400' },
  suspended: {
    label: 'Suspended',
    className: 'border-destructive/30 bg-destructive/10 text-destructive',
  },
}

interface ClientStatusBadgeProps {
  status: ClientRecordStatus
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
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
