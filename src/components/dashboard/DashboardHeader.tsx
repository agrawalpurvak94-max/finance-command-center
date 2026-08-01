import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardHeaderProps {
  onRefresh: () => void
  isRefreshing: boolean
}

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  return now
}

export function DashboardHeader({ onRefresh, isRefreshing }: DashboardHeaderProps) {
  const now = useClock()
  const refreshedAt = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="mb-xl flex items-end justify-between gap-md">
      <div>
        <h1 className="text-headline-lg text-foreground">Operational Command Center</h1>
        <p className="mt-xs text-body-md text-muted-foreground">
          Real-time fiscal monitoring and processing queue for all connected accounts.
        </p>
      </div>
      <div className="flex items-center gap-sm">
        <span className="rounded-md border border-border bg-card px-sm py-xs text-table-mono tabular-nums text-muted-foreground">
          Refreshed: {refreshedAt}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Refresh dashboard data"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw
            className={isRefreshing ? 'size-4 animate-spin' : 'size-4'}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  )
}
