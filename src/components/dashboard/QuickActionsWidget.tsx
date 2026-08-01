import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from 'react-router'
import { CirclePlus, UserPlus, Store, FileText, type LucideIcon } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/QueryBoundary'
import type { QuickAction } from '@/types/dashboard'

const actionIcon: Record<string, LucideIcon> = {
  'add-transaction': CirclePlus,
  'add-client': UserPlus,
  'add-merchant': Store,
  'new-report': FileText,
}

interface QuickActionsWidgetProps {
  query: UseQueryResult<QuickAction[]>
}

export function QuickActionsWidget({ query }: QuickActionsWidgetProps) {
  return (
    <div>
      <h2 className="mb-md text-headline-sm text-foreground">Quick Actions</h2>
      <QueryBoundary
        query={query}
        skeleton={
          <div className="grid grid-cols-2 gap-sm">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        }
      >
        {(actions) => (
          <div className="grid grid-cols-2 gap-sm">
            {actions.map((action) => {
              const Icon = actionIcon[action.id] ?? CirclePlus
              return (
                <Link
                  key={action.id}
                  to={action.href}
                  className="group flex flex-col items-center gap-xs rounded-lg border border-border bg-card p-sm transition-all hover:bg-accent"
                >
                  <Icon
                    className="size-5 text-primary transition-transform group-hover:scale-110"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-medium text-foreground">{action.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </QueryBoundary>
    </div>
  )
}
