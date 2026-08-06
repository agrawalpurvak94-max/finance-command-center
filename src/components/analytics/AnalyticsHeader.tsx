import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type AnalyticsExportKind =
  'dashboard' | 'transactions' | 'statements' | 'categories' | 'merchants' | 'clients' | 'cards'

const EXPORT_ITEMS: readonly { kind: AnalyticsExportKind; label: string }[] = [
  { kind: 'dashboard', label: 'Dashboard Summary' },
  { kind: 'transactions', label: 'Filtered Transactions' },
  { kind: 'statements', label: 'Filtered Statements' },
  { kind: 'categories', label: 'Category Summary' },
  { kind: 'merchants', label: 'Merchant Summary' },
  { kind: 'clients', label: 'Client Summary' },
  { kind: 'cards', label: 'Card Summary' },
]

interface AnalyticsHeaderProps {
  onExport: (kind: AnalyticsExportKind) => void
}

export function AnalyticsHeader({ onExport }: AnalyticsHeaderProps) {
  return (
    <div className="mb-lg flex flex-wrap items-start justify-between gap-sm">
      <div>
        <h1 className="text-headline-lg font-semibold text-foreground">Analytics</h1>
        <p className="mt-1 text-body-md text-muted-foreground">
          Explore spending trends, cash flow, and financial performance across every account.
        </p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="outline" className="gap-xs" />}>
          <Download className="size-4" aria-hidden="true" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Export as CSV</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {EXPORT_ITEMS.map((item) => (
            <DropdownMenuItem key={item.kind} onClick={() => onExport(item.kind)}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
