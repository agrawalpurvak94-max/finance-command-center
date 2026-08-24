import type { SupabaseClient } from '@supabase/supabase-js'
import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type { Transaction, TransactionFilters } from '@/domain/Transaction'
import type {
  AnalyticsAccountActivityResult,
  AnalyticsCardSeriesResult,
  AnalyticsCategorySlice,
  AnalyticsFilters,
  AnalyticsGranularity,
  AnalyticsInsight,
  AnalyticsOwnerTypePoint,
  AnalyticsRankedRow,
  AnalyticsSummary,
  AnalyticsTrendPoint,
} from '@/domain/Analytics'
import type { AnalyticsRepository } from '@/repositories/analytics.repository'
import { SupabaseTransactionRepository } from '@/repositories/supabase-transaction.repository'
import { formatINR } from '@/utils/currency'
import { sum, iso, buildBuckets, bucketIndexForDate, computeTrend } from '@/lib/analyticsBuckets'

/**
 * Composes `SupabaseTransactionRepository` rather than re-querying/re-mapping
 * transactions itself — every mapping decision (account fallback, ownerType,
 * status, etc.) lives in exactly one place. Fetches the full filtered
 * transaction set (a single page large enough to cover all live rows — 14
 * today; see MODULE12A_SUPABASE_INTEGRATION_REPORT.md for the note on
 * revisiting this once real transaction volume grows) and reuses the same
 * bucketing/aggregation algorithms `MockAnalyticsRepository` used, now
 * running over real data instead of generated data — this guarantees
 * identical chart/KPI behavior for the existing Playwright suite, per
 * CLAUDE.md's Module 12A acceptance criterion that it must pass unmodified.
 *
 * `AnalyticsFilters` is `TransactionFilters` plus `bankName` (no DB
 * counterpart on `transactions` directly) — `bankName` is applied as an
 * extra client-side filter on the already-mapped `Transaction.account
 * .bankName` after fetching.
 */

const PAGE_SIZE = 10_000

