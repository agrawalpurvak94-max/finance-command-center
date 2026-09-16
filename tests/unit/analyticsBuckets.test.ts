import { describe, expect, it } from 'vitest'
import {
  isCustomRangeActive,
  comparisonWindowStart,
  computePeriodSpend,
} from '@/lib/analyticsBuckets'

describe('isCustomRangeActive', () => {
  it('is false with no dateFrom/dateTo', () => {
    expect(isCustomRangeActive({})).toBe(false)
  })

  it('is true with only dateFrom', () => {
    expect(isCustomRangeActive({ dateFrom: '2026-08-01' })).toBe(true)
  })

  it('is true with only dateTo', () => {
    expect(isCustomRangeActive({ dateTo: '2026-08-31' })).toBe(true)
  })

  it('is true with both', () => {
    expect(isCustomRangeActive({ dateFrom: '2026-08-01', dateTo: '2026-08-31' })).toBe(true)
  })
})

describe('comparisonWindowStart', () => {
  it('returns the day immediately before an equal-length period before dateFrom (12-day range)', () => {
    // Selected range: 2026-08-01 .. 2026-08-12 (12 days) -> comparison
    // period is the 12 days immediately before: 2026-07-20 .. 2026-07-31.
    const start = comparisonWindowStart({ dateFrom: '2026-08-01', dateTo: '2026-08-12' })
    expect(start).toBe('2026-07-20')
  })

  it('handles a same-day range (length 1)', () => {
    const start = comparisonWindowStart({ dateFrom: '2026-08-15', dateTo: '2026-08-15' })
    expect(start).toBe('2026-08-14')
  })
})

describe('computePeriodSpend — no active range (default calendar-month behavior)', () => {
  it('keeps the "Monthly Spend" label and sums only the real current calendar month', () => {
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    const debits = [
      { date: `${thisMonth}-05`, amount: 100 },
      { date: `${thisMonth}-10`, amount: 50 },
      { date: '2000-01-01', amount: 999 }, // far outside any real "last month"
    ]
    const result = computePeriodSpend({}, debits)
    expect(result.label).toBe('Monthly Spend')
    expect(result.value).toBe(150)
  })
})

describe('computePeriodSpend — active custom range (Period Spend)', () => {
  it('relabels to "Period Spend" and sums exactly the selected range, inclusive of both ends', () => {
    const filters = { dateFrom: '2026-08-01', dateTo: '2026-08-12' }
    const debits = [
      { date: '2026-08-01', amount: 10 }, // start boundary — included
      { date: '2026-08-12', amount: 20 }, // end boundary — included
      { date: '2026-08-13', amount: 999 }, // day after end — excluded
      { date: '2026-07-31', amount: 999 }, // day before start — excluded
    ]
    const result = computePeriodSpend(filters, debits)
    expect(result.label).toBe('Period Spend')
    expect(result.value).toBe(30)
  })

  it('compares against the immediately preceding period of equal length, not the real previous calendar month', () => {
    const filters = { dateFrom: '2026-08-01', dateTo: '2026-08-12' }
    const debits = [
      { date: '2026-08-05', amount: 100 }, // current period
      { date: '2026-07-25', amount: 40 }, // comparison period (2026-07-20..2026-07-31)
      { date: '2026-07-01', amount: 999 }, // before the comparison window — excluded
    ]
    const result = computePeriodSpend(filters, debits)
    expect(result.value).toBe(100)
    expect(result.trend).not.toBeNull()
    // (100 - 40) / 40 * 100 = 150% increase
    expect(result.trend?.direction).toBe('up')
    expect(result.trend?.label).toContain('150.0%')
  })

  it('produces no trend when the comparison period has zero spend', () => {
    const filters = { dateFrom: '2026-08-01', dateTo: '2026-08-12' }
    const debits = [{ date: '2026-08-05', amount: 100 }]
    const result = computePeriodSpend(filters, debits)
    expect(result.trend).toBeNull()
  })
})
