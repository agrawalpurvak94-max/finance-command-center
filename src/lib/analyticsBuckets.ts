import type { AnalyticsBucket, AnalyticsGranularity } from '@/domain/Analytics'
import type { Trend } from '@/domain/Dashboard'

/**
 * Pure date-bucketing utilities, extracted from
 * `supabase-analytics.repository.ts` (Module 10, real-time Analytics) so
 * Statement Analytics (`statement-analytics.service.ts`) can reuse the exact
 * same bucketing algorithm without duplicating it — per CLAUDE.md's "never
 * duplicate business logic." Behavior-preserving extraction only; no logic
 * changed. Both callers pass their own filter shape (`dateFrom`/`dateTo`),
 * so this module has no dependency on which transaction dataset is behind it.
 */

export function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0)
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

export function iso(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}
function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const day = d.getDay()
  d.setDate(d.getDate() + ((day === 0 ? -6 : 1) - day))
  return d
}
function startOfMonth(date: Date): Date {
  const d = startOfDay(date)
  d.setDate(1)
  return d
}
function startOfQuarter(date: Date): Date {
  const d = startOfMonth(date)
  d.setMonth(Math.floor(d.getMonth() / 3) * 3)
  return d
}
function startOfYear(date: Date): Date {
  const d = startOfDay(date)
  d.setMonth(0, 1)
  return d
}
function bucketStartFor(date: Date, granularity: AnalyticsGranularity): Date {
  switch (granularity) {
    case 'day':
      return startOfDay(date)
    case 'week':
      return startOfWeek(date)
    case 'month':
      return startOfMonth(date)
    case 'quarter':
      return startOfQuarter(date)
    case 'year':
      return startOfYear(date)
  }
}
function addOneBucket(date: Date, granularity: AnalyticsGranularity): Date {
  const next = new Date(date)
  switch (granularity) {
    case 'day':
      next.setDate(next.getDate() + 1)
      break
    case 'week':
      next.setDate(next.getDate() + 7)
      break
    case 'month':
      next.setMonth(next.getMonth() + 1)
      break
    case 'quarter':
      next.setMonth(next.getMonth() + 3)
      break
    case 'year':
      next.setFullYear(next.getFullYear() + 1)
      break
  }
  return next
}
function applyLookback(date: Date, granularity: AnalyticsGranularity): void {
  switch (granularity) {
    case 'day':
      date.setDate(date.getDate() - 29)
      break
    case 'week':
      date.setDate(date.getDate() - 7 * 11)
      break
    case 'month':
      date.setMonth(date.getMonth() - 5)
      break
    case 'quarter':
      date.setMonth(date.getMonth() - 9)
      break
    case 'year':
      date.setFullYear(date.getFullYear() - 2)
      break
  }
}
function labelFor(start: Date, granularity: AnalyticsGranularity): string {
  switch (granularity) {
    case 'day':
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}`
    case 'week': {
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()}–${end.getDate()}`
    }
    case 'month':
      return `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`
    case 'quarter':
      return `Q${Math.floor(start.getMonth() / 3) + 1} ${start.getFullYear()}`
    case 'year':
      return `${start.getFullYear()}`
  }
}

export function buildBuckets(
  filters: { readonly dateFrom?: string; readonly dateTo?: string },
  granularity: AnalyticsGranularity,
): AnalyticsBucket[] {
  const end = filters.dateTo ? new Date(filters.dateTo) : new Date()
  const start = filters.dateFrom ? new Date(filters.dateFrom) : new Date(end)
  if (!filters.dateFrom) applyLookback(start, granularity)

  const buckets: AnalyticsBucket[] = []
  let cursor = bucketStartFor(start, granularity)
  const lastBucketStart = bucketStartFor(end, granularity)

  while (cursor.getTime() <= lastBucketStart.getTime() && buckets.length < 400) {
    const nextStart = addOneBucket(cursor, granularity)
    const bucketEnd = new Date(nextStart.getTime() - 86400000)
    buckets.push({
      bucketLabel: labelFor(cursor, granularity),
      bucketStart: iso(cursor),
      bucketEnd: iso(bucketEnd),
    })
    cursor = nextStart
  }
  return buckets
}

export function bucketIndexForDate(dateIso: string, buckets: readonly AnalyticsBucket[]): number {
  if (buckets.length === 0) return -1
  if (dateIso < buckets[0].bucketStart || dateIso > buckets[buckets.length - 1].bucketEnd) return -1
  for (let i = buckets.length - 1; i >= 0; i--) if (dateIso >= buckets[i].bucketStart) return i
  return -1
}

export function computeTrend(current: number, previous: number, goodWhenUp: boolean): Trend | null {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const direction: Trend['direction'] = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat'
  const tone: Trend['tone'] =
    direction === 'flat' ? 'neutral' : (direction === 'up') === goodWhenUp ? 'positive' : 'negative'
  const sign = pct > 0 ? '+' : ''
  return { direction, tone, label: `${sign}${pct.toFixed(1)}% MoM` }
}

