import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChartCardProps {
  title: string
  subtitle?: string
  legend?: ReactNode
  /** Omitted when this chart has no natural single-dimension drill target. */
  onViewTransactions?: () => void
  className?: string
  children: ReactNode
}

/** Shared chrome for every main chart — reused 7x within this module so the
 * title/legend/"View Transactions" affordance never has to be rebuilt
 * per-chart. Mount-in fade matches CLAUDE.md's 150–250ms animation rule. */
export function ChartCard({
  title,
  subtitle,
  legend,
  onViewTransactions,
  className,
  children,
}: ChartCardProps) {
  const testId = `chart-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`

  return (
    <motion.div
      data-testid={testId}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card p-lg shadow-sm',
        className,
      )}
    >
      <div className="mb-md flex flex-wrap items-start justify-between gap-sm">
        <div>
          <h3 className="text-headline-sm font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="mt-0.5 text-body-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-sm sm:gap-md">
          {legend}
          {onViewTransactions && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-xs text-primary hover:text-primary"
              onClick={onViewTransactions}
            >
              View Transactions
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Button>
          )}
        </div>
      </div>
      {children}
    </motion.div>
  )
}
