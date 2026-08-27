import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import type { TransactionAccount } from '@/domain/Account'
import type {
  AnalyticsCategorySlice,
  AnalyticsGranularity,
  AnalyticsOwnerTypePoint,
  AnalyticsRankedRow,
  AnalyticsSummary,
  AnalyticsTrendPoint,
} from '@/domain/Analytics'
import type { ResolvedRef, StatementAnalyticsFilters } from '@/domain/StatementAnalytics'
import type { StatementTransactionRow } from '@/domain/StatementTransaction'
import { statementRepository } from '@/services/statements.service'
import { statementAnalyticsRepository } from '@/services/statement-analytics-repo.service'
import { transactionRepository } from '@/services/transactions.service'
import { formatINR } from '@/utils/currency'
import { sum, buildBuckets, bucketIndexForDate, computeTrend } from '@/lib/analyticsBuckets'

/**
 * Statement Analytics (Statements module, Tab 3) — composes
 * `statementAnalyticsRepository` (raw `statement_transactions` +
 * `merchant_memory`) with `statementRepository` (for statement→account
 * resolution) and the existing Categories/Clients master-data reads
 * (`transactionRepository.listCategories/listClients`, already used
 * elsewhere in this app — reused here, not duplicated). Never reads
 * `public.transactions`. Every returned shape (`AnalyticsSummary`,
 * `AnalyticsCategorySlice`, `AnalyticsRankedRow`, `AnalyticsTrendPoint`,
 * `AnalyticsOwnerTypePoint`) matches Module 10's real-time Analytics output
 * types exactly, so the existing dataset-agnostic chart components render
 * this data with zero changes — those components never see a
 * `statement_transactions` row directly, only these plain aggregate shapes.
 *
 * ONE statement_transaction row = ONE analytical transaction: merchant/
 * category resolution is a client-side map lookup, never a SQL join, so
 * nothing here can multiply rows or double-count.
 */

const ALL_STATEMENTS_PAGE_SIZE = 500

function normalize(value: string): string {
  return value.trim().toUpperCase()
}

interface AdaptedTransaction {
  readonly id: string
  readonly date: string
  readonly amount: number
  readonly type: 'debit' | 'credit'
  readonly ownerType: 'business' | 'personal'
  readonly statementId: string
  readonly category: ResolvedRef
  readonly merchant: ResolvedRef
  readonly clientId: string | null
  readonly account: TransactionAccount | null
}

function resolveCategory(
  name: string | null,
  categoriesByName: Map<string, Category>,
): ResolvedRef {
  if (!name) return { id: null, name: 'Uncategorized', resolved: false }
  const match = categoriesByName.get(normalize(name))
  return match
    ? { id: match.id, name: match.name, resolved: true }
    : { id: null, name, resolved: false }
}

function resolveMerchant(
  row: StatementTransactionRow,
  memoryByNormalized: Map<string, { id: string; name: string }>,
  memoryByDisplay: Map<string, { id: string; name: string }>,
): ResolvedRef {
  const candidates = [row.normalizedMerchant, row.merchant].filter((v): v is string => !!v)
  for (const candidate of candidates) {
    const key = normalize(candidate)
    const byNormalized = memoryByNormalized.get(key)
    if (byNormalized) return { id: byNormalized.id, name: byNormalized.name, resolved: true }
  }
  for (const candidate of candidates) {
    const key = normalize(candidate)
    const byDisplay = memoryByDisplay.get(key)
    if (byDisplay) return { id: byDisplay.id, name: byDisplay.name, resolved: true }
  }
  return { id: null, name: row.merchant, resolved: false }
}

