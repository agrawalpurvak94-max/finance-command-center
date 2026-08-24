import type { AnalyticsFilters } from '@/domain/Analytics'

/**
 * Statement Analytics (Statements module, Tab 3) — the statement-sourced
 * counterpart to Module 10's real-time Analytics (`domain/Analytics.ts`).
 * Deliberately reuses `AnalyticsFilters`/`AnalyticsSummary`/
 * `AnalyticsCategorySlice`/`AnalyticsRankedRow`/`AnalyticsTrendPoint`/
 * `AnalyticsOwnerTypePoint` as its OUTPUT shapes (see
 * statement-analytics.service.ts) so the existing, dataset-agnostic chart
 * components (`CategorySpendChart`, `MerchantSpendChart`, etc.) can render
 * this data unmodified — those components only ever receive whatever data
 * this page passes them; nothing here reads or writes `public.transactions`.
 *
 * The one addition beyond `AnalyticsFilters` is `statementId` — scoping to
 * a specific statement (or leaving it unset for "every statement").
 */
export interface StatementAnalyticsFilters extends AnalyticsFilters {
  readonly statementId?: string
}

/**
 * A merchant/category reference resolved against the real master table.
 * `id` is a genuine `merchants`/`categories` UUID when a confident match was
 * found; `null` when the statement-transaction's free-text name matched
 * nothing — the row is NEVER dropped or given a fabricated id in that case,
 * per explicit instruction. `name` is always the original text either way.
 */
export interface ResolvedRef {
  readonly id: string | null
  readonly name: string
  readonly resolved: boolean
}
