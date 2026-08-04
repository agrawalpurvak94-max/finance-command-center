import type {
  MerchantCreateInput,
  MerchantListParams,
  MerchantListResult,
  MerchantRecord,
  MerchantSummary,
  MerchantUpdateInput,
} from '@/domain/Merchant'
import type { MerchantRepository } from '@/repositories/merchant.repository'
import { mockMerchantRecords } from '@/repositories/mock-data/generate-merchants'
import { mockCategories } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(merchant: MerchantRecord, params: MerchantListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack = `${merchant.name} ${merchant.aliases.join(' ')} ${
      merchant.defaultCategory?.name ?? ''
    }`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.categoryId && merchant.defaultCategory?.id !== filters.categoryId) return false
  if (filters.status && merchant.status !== filters.status) return false
  if (filters.hasRules !== undefined && merchant.hasRules !== filters.hasRules) return false
  if (
    filters.minTransactionCount !== undefined &&
    merchant.transactionCount < filters.minTransactionCount
  )
    return false
  if (
    filters.maxTransactionCount !== undefined &&
    merchant.transactionCount > filters.maxTransactionCount
  )
    return false

  return true
}

function compareMerchants(
  a: MerchantRecord,
  b: MerchantRecord,
  sort: MerchantListParams['sort'],
): number {
  if (!sort) return a.name.localeCompare(b.name)

  let result = 0
  switch (sort.id) {
    case 'name':
      result = a.name.localeCompare(b.name)
      break
    case 'transactionCount':
      result = a.transactionCount - b.transactionCount
      break
    case 'totalSpend':
      result = a.totalSpend - b.totalSpend
      break
    case 'averageTransaction':
      result = a.averageTransaction - b.averageTransaction
      break
    case 'lastTransactionAt':
      result = (a.lastTransactionAt ?? '').localeCompare(b.lastTransactionAt ?? '')
      break
  }
  return sort.desc ? -result : result
}

function isThisMonth(date: string): boolean {
  const now = new Date()
  const txnDate = new Date(date)
  return txnDate.getFullYear() === now.getFullYear() && txnDate.getMonth() === now.getMonth()
}

export class MockMerchantRepository implements MerchantRepository {
  private merchants: MerchantRecord[] = [...mockMerchantRecords]

  async list(params: MerchantListParams): Promise<MerchantListResult> {
    const filtered = this.merchants
      .filter((merchant) => matchesFilters(merchant, params))
      .sort((a, b) => compareMerchants(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getSummary(): Promise<MerchantSummary> {
    let active = 0
    let uncategorized = 0
    let totalSpend = 0

    for (const merchant of this.merchants) {
      if (merchant.status === 'active') active += 1
      if (merchant.defaultCategory === null) uncategorized += 1
      totalSpend += merchant.totalSpend
    }

    const transactionsThisMonth = mockTransactions.filter((txn) => isThisMonth(txn.date)).length

    return withLatency(
      { total: this.merchants.length, active, uncategorized, totalSpend, transactionsThisMonth },
      250,
    )
  }

  async create(input: MerchantCreateInput): Promise<MerchantRecord> {
    const defaultCategory = input.defaultCategoryId
      ? (mockCategories.find((c) => c.id === input.defaultCategoryId) ?? null)
      : null

    const merchant: MerchantRecord = {
      id: `merchant-manual-${Date.now()}`,
      name: input.name,
      aliases: [],
      defaultCategory,
      status: input.status,
      notes: input.notes,
      hasRules: false,
      transactionCount: 0,
      totalSpend: 0,
      averageTransaction: 0,
      lastTransactionAt: null,
    }
    this.merchants = [merchant, ...this.merchants]
    return withLatency(merchant, 400)
  }

  async update(id: string, input: MerchantUpdateInput): Promise<MerchantRecord> {
    const index = this.merchants.findIndex((m) => m.id === id)
    if (index === -1) throw new Error(`Merchant ${id} not found`)

    const defaultCategory = input.defaultCategoryId
      ? (mockCategories.find((c) => c.id === input.defaultCategoryId) ?? null)
      : null

    const current = this.merchants[index]
    const updated: MerchantRecord = {
      ...current,
      name: input.name,
      defaultCategory,
      status: input.status,
      notes: input.notes,
    }
    this.merchants[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.merchants = this.merchants.filter((m) => m.id !== id)
    return withLatency(undefined, 200)
  }
}
