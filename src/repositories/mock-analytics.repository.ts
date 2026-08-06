import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type { Transaction } from '@/domain/Transaction'
import type { Trend } from '@/domain/Dashboard'
import type {
  AnalyticsAccountActivityResult,
  AnalyticsBucket,
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
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'
import { mockAccounts, mockCreditCards } from '@/repositories/mock-data/reference-data'
import { formatINR } from '@/utils/currency'

function withLatency<T>(data: T, ms = 300): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function sum<T>(items: readonly T[], pick: (item: T) => number): number {
  return items.reduce((total, item) => total + pick(item), 0)
}

function matchesAnalyticsFilters(txn: Transaction, filters: AnalyticsFilters): boolean {
  if (filters.dateFrom && txn.date < filters.dateFrom) return false
  if (filters.dateTo && txn.date > filters.dateTo) return false
  if (filters.categoryId && txn.category?.id !== filters.categoryId) return false
  if (filters.clientId && txn.client?.id !== filters.clientId) return false
  if (filters.merchantId && txn.merchant.id !== filters.merchantId) return false
  if (filters.bankAccountId && txn.account.id !== filters.bankAccountId) return false
  if (filters.creditCardId && txn.account.id !== filters.creditCardId) return false
  if (filters.bankName && txn.account.bankName !== filters.bankName) return false
  if (filters.type && txn.type !== filters.type) return false
  if (filters.ownerType && txn.ownerType !== filters.ownerType) return false
  if (filters.paymentMode && txn.paymentMode !== filters.paymentMode) return false
  if (filters.status && txn.status !== filters.status) return false
  if (filters.amountMin !== undefined && txn.amount < filters.amountMin) return false
  if (filters.amountMax !== undefined && txn.amount > filters.amountMax) return false
  return true
}

// --- Bucketing (stands in for a future `date_trunc`-based SQL view) ---------

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

function iso(date: Date): string {
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
  const diff = (day === 0 ? -6 : 1) - day
  d.setDate(d.getDate() + diff)
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

/** Builds the fixed bucket skeleton for a trend chart's x-axis — buckets are
 * generated even where no transaction lands, so the chart's axis is stable
 * rather than shrinking to whatever data happens to exist. */
function buildBuckets(
  filters: AnalyticsFilters,
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

function bucketIndexForDate(dateIso: string, buckets: readonly AnalyticsBucket[]): number {
  if (buckets.length === 0) return -1
  if (dateIso < buckets[0].bucketStart || dateIso > buckets[buckets.length - 1].bucketEnd) return -1
  for (let i = buckets.length - 1; i >= 0; i--) {
    if (dateIso >= buckets[i].bucketStart) return i
  }
  return -1
}

function computeTrend(current: number, previous: number, goodWhenUp: boolean): Trend | null {
  if (previous === 0) return null
  const pct = ((current - previous) / previous) * 100
  const direction: Trend['direction'] = pct > 0.5 ? 'up' : pct < -0.5 ? 'down' : 'flat'
  const tone: Trend['tone'] =
    direction === 'flat' ? 'neutral' : (direction === 'up') === goodWhenUp ? 'positive' : 'negative'
  const sign = pct > 0 ? '+' : ''
  return { direction, tone, label: `${sign}${pct.toFixed(1)}% MoM` }
}

export class MockAnalyticsRepository implements AnalyticsRepository {
  async getSummary(filters: AnalyticsFilters): Promise<AnalyticsSummary> {
    const txns = mockTransactions.filter((t) => matchesAnalyticsFilters(t, filters))
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

    return withLatency({
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
    })
  }

  async getSpendTrend(
    filters: AnalyticsFilters,
    granularity: AnalyticsGranularity,
  ): Promise<readonly AnalyticsTrendPoint[]> {
    const buckets = buildBuckets(filters, granularity)
    const spend = buckets.map(() => 0)
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit',
    )

    for (const t of debits) {
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx === -1) continue
      spend[idx] += t.amount
    }

    return withLatency(buckets.map((b, i) => ({ ...b, spend: spend[i] })))
  }

  async getOwnerTypeSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsOwnerTypePoint[]> {
    const buckets = buildBuckets(filters, 'month')
    const business = buckets.map(() => 0)
    const personal = buckets.map(() => 0)
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit',
    )

    for (const t of debits) {
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx === -1) continue
      if (t.ownerType === 'business') business[idx] += t.amount
      else personal[idx] += t.amount
    }

    return withLatency(
      buckets.map((b, i) => ({ ...b, business: business[i], personal: personal[i] })),
    )
  }

  async getCategorySpend(filters: AnalyticsFilters): Promise<readonly AnalyticsCategorySlice[]> {
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit' && t.category,
    )
    const totals = new Map<string, { category: Category; amount: number }>()
    for (const t of debits) {
      const category = t.category!
      const entry = totals.get(category.id) ?? { category, amount: 0 }
      entry.amount += t.amount
      totals.set(category.id, entry)
    }
    const total = sum([...totals.values()], (e) => e.amount)
    return withLatency(
      [...totals.values()]
        .sort((a, b) => b.amount - a.amount)
        .map((e) => ({
          category: e.category,
          amount: e.amount,
          percentage: total ? (e.amount / total) * 100 : 0,
        })),
    )
  }

  async getMerchantSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit',
    )
    const totals = new Map<string, { merchant: Merchant; amount: number; count: number }>()
    for (const t of debits) {
      const entry = totals.get(t.merchant.id) ?? { merchant: t.merchant, amount: 0, count: 0 }
      entry.amount += t.amount
      entry.count += 1
      totals.set(t.merchant.id, entry)
    }
    return withLatency(
      [...totals.values()]
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
        })),
    )
  }

  async getClientSpend(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit' && t.client,
    )
    const totals = new Map<string, { name: string; amount: number; count: number }>()
    for (const t of debits) {
      const client = t.client!
      const entry = totals.get(client.id) ?? { name: client.name, amount: 0, count: 0 }
      entry.amount += t.amount
      entry.count += 1
      totals.set(client.id, entry)
    }
    return withLatency(
      [...totals.entries()]
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
        })),
    )
  }

  async getCreditCardSpend(filters: AnalyticsFilters): Promise<AnalyticsCardSeriesResult> {
    const debits = mockTransactions.filter(
      (t) =>
        matchesAnalyticsFilters(t, filters) &&
        t.type === 'debit' &&
        t.account.kind === 'credit_card',
    )
    const totalsByCard = new Map<string, number>()
    for (const t of debits)
      totalsByCard.set(t.account.id, (totalsByCard.get(t.account.id) ?? 0) + t.amount)
    const topCardIds = [...totalsByCard.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => id)

    const cardLabel = (id: string): string => {
      const card = mockCreditCards.find((c) => c.id === id)
      return card ? `${card.bankName} •••• ${card.last4}` : id
    }

    const buckets = buildBuckets(filters, 'month')
    const points = buckets.map((b) => ({
      ...b,
      values: Object.fromEntries(topCardIds.map((id) => [id, 0])) as Record<string, number>,
    }))

    for (const t of debits) {
      if (!topCardIds.includes(t.account.id)) continue
      const idx = bucketIndexForDate(t.date, buckets)
      if (idx === -1) continue
      points[idx].values[t.account.id] += t.amount
    }

    return withLatency({ points, cards: topCardIds.map((id) => ({ id, label: cardLabel(id) })) })
  }

  async getBankAccountActivity(filters: AnalyticsFilters): Promise<AnalyticsAccountActivityResult> {
    const txns = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.account.kind === 'bank',
    )
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

    return withLatency({ points, byAccount })
  }

  async getHighestTransactions(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const txns = mockTransactions.filter((t) => matchesAnalyticsFilters(t, filters))
    return withLatency(
      [...txns]
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
        })),
    )
  }

  async getRecurringMerchants(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit',
    )
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
    return withLatency(
      [...totals.values()]
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
        })),
    )
  }

  async getLargestExpenses(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const debits = mockTransactions.filter(
      (t) => matchesAnalyticsFilters(t, filters) && t.type === 'debit',
    )
    return withLatency(
      [...debits]
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
        })),
    )
  }

  async getRefundAnalysis(filters: AnalyticsFilters): Promise<readonly AnalyticsRankedRow[]> {
    const matched = mockTransactions.filter((t) => matchesAnalyticsFilters(t, filters))
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
    return withLatency(
      [...totals.values()]
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10)
        .map((e) => ({
          id: e.merchant.id,
          label: e.merchant.name,
          value: e.amount,
          valueLabel: formatINR(e.amount),
          secondaryValue: e.count,
          secondaryLabel: `${e.count} refund${e.count === 1 ? '' : 's'}`,
          drillFilter: { merchantId: e.merchant.id, type: 'credit' },
        })),
    )
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
      const record = mockCreditCards.find((c) => c.id === card.id)
      if (!record) continue
      // Mock proxy for utilization since credit limits live in Module 9's own
      // dataset, not this repository — flags high absolute monthly spend on a
      // single card as a stand-in for a real utilization % once Module 12A
      // wires the shared `accounts` table through.
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

    return withLatency(insights, 200)
  }

  async listBankNames(): Promise<readonly string[]> {
    return withLatency([...new Set(mockAccounts.map((a) => a.bankName))].sort(), 100)
  }
}
