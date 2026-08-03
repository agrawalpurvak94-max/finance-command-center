import { RefreshCw, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StatementsHeaderProps {
  onUpload: () => void
  onRefresh: () => void
  isRefreshing?: boolean
}

export function StatementsHeader({ onUpload, onRefresh, isRefreshing }: StatementsHeaderProps) {
  return (
    <div className="flex flex-col gap-md sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-headline-lg text-foreground">Statement Processing</h1>
        <p className="text-body-sm text-muted-foreground">
          Track imported bank and credit card statements as they're ingested and processed.
        </p>
      </div>
      <div className="flex gap-sm">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isRefreshing}>
          <RefreshCw
            className={isRefreshing ? 'size-4 animate-spin' : 'size-4'}
            aria-hidden="true"
          />
          Refresh
        </Button>
        <Button size="sm" onClick={onUpload}>
          <Upload className="size-4" aria-hidden="true" />
          Upload Statement
        </Button>
      </div>
    </div>
  )
}
