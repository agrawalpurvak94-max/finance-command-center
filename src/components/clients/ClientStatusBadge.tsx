import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { ClientRecordStatus } from '@/domain/Client'

const statusConfig: Record<ClientRecordStatus, { label: string; tone: SemanticTone }> = {
  active: { label: 'Active', tone: 'success' },
  pending: { label: 'Pending', tone: 'warning' },
  suspended: { label: 'Suspended', tone: 'danger' },
}

interface ClientStatusBadgeProps {
  status: ClientRecordStatus
}

export function ClientStatusBadge({ status }: ClientStatusBadgeProps) {
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