/** Fetches and adapts every statement_transaction the current filters' `statementId` scopes to (or all of them), with merchant/category resolved against the real master tables and account info resolved via statements. */
async function getAdaptedTransactions(
  filters: StatementAnalyticsFilters,
): Promise<AdaptedTransaction[]> {
  const [statementsRes, memoryEntries, categories] = await Promise.all([
    statementRepository.list({ page: 1, pageSize: ALL_STATEMENTS_PAGE_SIZE }),
    statementAnalyticsRepository.listMerchantMemory(),
    transactionRepository.listCategories(),
  ])

  const accountByStatementId = new Map<string, TransactionAccount>()
  for (const s of statementsRes.rows) accountByStatementId.set(s.id, s.account)

  const categoriesByName = new Map<string, Category>()
  for (const c of categories) categoriesByName.set(normalize(c.name), c)

  const memoryByNormalized = new Map<string, { id: string; name: string }>()
  const memoryByDisplay = new Map<string, { id: string; name: string }>()
  for (const m of memoryEntries) {
    memoryByNormalized.set(normalize(m.normalizedMerchant), { id: m.id, name: m.displayName })
    memoryByDisplay.set(normalize(m.displayName), { id: m.id, name: m.displayName })
  }

  const statementIds = filters.statementId ? [filters.statementId] : undefined
  const rows = await statementAnalyticsRepository.listAllTransactions(statementIds)

  return rows.map((row) => ({
    id: row.id,
    date: row.date,
    amount: row.amount,
    type: row.type,
    ownerType: row.ownerType,
    statementId: row.statementId,
    category: resolveCategory(row.category, categoriesByName),
    merchant: resolveMerchant(row, memoryByNormalized, memoryByDisplay),
    clientId: row.clientId,
    account: accountByStatementId.get(row.statementId) ?? null,
  }))
}

/**
 * Applies every `StatementAnalyticsFilters` dimension client-side.
 * `categoryId`/`merchantId` only ever match a REAL resolved id — an
 * unresolved row (whose `.id` is null) can never accidentally satisfy a
 * specific master-table filter, but stays fully present in unfiltered
 * aggregations (see `getAdaptedTransactions` — nothing is dropped there).
 */
function matchesFilters(t: AdaptedTransaction, filters: StatementAnalyticsFilters): boolean {
  if (filters.dateFrom && t.date < filters.dateFrom) return false
  if (filters.dateTo && t.date > filters.dateTo) return false
  if (filters.categoryId && t.category.id !== filters.categoryId) return false
  if (filters.merchantId && t.merchant.id !== filters.merchantId) return false
  if (filters.clientId && t.clientId !== filters.clientId) return false
  if (filters.type && t.type !== filters.type) return false
  if (filters.ownerType && t.ownerType !== filters.ownerType) return false
  if (filters.amountMin !== undefined && t.amount < filters.amountMin) return false
  if (filters.amountMax !== undefined && t.amount > filters.amountMax) return false
  if (filters.bankAccountId && (!t.account || t.account.id !== filters.bankAccountId)) return false
  if (filters.creditCardId && (!t.account || t.account.id !== filters.creditCardId)) return false
  if (filters.bankName && (!t.account || t.account.bankName !== filters.bankName)) return false
  if (filters.accountHolder && (!t.account || t.account.accountHolder !== filters.accountHolder))
    return false
  return true
}

async function getFilteredTransactions(
  filters: StatementAnalyticsFilters,
): Promise<AdaptedTransaction[]> {
  const all = await getAdaptedTransactions(filters)
  return all.filter((t) => matchesFilters(t, filters))
}

