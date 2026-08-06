import { formatINR } from '@/utils/currency'
import type {
  AnalyticsCardSeriesResult,
  AnalyticsCategorySlice,
  AnalyticsRankedRow,
} from '@/domain/Analytics'

/** Reshapes an already-computed chart dataset into `AnalyticsRankedRow[]` for
 * tabular/CSV display — used by both `SecondaryAnalyticsTabs` (Top
 * Categories/Top Credit Cards tabs) and the page's Export menu (Category/Card
 * Summary), so the aggregation itself (done once, in the repository) is
 * never recomputed here — only reshaped. */
export function categorySlicesToRows(
  slices: readonly AnalyticsCategorySlice[],
): AnalyticsRankedRow[] {
  return slices.map((s) => ({
    id: s.category.id,
    label: s.category.name,
    value: s.amount,
    valueLabel: formatINR(s.amount),
    secondaryValue: s.percentage,
    secondaryLabel: `${s.percentage.toFixed(1)}% of total`,
    drillFilter: { categoryId: s.category.id },
  }))
}

export function cardSeriesToRows(result: AnalyticsCardSeriesResult): AnalyticsRankedRow[] {
  return result.cards
    .map((card) => {
      const total = result.points.reduce((sum, p) => sum + (p.values[card.id] ?? 0), 0)
      return {
        id: card.id,
        label: card.label,
        value: total,
        valueLabel: formatINR(total),
        drillFilter: { creditCardId: card.id },
      }
    })
    .sort((a, b) => b.value - a.value)
}
