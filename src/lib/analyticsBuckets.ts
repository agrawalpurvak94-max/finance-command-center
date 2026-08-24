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