async function getSummary(filters: StatementAnalyticsFilters): Promise<AnalyticsSummary> {
  const txns = await getFilteredTransactions(filters)
  const debits = txns.filter((t) => t.type === 'debit')
  const credits = txns.filter((t) => t.type === 'credit')

  const totalSpend = sum(debits, (t) => t.amount)
  const totalIncome = sum(credits, (t) => t.amount)
  const totalTransactions = txns.length
  const averageTransaction = totalTransactions ? sum(txns, (t) => t.amount) / totalTransactions : 0

  const now = new Date()
  const monthPrefix = now.toISOString().slice(0, 7)
  const prevMonthDate = new Date(now)
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
  const prevMonthPrefix = prevMonthDate.toISOString().slice(0, 7)

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
    const key = t.category.id ?? t.category.name
    const entry = categoryTotals.get(key) ?? {
      category: { id: t.category.id ?? t.category.name, name: t.category.name },
      amount: 0,
    }
    entry.amount += t.amount
    categoryTotals.set(key, entry)
  }
  const highestSpendingCategory =
    [...categoryTotals.values()].sort((a, b) => b.amount - a.amount)[0] ?? null

  const merchantTotals = new Map<string, { merchant: Merchant; amount: number }>()
  for (const t of debits) {
    const key = t.merchant.id ?? t.merchant.name
    const entry = merchantTotals.get(key) ?? {
      merchant: { id: t.merchant.id ?? t.merchant.name, name: t.merchant.name },
      amount: 0,
    }
    entry.amount += t.amount
    merchantTotals.set(key, entry)
  }
  const highestSpendingMerchant =
    [...merchantTotals.values()].sort((a, b) => b.amount - a.amount)[0] ?? null

  const cardCounts = new Map<string, { account: TransactionAccount; count: number }>()
  const bankCounts = new Map<string, { account: TransactionAccount; count: number }>()
  for (const t of txns) {
    if (!t.account) continue
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

async function getSpendTrend(
  filters: StatementAnalyticsFilters,
  granularity: AnalyticsGranularity,
): Promise<readonly AnalyticsTrendPoint[]> {
  const buckets = buildBuckets(filters, granularity)
  const spend = buckets.map(() => 0)
  const debits = (await getFilteredTransactions(filters)).filter((t) => t.type === 'debit')
  for (const t of debits) {
    const idx = bucketIndexForDate(t.date, buckets)
    if (idx !== -1) spend[idx] += t.amount
  }
  return buckets.map((b, i) => ({ ...b, spend: spend[i] }))
}

async function getOwnerTypeSpend(
  filters: StatementAnalyticsFilters,
): Promise<readonly AnalyticsOwnerTypePoint[]> {
  const buckets = buildBuckets(filters, 'month')
  const business = buckets.map(() => 0)
  const personal = buckets.map(() => 0)
  const debits = (await getFilteredTransactions(filters)).filter((t) => t.type === 'debit')
  for (const t of debits) {
    const idx = bucketIndexForDate(t.date, buckets)
    if (idx === -1) continue
    if (t.ownerType === 'business') business[idx] += t.amount
    else personal[idx] += t.amount
  }
  return buckets.map((b, i) => ({ ...b, business: business[i], personal: personal[i] }))
}

async function getCategorySpend(
  filters: StatementAnalyticsFilters,
): Promise<readonly AnalyticsCategorySlice[]> {
  const debits = (await getFilteredTransactions(filters)).filter((t) => t.type === 'debit')
  const totals = new Map<string, { category: Category; amount: number }>()
  for (const t of debits) {
    const key = t.category.id ?? t.category.name
    const entry = totals.get(key) ?? {
      category: { id: t.category.id ?? t.category.name, name: t.category.name },
      amount: 0,
    }
    entry.amount += t.amount
    totals.set(key, entry)
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

async function getMerchantSpend(
  filters: StatementAnalyticsFilters,
): Promise<readonly AnalyticsRankedRow[]> {
  const debits = (await getFilteredTransactions(filters)).filter((t) => t.type === 'debit')
  const totals = new Map<string, { merchant: Merchant; amount: number; count: number }>()
  for (const t of debits) {
    const key = t.merchant.id ?? t.merchant.name
    const entry = totals.get(key) ?? {
      merchant: { id: t.merchant.id ?? t.merchant.name, name: t.merchant.name },
      amount: 0,
      count: 0,
    }
    entry.amount += t.amount
    entry.count += 1
    totals.set(key, entry)
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

async function getClientSpend(
  filters: StatementAnalyticsFilters,
): Promise<readonly AnalyticsRankedRow[]> {
  const [txns, clients] = await Promise.all([
    getFilteredTransactions(filters),
    transactionRepository.listClients(),
  ])
  const clientsById = new Map(clients.map((c) => [c.id, c]))
  const debits = txns.filter((t) => t.type === 'debit' && t.clientId)
  const totals = new Map<string, { name: string; amount: number; count: number }>()
  for (const t of debits) {
    const clientId = t.clientId!
    const name = clientsById.get(clientId)?.name ?? clientId
    const entry = totals.get(clientId) ?? { name, amount: 0, count: 0 }
    entry.amount += t.amount
    entry.count += 1
    totals.set(clientId, entry)
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

export const statementAnalyticsService = {
  getSummary,
  getSpendTrend,
  getOwnerTypeSpend,
  getCategorySpend,
  getMerchantSpend,
  getClientSpend,
}
