import type { AnalyticsFilters } from '@/domain/Analytics'

/**
 * The three interaction tiers every Analytics widget wires into (see
 * MODULE10_REPORT.md "Interactivity"): hover cross-highlights in place
 * (visual only), click cross-filters (commits, stacks, refetches), and
 * drill-down navigates to Transactions/Statements with the current filters.
 * One shared contract so no widget invents its own click model.
 */
export interface AnalyticsWidgetHandlers {
  readonly hoveredDimension: Partial<AnalyticsFilters> | null
  readonly onHover: (dimension: Partial<AnalyticsFilters> | null) => void
  readonly onCrossFilter: (dimension: Partial<AnalyticsFilters>) => void
  /** `statementStatus` is the one escape hatch: Statement Processing Status
   * rows have no `AnalyticsFilters`-compatible dimension (statement status
   * and transaction status are different enums), so they carry their raw
   * status string here instead of through `filters`. */
  readonly onDrillDown: (
    filters: Partial<AnalyticsFilters>,
    target?: 'transactions' | 'statements',
    statementStatus?: string,
  ) => void
}

/** True when `candidate` should render at full opacity given the current
 * hover — every key set on `hoveredDimension` must match on `candidate`, so
 * a partial hover (e.g. just `categoryId`) still highlights rows that also
 * carry other dimensions. `null` hover means nothing is dimmed. */
export function isHighlighted(
  hoveredDimension: Partial<AnalyticsFilters> | null,
  candidate: Partial<AnalyticsFilters> | undefined,
): boolean {
  if (!hoveredDimension) return true
  if (!candidate) return false
  return (Object.keys(hoveredDimension) as (keyof AnalyticsFilters)[]).every(
    (key) => hoveredDimension[key] === undefined || candidate[key] === hoveredDimension[key],
  )
}
