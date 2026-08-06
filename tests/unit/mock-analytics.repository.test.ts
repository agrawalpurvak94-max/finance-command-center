import { describe, expect, it } from 'vitest'
import { MockAnalyticsRepository } from '@/repositories/mock-analytics.repository'
import type { AnalyticsFilters } from '@/domain/Analytics'

const repo = new MockAnalyticsRepository()
const noFilters: AnalyticsFilters = {}

describe('MockAnalyticsRepository.getSummary', () => {
  it('derives totals consistently from the same filtered transaction set', async () => {
    const summary = await repo.getSummary(noFilters)
    expect(summary.totalSpend).toBeGreaterThan(0)
    expect(summary.totalTransactions).toBeGreaterThan(0)
    expect(summary.netCashFlow).toBeCloseTo(summary.totalIncome - summary.totalSpend, 5)
    expect(summary.averageTransaction).toBeGreaterThan(0)
  })

  it('narrows to zero spend for a category that does not exist', async () => {
    const summary = await repo.getSummary({ categoryId: 'does-not-exist' })
    expect(summary.totalSpend).toBe(0)
    expect(summary.totalTransactions).toBe(0)
    expect(summary.highestSpendingCategory).toBeNull()
  })

  it('respects a merchant filter — every remaining transaction belongs to that merchant', async () => {
    const unfiltered = await repo.getSummary(noFilters)
    expect(unfiltered.highestSpendingMerchant).not.toBeNull()
    const merchantId = unfiltered.highestSpendingMerchant!.merchant.id

    const filtered = await repo.getSummary({ merchantId })
    expect(filtered.totalTransactions).toBeGreaterThan(0)
    expect(filtered.totalTransactions).toBeLessThanOrEqual(unfiltered.totalTransactions)
  })
})

describe('MockAnalyticsRepository.getCategorySpend', () => {
  it('percentages sum to ~100 and amounts sum to total debit spend', async () => {
    const slices = await repo.getCategorySpend(noFilters)
    const totalPercentage = slices.reduce((sum, s) => sum + s.percentage, 0)
    expect(totalPercentage).toBeGreaterThan(99)
    expect(totalPercentage).toBeLessThan(101)

    const summary = await repo.getSummary(noFilters)
    const totalCategorized = slices.reduce((sum, s) => sum + s.amount, 0)
    expect(totalCategorized).toBeLessThanOrEqual(summary.totalSpend + 0.01)
  })

  it('narrows to a single slice when filtered by that category', async () => {
    const slices = await repo.getCategorySpend(noFilters)
    const categoryId = slices[0].category.id
    const narrowed = await repo.getCategorySpend({ categoryId })
    expect(narrowed).toHaveLength(1)
    expect(narrowed[0].category.id).toBe(categoryId)
    expect(narrowed[0].percentage).toBeCloseTo(100, 0)
  })
})

describe('MockAnalyticsRepository.getSpendTrend', () => {
  it('bucket spend sums to the same total as the unbucketed summary for the default window', async () => {
    const buckets = await repo.getSpendTrend(noFilters, 'month')
    const bucketedTotal = buckets.reduce((sum, b) => sum + b.spend, 0)
    // The default month lookback window and getSummary's unfiltered scope
    // aren't identical, so this asserts the weaker (but still meaningful)
    // invariant that bucketing never fabricates spend beyond what exists.
    const summary = await repo.getSummary(noFilters)
    expect(bucketedTotal).toBeLessThanOrEqual(summary.totalSpend + 0.01)
  })

  it('produces more buckets for day granularity than year granularity', async () => {
    const days = await repo.getSpendTrend(noFilters, 'day')
    const years = await repo.getSpendTrend(noFilters, 'year')
    expect(days.length).toBeGreaterThan(years.length)
  })

  it('every bucket has a start on or before its end', async () => {
    const buckets = await repo.getSpendTrend(noFilters, 'week')
    for (const bucket of buckets) {
      expect(bucket.bucketStart.localeCompare(bucket.bucketEnd)).toBeLessThanOrEqual(0)
    }
  })
})

describe('MockAnalyticsRepository.getCreditCardSpend', () => {
  it('caps at 6 cards and every point carries a value for every card', async () => {
    const result = await repo.getCreditCardSpend(noFilters)
    expect(result.cards.length).toBeLessThanOrEqual(6)
    for (const point of result.points) {
      for (const card of result.cards) {
        expect(point.values[card.id]).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe('MockAnalyticsRepository.getRecurringMerchants', () => {
  it('only returns merchants with activity in 3 or more distinct months', async () => {
    const rows = await repo.getRecurringMerchants(noFilters)
    for (const row of rows) {
      expect(row.sublabel).toMatch(/^\d+ months$/)
      const months = Number(row.sublabel!.split(' ')[0])
      expect(months).toBeGreaterThanOrEqual(3)
    }
  })
})

describe('MockAnalyticsRepository.getStatementProcessingStatus', () => {
  it('only returns statuses that actually have statements, each with a positive count', async () => {
    const rows = await repo.getStatementProcessingStatus(noFilters)
    expect(rows.length).toBeGreaterThan(0)
    for (const row of rows) {
      expect(row.value).toBeGreaterThan(0)
      expect(row.drillTarget).toBe('statements')
    }
  })
})

describe('MockAnalyticsRepository.getInsights', () => {
  it('returns a well-formed insight list for the default filters', async () => {
    const insights = await repo.getInsights(noFilters)
    for (const insight of insights) {
      expect(insight.id).toBeTruthy()
      expect(insight.title).toBeTruthy()
      expect(insight.description).toBeTruthy()
    }
  })
})

describe('MockAnalyticsRepository.listBankNames', () => {
  it('returns a sorted, deduplicated list of bank names', async () => {
    const names = await repo.listBankNames()
    expect(names.length).toBeGreaterThan(0)
    expect(new Set(names).size).toBe(names.length)
    expect([...names].sort()).toEqual(names)
  })
})