/**
 * "Monthly Spend"/"Period Spend" KPI — shared by both real-time Analytics
 * (`supabase-analytics.repository.ts`) and Statement Analytics
 * (`statement-analytics.service.ts`), per explicit instruction not to
 * maintain two competing implementations of this comparison.
 *
 * A custom Date Range filter is the source of truth once set: the KPI value
 * becomes the selected range's own total spend (same number `totalSpend`
 * already shows), its trend compares against the immediately preceding
 * period of equal length, and the label switches to "Period Spend" so it's
 * never confused with a literal calendar month. With no range filter, the
 * KPI keeps its original meaning: this-real-calendar-month vs
 * previous-real-calendar-month.
 */
export function isCustomRangeActive(filters: {
  readonly dateFrom?: string
  readonly dateTo?: string
}): boolean {
  return Boolean(filters.dateFrom || filters.dateTo)
}

// Every helper below parses/shifts dates via explicit UTC (`T00:00:00Z`) and
// reads them back with `toISOString()` (also UTC) — never through
// `startOfDay`-style local-time setters (`buildBuckets`'s own helpers use
// `setHours`, which reads the *viewer's local* calendar day back from a
// UTC-parsed instant and can silently land on the wrong date depending on
// the viewer's timezone offset). Period Spend intentionally does its own
// range-boundary math instead of reusing `buildBuckets` so it can't inherit
// that shift.
function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(`${startIso}T00:00:00Z`)
  const end = new Date(`${endIso}T00:00:00Z`)
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1
}

function shiftIso(dateIso: string, days: number): string {
  const d = new Date(`${dateIso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return iso(d)
}

/** The selected range's own [start, end], resolved the same way regardless of which bound(s) the user actually set — dateTo defaults to today, dateFrom defaults to 29 days before that (matching `buildBuckets`'s day-granularity lookback), both computed via the UTC-safe helpers above. */
function effectiveRange(filters: { readonly dateFrom?: string; readonly dateTo?: string }): {
  readonly start: string
  readonly end: string
} {
  const end = filters.dateTo ?? iso(new Date())
  const start = filters.dateFrom ?? shiftIso(end, -29)
  return { start, end }
}

/**
 * The start date callers must widen their fetch/filter back to (keeping the
 * range's own end date) so `computePeriodSpend` has both the selected
 * period and its immediately-preceding comparison period available to sum
 * locally. Only meaningful when `isCustomRangeActive(filters)` is true.
 */
export function comparisonWindowStart(filters: {
  readonly dateFrom?: string
  readonly dateTo?: string
}): string {
  const { start, end } = effectiveRange(filters)
  const lengthDays = daysBetween(start, end)
  return shiftIso(start, -lengthDays)
}

export interface PeriodSpendResult {
  readonly label: 'Monthly Spend' | 'Period Spend'
  readonly value: number
  readonly trend: Trend | null
}

/**
 * `widenedDebits` must cover, at minimum:
 * - when no custom range is active: every debit (no date restriction) —
 *   this is what callers already fetch for the rest of the KPI set.
 * - when a custom range IS active: every debit from
 *   `comparisonWindowStart(filters)` through the range's own end date
 *   (inclusive) — i.e. both the selected period and its comparison period.
 */
export function computePeriodSpend(
  filters: { readonly dateFrom?: string; readonly dateTo?: string },
  widenedDebits: readonly { readonly date: string; readonly amount: number }[],
): PeriodSpendResult {
  if (!isCustomRangeActive(filters)) {
    const now = new Date()
    const monthPrefix = iso(now).slice(0, 7)
    const prevMonthDate = new Date(now)
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
    const prevMonthPrefix = iso(prevMonthDate).slice(0, 7)

    const value = sum(
      widenedDebits.filter((d) => d.date.startsWith(monthPrefix)),
      (d) => d.amount,
    )
    const previous = sum(
      widenedDebits.filter((d) => d.date.startsWith(prevMonthPrefix)),
      (d) => d.amount,
    )
    return { label: 'Monthly Spend', value, trend: computeTrend(value, previous, false) }
  }

  const { start: rangeStart, end: rangeEnd } = effectiveRange(filters)
  const lengthDays = daysBetween(rangeStart, rangeEnd)
  const prevEnd = shiftIso(rangeStart, -1)
  const prevStart = shiftIso(rangeStart, -lengthDays)

  const value = sum(
    widenedDebits.filter((d) => d.date >= rangeStart && d.date <= rangeEnd),
    (d) => d.amount,
  )
  const previous = sum(
    widenedDebits.filter((d) => d.date >= prevStart && d.date <= prevEnd),
    (d) => d.amount,
  )
  return { label: 'Period Spend', value, trend: computeTrend(value, previous, false) }
}
