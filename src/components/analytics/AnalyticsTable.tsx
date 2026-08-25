import { useMemo, useState } from 'react'
import { ArrowUpDown, ArrowUpRight, Download, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pagination } from '@/components/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { isHighlighted } from '@/components/analytics/analyticsInteraction'
import type { AnalyticsWidgetHandlers } from '@/components/analytics/analyticsInteraction'
import { getMerchantIdentity } from '@/lib/merchantIdentity'
import { cn } from '@/lib/utils'
import { analyticsRowsToCsv, downloadCsv } from '@/utils/csv'
import type { AnalyticsRankedRow } from '@/domain/Analytics'

interface AnalyticsTableProps extends AnalyticsWidgetHandlers {
  title: string
  rows: readonly AnalyticsRankedRow[]
  valueColumnLabel: string
  secondaryColumnLabel?: string
  exportFileName: string
  /** Purely presentational — selects which identity mark (if any) renders
   * next to each row's label. Reuses Stage 5's merchant identity system on
   * `row.label` directly; no new data, no row-shape change. Omit for tabs
   * whose rows aren't merchants (categories/clients/cards/accounts/etc.). */
  entityKind?: 'merchant'
}

export function AnalyticsTable({
  title,
  rows,
  valueColumnLabel,
  secondaryColumnLabel,
  exportFileName,
  entityKind,
  hoveredDimension,
  onHover,
  onCrossFilter,
  onDrillDown,
}: AnalyticsTableProps) {
  const [search, setSearch] = useState('')
  const [sortDesc, setSortDesc] = useState(true)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(5)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const matched = needle
      ? rows.filter(
          (r) =>
            r.label.toLowerCase().includes(needle) || r.sublabel?.toLowerCase().includes(needle),
        )
      : rows
    return [...matched].sort((a, b) => (sortDesc ? b.value - a.value : a.value - b.value))
  }, [rows, search, sortDesc])

  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize)

  function handleRowClick(row: AnalyticsRankedRow) {
    if (row.drillFilter) onCrossFilter(row.drillFilter)
  }

  function handleRowDrillDown(row: AnalyticsRankedRow) {
    onDrillDown(row.drillFilter ?? {})
  }

  function handleExport() {
    downloadCsv(
      exportFileName,
      analyticsRowsToCsv(filtered, valueColumnLabel, secondaryColumnLabel),
    )
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div className="relative w-full max-w-64">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder={`Search ${title.toLowerCase()}…`}
            className="h-8 pl-8 text-body-sm"
            aria-label={`Search ${title}`}
          />
        </div>
        <div className="flex items-center gap-xs">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-xs text-body-sm"
            onClick={() => setSortDesc((v) => !v)}
          >
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
            {sortDesc ? 'Highest first' : 'Lowest first'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-xs text-body-sm"
            onClick={handleExport}
            disabled={filtered.length === 0}
          >
            <Download className="size-3.5" aria-hidden="true" />
            Export
          </Button>
        </div>
      </div>

      {pageRows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No results"
          description="Try a different search term or clear the current filters."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="p-sm text-label-caps text-muted-foreground uppercase">{title}</th>
                <th className="p-sm text-right text-label-caps text-muted-foreground uppercase">
                  {valueColumnLabel}
                </th>
                {secondaryColumnLabel && (
                  <th className="p-sm text-right text-label-caps text-muted-foreground uppercase">
                    {secondaryColumnLabel}
                  </th>
                )}
                <th className="w-8 p-sm" aria-label="Drill down" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-body-sm">
              {pageRows.map((row) => {
                const identity = entityKind === 'merchant' ? getMerchantIdentity(row.label) : null
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      'group/row cursor-pointer transition-opacity duration-200 hover:bg-surface-hover',
                      row.drillFilter &&
                        !isHighlighted(hoveredDimension, row.drillFilter) &&
                        'opacity-40',
                    )}
                    onMouseEnter={() => row.drillFilter && onHover(row.drillFilter)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => handleRowClick(row)}
                  >
                    <td className="p-sm">
                      <div className="flex min-w-0 items-center gap-xs">
                        {identity && (
                          <div
                            aria-hidden="true"
                            className={cn(
                              'flex size-6 shrink-0 items-center justify-center rounded text-[10px] font-semibold',
                              identity.chipClassName,
                            )}
                          >
                            {identity.initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{row.label}</div>
                          {row.sublabel && (
                            <div className="truncate text-body-sm text-muted-foreground">
                              {row.sublabel}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-sm text-right tabular-nums font-semibold text-foreground">
                      {row.valueLabel}
                    </td>
                    {secondaryColumnLabel && (
                      <td className="p-sm text-right tabular-nums text-muted-foreground">
                        {row.secondaryLabel ?? '—'}
                      </td>
                    )}
                    <td className="p-sm text-right">
                      <button
                        type="button"
                        aria-label={`View transactions for ${row.label}`}
                        className="rounded p-1 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover/row:opacity-100 group-focus-within/row:opacity-100 hover:bg-accent hover:text-primary"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowDrillDown(row)
                        }}
                      >
                        <ArrowUpRight className="size-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length > pageSize && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={filtered.length}
          pageSizeOptions={[5, 10, 25]}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}
    </div>
  )
}
