import type { UseQueryResult } from '@tanstack/react-query'
import { CircleCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { formatINR } from '@/utils/currency'
import { cn } from '@/lib/utils'
import type { ResolutionQueueItem } from '@/domain/Dashboard'

const reasonToneClass: Record<ResolutionQueueItem['reason'], string> = {
  uncategorized: 'text-tertiary',
  missing_gst: 'text-destructive',
  tag_required: 'text-tertiary',
}

interface ResolutionQueueWidgetProps {
  query: UseQueryResult<ResolutionQueueItem[]>
  onResolve?: (itemId: string) => void
}

export function ResolutionQueueWidget({ query, onResolve }: ResolutionQueueWidgetProps) {
  const count = query.data?.length ?? 0

  return (
    <div className="flex h-full flex-col gap-md">
      <div className="flex items-center justify-between">
        <h2 className="text-headline-sm text-foreground">Resolution Queue</h2>
        {count > 0 && (
          <span className="rounded-full bg-destructive/10 px-sm py-0.5 text-[10px] font-bold text-destructive">
            {count} ACTIONABLE
          </span>
        )}
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-border bg-muted">
        <QueryBoundary
          query={query}
          skeleton={
            <div className="flex flex-col divide-y divide-border">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="m-md h-20" />
              ))}
            </div>
          }
          isEmpty={(data) => data.length === 0}
          empty={
            <EmptyState
              icon={CircleCheck}
              title="Nothing needs attention"
              description="Flagged transactions requiring review will show up here."
            />
          }
        >
          {(items) => (
            <div className="flex flex-col divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="group p-md transition-colors hover:bg-accent">
                  <div className="mb-xs flex items-start justify-between">
                    <span className={cn('text-label-caps', reasonToneClass[item.reason])}>
                      {item.reasonLabel}
                    </span>
                    <span className="text-table-mono text-muted-foreground">
                      {item.flaggedOnLabel}
                    </span>
                  </div>
                  <p className="mb-md text-body-md text-foreground">{item.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-table-mono tabular-nums text-muted-foreground">
                      {formatINR(item.amount)}
                    </span>
                    <Button size="sm" onClick={() => onResolve?.(item.id)}>
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </QueryBoundary>
      </div>
    </div>
  )
}
