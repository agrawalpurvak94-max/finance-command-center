import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { semanticToneBadgeClassName, type SemanticTone } from '@/lib/semanticTone'
import type { CategoryStatus } from '@/domain/Category'

const statusConfig: Record<CategoryStatus, { label: string; tone: SemanticTone }> = {
  active: { label: 'Active', tone: 'success' },
  inactive: { label: 'Inactive', tone: 'neutral' },
}

interface CategoryStatusBadgeProps {
  status: CategoryStatus
}

export function CategoryStatusBadge({ status }: CategoryStatusBadgeProps) {
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
