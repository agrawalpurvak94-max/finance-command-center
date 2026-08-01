import { FileClock } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'

/**
 * Stitch's "Statement Import & Alerts" section was an empty, unfinished
 * container in the source export (see DESIGN_DIFF_REPORT.md). Per product
 * decision, the layout slot is preserved but filled with a real empty state
 * rather than left blank or fabricated with fake statement data.
 */
export function StatementWidget() {
  return (
    <div className="flex h-full flex-col gap-md">
      <h2 className="text-headline-sm text-foreground">Statement Activity</h2>
      <div className="flex flex-1 items-center justify-center rounded-lg border border-border bg-muted">
        <EmptyState
          icon={FileClock}
          title="No recent statement activity"
          description="Newly processed bank and card statements will show up here as they're imported."
          action={{ label: 'View Statements', href: '/statements' }}
        />
      </div>
    </div>
  )
}