function matchesBankName(txn: Transaction, filters: AnalyticsFilters): boolean {
  return !filters.bankName || txn.account.bankName === filters.bankName
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  private readonly client: SupabaseClient
  private readonly transactions: SupabaseTransactionRepository

  constructor(client: SupabaseClient) {
    this.client = client
    this.transactions = new SupabaseTransactionRepository(client)
  }

  private async fetchTransactions(filters: AnalyticsFilters): Promise<Transaction[]> {
    const { bankName: _bankName, ...txnFilters } = filters
    void _bankName
    const { rows } = await this.transactions.list({
      page: 1,
      pageSize: PAGE_SIZE,
      filters: txnFilters as TransactionFilters,
    })
    return rows.filter((t) => matchesBankName(t, filters))
  }

  async getSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
    const txns = await this.fetchTransactions(filters)
    const debits = txns.filter((t) => t.type === 'debit')
    const credits = txns.filter((t) => t.type === 'credit')

    const totalSpend = sum(debits, (t) => t.amount)
    const totalIncome = sum(credits, (t) => t.amount)
    const totalTransactions = txns.length
    const averageTransaction = totalTransactions
      ? sum(txns, (t) => t.amount) / totalTransactions
      : 0

    const now = new Date()
    const monthPrefix = iso(now).slice(0, 7)
    const prevMonthDate = new Date(now)
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
    const prevMonthPrefix = iso(prevMonthDate).slice(0, 7)

    const monthlySpend = sum(
      debits.filter((t) => t.date.startsWith(monthPrefix)),
      (t) => t.amount,
    )
    const prevMonthSpend = sum(
      debits.filter((t) => t.date.startsWith(prevMonthPrefix)),
      (t) => t.amount,
    )

    const categoryTotals = new Map<string, { category: Category; amount: number }>()
    for (const t of debits) {
      if (!t.category) continue
      const entry = categoryTotals.get(t.category.id) ?? { category: t.category, amount: 0 }
      entry.amount += t.amount
      categoryTotals.set(t.category.id, entry)
    }
    const highestSpendingCategory =
      [...categoryTotals.values()].sort((a, b) => b.amount - a.amount)[0] ?? null

    const merchantTotals = new Map<string, { merchant: Merchant; amount: number }>()
    for (const t of debits) {
      const entry = merchantTotals.get(t.merchant.id) ?? { merchant: t.merchant, amount: 0 }
      entry.amount += t.amount
      merchantTotals.set(t.merchant.id, entry)
    }
    const highestSpendingMerchant =
      [...merchantTotals.values()].sort((a, b) => b.amount - a.amount)[0] ?? null

    const cardCounts = new Map<string, { account: TransactionAccount; count: number }>()
    const bankCounts = new Map<string, { account: TransactionAccount; count: number }>()
    for (const t of txns) {
      const target = t.account.kind === 'credit_card' ? cardCounts : bankCounts
      const entry = target.get(t.account.id) ?? { account: t.account, count: 0 }
      entry.count += 1
      target.set(t.account.id, entry)
    }
    const mostUsedCard = [...cardCounts.values()].sort((a, b) => b.count - a.count)[0] ?? null
    const mostUsedAccount = [...bankCounts.values()].sort((a, b) => b.count - a.count)[0] ?? null

    return {
      totalSpend,
      totalTransactions,
      averageTransaction,
      monthlySpend,
      monthlySpendTrend: computeTrend(monthlySpend, prevMonthSpend, false),
      totalIncome,
      netCashFlow: totalIncome - totalSpend,
      highestSpendingCategory,
      highestSpendingMerchant,
      mostUsedCard,
      mostUsedAccount,
    }
  }

  async getSpendTrend(
    filters: AnalyticsFilters,
    granularity: AnalyticsGranularity,
  ): Promise<readonly AnalyticsTrendPoint[]> {
    const buckets = buildBuckets(filters, granularity)
    const spend = buckets.map(() => 0)
    const debits = (await this.fetchTransactions(filters)).filter((t) => t.type === 'debit')
    for (const t of debits) {
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx !== -1) spend[idx] += t.amount
    }
    return buckets.map((b, i) => ({ ...b, spend: spend[i] }))
  }

  async getOwnerTypeSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsOwnerTypePoint[]> {
    const buckets = buildBuckets(filters, 'month')
    const business = buckets.map(() => 0)
    const personal = buckets.map(() => 0)
    const debits = (await this.fetchTransactions(filters)).filter((t) => t.type === 'debit')
    for (const t of debits) {
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx === -1) continue
      if (t.ownerType === 'business') business[idx] += t.amount
      else personal[idx] += t.amount
    }
    return buckets.map((b, i) => ({ ...b, business: business[i], personal: personal[i] }))
  }

  async getCategorySpend(filters: AnalyticsFilters): Promise<readonly AnalyticsCategorySlice[]> {
    const debits = (await this.fetchTransactions(filters)).filter(
      (t) => t.type === 'debit' && t.category,
    )
    const totals = new Map<string, { category: Category; amount: number }>()
    for (const t of debits) {
      const category = t.category!
      const entry = totals.get(category.id) ?? { category, amount: 0 }
      entry.amount += t.amount
      totals.set(category.id, entry)
    }
    const total = sum([...totals.values()], (e) => e.amount)
    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .map((e) => ({
        category: e.category,
        amount: e.amount,
        percentage: total ? (e.amount / total) * 100 : 0,
      }))
  }

  async getMerchantSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = (await this.fetchTransactions(filters)).filter((t) => t.type === 'debit')
    const totals = new Map<string, { merchant: Merchant; amount: number; count: number }>()
    for (const t of debits) {
      const entry = totals.get(t.merchant.id) ?? { merchant: t.merchant, amount: 0, count: 0 }
      entry.amount += t.amount
      entry.count += 1
      totals.set(t.merchant.id, entry)
    }
    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((e) => ({
        id: e.merchant.id,
        label: e.merchant.name,
        value: e.amount,
        valueLabel: formatINR(e.amount),
        secondaryValue: e.count,
        secondaryLabel: `${e.count} txns`,
        drillFilter: { merchantId: e.merchant.id },
      }))
  }

  async getClientSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = (await this.fetchTransactions(filters)).filter(
      (t) => t.type === 'debit' && t.client,
    )
    const totals = new Map<string, { name: string; amount: number; count: number }>()
    for (const t of debits) {
      const client = t.client!
      const entry = totals.get(client.id) ?? { name: client.name, amount: 0, count: 0 }
      entry.amount += t.amount
      entry.count += 1
      totals.set(client.id, entry)
    }
    return [...totals.entries()]
      .sort((a, b) => b[1].amount - a[1].amount)
      .slice(0, 10)
      .map(([id, e]) => ({
        id,
        label: e.name,
        value: e.amount,
        valueLabel: formatINR(e.amount),
        secondaryValue: e.count,
        secondaryLabel: `${e.count} txns`,
        drillFilter: { clientId: id },
      }))
  }

  async getCreditCardSpend(filters: AnalyticsFilters): Promise<AnalyticsCardSeriesResult> {
    const debits = (await this.fetchTransactions(filters)).filter(
      (t) => t.type === 'debit' && t.account.kind === 'credit_card',
    )
    const totalsByCard = new Map<string, number>()
    for (const t of debits)
      totalsByCard.set(t.account.id, (totalsByCard.get(t.account.id) ?? 0) + t.amount)
    const topCardIds = [...totalsByCard.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id)

    const { data: cardRows } = await this.client
      .from('vw_accounts')
      .select('id,institution_name,resolved_last4')
      .in('id', topCardIds.length > 0 ? topCardIds : ['00000000-0000-0000-0000-000000000000'])
    const cardLabelById = new Map(
      (cardRows ?? []).map((r) => [
        (r as { id: string }).id,
        `${(r as { institution_name: string }).institution_name} •••• ${(r as { resolved_last4: string | null }).resolved_last4 ?? '0000'}`,
      ]),
    )

    const buckets = buildBuckets(filters, 'month')
    const points = buckets.map((b) => ({
      ...b,
      values: Object.fromEntries(topCardIds.map((id) => [id, 0])) as Record<string, number>,
    }))
    for (const t of debits) {
      if (!topCardIds.includes(t.account.id)) continue
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx !== -1) points[idx].values[t.account.id] += t.amount
    }

    return { points, cards: topCardIds.map((id) => ({ id, label: cardLabelById.get(id) ?? id })) }
  }

  async getBankAccountActivity(filters: AnalyticsFilters): Promise<AnalyticsAccountActivityResult> {
    const txns = (await this.fetchTransactions(filters)).filter((t) => t.account.kind === 'bank')
    const buckets = buildBuckets(filters, 'month')
    const credits = buckets.map(() => 0)
    const debits = buckets.map(() => 0)
    const byAccountTotals = new Map<
      string,
      { account: TransactionAccount; credits: number; debits: number }
    >()

    for (const t of txns) {
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx !== -1) {
        if (t.type === 'credit') credits[idx] += t.amount
        else debits[idx] += t.amount
      }
      const entry = byAccountTotals.get(t.account.id) ?? {
        account: t.account,
        credits: 0,
        debits: 0,
      }
      if (t.type === 'credit') entry.credits += t.amount
      else entry.debits += t.amount
      byAccountTotals.set(t.account.id, entry)
    }

    const points = buckets.map((b, i) => ({
      ...b,
      credits: credits[i],
      debits: debits[i],
      net: credits[i] - debits[i],
    }))
    const byAccount = [...byAccountTotals.values()]
      .sort((a, b) => b.credits + b.debits - (a.credits + a.debits))
      .map((e) => ({
        id: e.account.id,
        label: `${e.account.bankName} •••• ${e.account.last4}`,
        value: e.debits,
        valueLabel: formatINR(e.debits),
        secondaryValue: e.credits,
        secondaryLabel: `${formatINR(e.credits)} credits`,
        drillFilter: { bankAccountId: e.account.id },
      }))

    return { points, byAccount }
  }

  async getHighestTransactions(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const txns = await this.fetchTransactions(filters)
    return [...txns]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        label: t.merchant.name,
        sublabel: t.date,
        value: t.amount,
        valueLabel: formatINR(t.amount),
        secondaryLabel: t.category?.name ?? 'Uncategorized',
        drillFilter: { merchantId: t.merchant.id, dateFrom: t.date, dateTo: t.date },
      }))
  }

  async getRecurringMerchants(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = (await this.fetchTransactions(filters)).filter((t) => t.type === 'debit')
    const totals = new Map<
      string,
      { merchant: Merchant; months: Set<string>; amount: number; count: number }
    >()
    for (const t of debits) {
      const entry = totals.get(t.merchant.id) ?? {
        merchant: t.merchant,
        months: new Set<string>(),
        amount: 0,
        count: 0,
      }
      entry.months.add(t.date.slice(0, 7))
      entry.amount += t.amount
      entry.count += 1
      totals.set(t.merchant.id, entry)
    }
    return [...totals.values()]
      .filter((e) => e.months.size >= 3)
      .sort((a, b) => b.months.size - a.months.size || b.amount - a.amount)
      .slice(0, 10)
      .map((e) => ({
        id: e.merchant.id,
        label: e.merchant.name,
        sublabel: `${e.months.size} months`,
        value: e.amount,
        valueLabel: formatINR(e.amount),
        secondaryValue: e.count,
        secondaryLabel: `${e.count} txns`,
        drillFilter: { merchantId: e.merchant.id },
      }))
  }

  async getLargestExpenses(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = (await this.fetchTransactions(filters)).filter((t) => t.type === 'debit')
    return [...debits]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        label: t.merchant.name,
        sublabel: t.date,
        value: t.amount,
        valueLabel: formatINR(t.amount),
        secondaryLabel: t.category?.name ?? 'Uncategorized',
        drillFilter: { merchantId: t.merchant.id, dateFrom: t.date, dateTo: t.date },
      }))
  }

  async getRefundAnalysis(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const matched = await this.fetchTransactions(filters)
    const merchantsWithDebits = new Set(
      matched.filter((t) => t.type === 'debit').map((t) => t.merchant.id),
    )
    const refunds = matched.filter(
      (t) => t.type === 'credit' && merchantsWithDebits.has(t.merchant.id),
    )

    const totals = new Map<string, { merchant: Merchant; amount: number; count: number }>()
    for (const t of refunds) {
      const entry = totals.get(t.merchant.id) ?? { merchant: t.merchant, amount: 0, count: 0 }
      entry.amount += t.amount
      entry.count += 1
      totals.set(t.merchant.id, entry)
    }
    return [...totals.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((e) => ({
        id: e.merchant.id,
        label: e.merchant.name,
        value: e.amount,
        valueLabel: formatINR(e.amount),
        secondaryValue: e.count,
        secondaryLabel: `${e.count} refund${e.count === 1 ? '' : 's'}`,
        drillFilter: { merchantId: e.merchant.id, type: 'credit' as const },
      }))
  }

  async getInsights(filters: AnalyticsFilters): Promise<readonly AnalyticsInsight[]> {
    const insights: AnalyticsInsight[] = []
    const summary = await this.getSummary(filters)

    if (summary.monthlySpendTrend && summary.monthlySpendTrend.direction !== 'flat') {
      insights.push({
        id: 'insight-monthly-spend-trend',
        severity: summary.monthlySpendTrend.tone === 'negative' ? 'warning' : 'good',
        title: `Monthly spend ${summary.monthlySpendTrend.direction === 'up' ? 'increased' : 'decreased'} ${summary.monthlySpendTrend.label.replace(' MoM', '')}`,
        description: `Compared to last month, this month's spend is ${formatINR(summary.monthlySpend)}.`,
      })
    }

    if (summary.highestSpendingMerchant && summary.totalSpend > 0) {
      const share = (summary.highestSpendingMerchant.amount / summary.totalSpend) * 100
      if (share >= 15) {
        insights.push({
          id: 'insight-top-merchant-share',
          severity: share >= 30 ? 'serious' : 'info',
          title: `${summary.highestSpendingMerchant.merchant.name} represents ${share.toFixed(0)}% of total spending`,
          description: `${formatINR(summary.highestSpendingMerchant.amount)} spent at ${summary.highestSpendingMerchant.merchant.name} in the selected range.`,
          actionFilter: { merchantId: summary.highestSpendingMerchant.merchant.id },
        })
      }
    }

    const cardSpend = await this.getCreditCardSpend(filters)
    for (const card of cardSpend.cards) {
      const totalForCard = sum(cardSpend.points, (p) => p.values[card.id] ?? 0)
      if (totalForCard > 150000) {
        insights.push({
          id: `insight-card-spend-${card.id}`,
          severity: 'warning',
          title: `${card.label} spend is high across the selected range`,
          description: `${formatINR(totalForCard)} charged — consider reviewing recent transactions.`,
          actionFilter: { creditCardId: card.id },
        })
      }
    }

    const highest = await this.getHighestTransactions(filters)
    if (highest.length > 0) {
      insights.push({
        id: 'insight-largest-transaction',
        severity: 'info',
        title: `Largest transaction was ${highest[0].valueLabel}`,
        description: `${highest[0].label} on ${highest[0].sublabel}.`,
        actionFilter: highest[0].drillFilter,
      })
    }

    return insights
  }

  async listBankNames(): Promise<readonly string[]> {
    const { data, error } = await this.client.from('accounts').select('institution_name')
    if (error) throw new Error(`Failed to list bank names: ${error.message}`)
    return [
      ...new Set((data ?? []).map((r) => (r as { institution_name: string }).institution_name)),
    ].sort()
  }
}
