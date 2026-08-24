import { ArrowDownLeft, ArrowUpRight, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatINR } from '@/utils/currency'
import { Card } from '@/components/ui/card'
import { IconChip } from '@/components/ui/icon-chip'
import type { FinancialSnapshotMetric } from '@/domain/Dashboard'

interface FinancialSnapshotCardProps {
  spend?: FinancialSnapshotMetric
  inflow?: FinancialSnapshotMetric
  onOpenFlowDrawer: (kind: 'spend' | 'inflow') => void
}

/**
 * Bespoke, single-use pairing of the Spend/Inflow metrics as one coherent
 * financial overview rather than two unrelated KPICards — these are the
 * only two metrics on the page that are directly related (income vs
 * outflow), so they get their own layout instead of reusing the generic
 * KPICard grid used by every other module's summary widgets.
 */
export function FinancialSnapshotCard({
  spend,
  inflow,
  onOpenFlowDrawer,
}: FinancialSnapshotCardProps) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <SnapshotHalf
          label="Spend"
          value={spend?.value ?? 0}
          tone="danger"
          icon={ArrowUpRight}
          onClick={() => onOpenFlowDrawer('spend')}
          ariaLabel="View spend details"
        />
        <SnapshotHalf
          label="Inflow"
          value={inflow?.value ?? 0}
          tone="info"
          icon={ArrowDownLeft}
          onClick={() => onOpenFlowDrawer('inflow')}
          ariaLabel="View inflow details"
        />
      </div>
    </Card>
  )
}

interface SnapshotHalfProps {
  label: string
  value: number
  tone: 'danger' | 'info'
  icon: typeof ArrowUpRight
  onClick: () => void
  ariaLabel: string
}

function SnapshotHalf({ label, value, tone, icon: Icon, onClick, ariaLabel }: SnapshotHalfProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="group flex flex-col gap-sm p-lg text-left transition-colors hover:bg-surface-hover"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-sm">
          <IconChip tone={tone} size="sm">
            <Icon className="size-3.5" aria-hidden="true" />
          </IconChip>
          <span className="text-label-caps uppercase text-muted-foreground">{label}</span>
        </div>
        <ChevronRight
          className={cn(
            'size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100',
          )}
          aria-hidden="true"
        />
      </div>
      <div className="text-display-kpi tabular-nums text-foreground">{formatINR(value)}</div>
    </button>
  )
}
