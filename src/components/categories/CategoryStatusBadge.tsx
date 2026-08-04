import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CategoryStatus } from '@/domain/Category'

const statusConfig: Record<CategoryStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  },
  inactive: {
    label: 'Inactive',
    className: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
  },
}

interface CategoryStatusBadgeProps {
  status: CategoryStatus
}

export function CategoryStatusBadge({ status }: CategoryStatusBadgeProps) {
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
