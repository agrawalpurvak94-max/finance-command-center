import type {
  Category,
  Client,
  Merchant,
  Transaction,
  TransactionAccount,
  TransactionCreateInput,
  TransactionListParams,
  TransactionListResult,
  TransactionPatch,
} from '@/types/transaction'
import type { TransactionRepository } from '@/repositories/transaction.repository'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'
import {
  mockAccounts,
  mockCategories,
  mockClients,
  mockMerchants,
} from '@/repositories/mock-data/reference-data'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(txn: Transaction, params: TransactionListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${txn.merchant.name} ${txn.category?.name ?? ''} ${txn.client?.name ?? ''} ${txn.notes ?? ''}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.dateFrom && txn.date < filters.dateFrom) return false
  if (filters.dateTo && txn.date > filters.dateTo) return false
  if (filters.categoryId && txn.category?.id !== filters.categoryId) return false
  if (filters.clientId && txn.client?.id !== filters.clientId) return false
  if (filters.merchantId && txn.merchant.id !== filters.merchantId) return false
  if (filters.bankAccountId && txn.account.id !== filters.bankAccountId) return false
  if (filters.creditCardId && txn.account.id !== filters.creditCardId) return false
  if (filters.type && txn.type !== filters.type) return false
  if (filters.ownerType && txn.ownerType !== filters.ownerType) return false
  if (filters.status && txn.status !== filters.status) return false
  if (filters.amountMin !== undefined && txn.amount < filters.amountMin) return false
  if (filters.amountMax !== undefined && txn.amount > filters.amountMax) return false

  return true
}

function compareTransactions(
  a: Transaction,
  b: Transaction,
  sort: TransactionListParams['sort'],
): number {
  if (!sort) return b.date.localeCompare(a.date)

  let result = 0
  switch (sort.id) {
    case 'date':
      result = a.date.localeCompare(b.date)
      break
    case 'merchant':
      result = a.merchant.name.localeCompare(b.merchant.name)
      break
    case 'amount':
      result = a.amount - b.amount
      break
    case 'status':
      result = a.status.localeCompare(b.status)
      break
  }
  return sort.desc ? -result : result
}

export class MockTransactionRepository implements TransactionRepository {
  private transactions: Transaction[] = [...mockTransactions]

  async list(params: TransactionListParams): Promise<TransactionListResult> {
    const filtered = this.transactions
      .filter((txn) => matchesFilters(txn, params))
      .sort((a, b) => compareTransactions(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getById(id: string): Promise<Transaction | null> {
    return withLatency(this.transactions.find((txn) => txn.id === id) ?? null, 150)
  }

  async create(input: TransactionCreateInput): Promise<Transaction> {
    const account = mockAccounts.find((a) => a.id === input.accountId)
    if (!account) throw new Error(`Account ${input.accountId} not found`)

    const transaction: Transaction = {
      id: `txn-manual-${Date.now()}`,
      date: input.date,
      merchant: { id: `merchant-manual-${Date.now()}`, name: input.merchantName },
      category: mockCategories.find((c) => c.id === input.categoryId) ?? null,
      client: mockClients.find((c) => c.id === input.clientId) ?? null,
      account,
      ownerType: input.ownerType,
      type: input.type,
      amount: input.amount,
      status: 'pending_review',
      notes: null,
      duplicateOfId: null,
    }
    this.transactions = [transaction, ...this.transactions]
    return withLatency(transaction, 250)
  }

  async update(id: string, patch: TransactionPatch): Promise<Transaction> {
    const index = this.transactions.findIndex((txn) => txn.id === id)
    if (index === -1) throw new Error(`Transaction ${id} not found`)

    const current = this.transactions[index]
    const updated: Transaction = {
      ...current,
      category:
        patch.categoryId !== undefined
          ? (mockCategories.find((c) => c.id === patch.categoryId) ?? null)
          : current.category,
      client:
        patch.clientId !== undefined
          ? (mockClients.find((c) => c.id === patch.clientId) ?? null)
          : current.client,
      merchant: patch.merchantId
        ? (mockMerchants.find((m) => m.id === patch.merchantId) ?? current.merchant)
        : current.merchant,
      ownerType: patch.ownerType ?? current.ownerType,
      status: patch.status ?? current.status,
      notes: patch.notes !== undefined ? patch.notes : current.notes,
    }
    this.transactions[index] = updated
    return withLatency(updated, 200)
  }

  async bulkUpdate(ids: readonly string[], patch: TransactionPatch): Promise<void> {
    for (const id of ids) {
      await this.update(id, patch)
    }
  }

  async delete(id: string): Promise<void> {
    this.transactions = this.transactions.filter((txn) => txn.id !== id)
    return withLatency(undefined, 200)
  }

  async bulkDelete(ids: readonly string[]): Promise<void> {
    const idSet = new Set(ids)
    this.transactions = this.transactions.filter((txn) => !idSet.has(txn.id))
    return withLatency(undefined, 200)
  }

  async listCategories(): Promise<readonly Category[]> {
    return withLatency(mockCategories, 100)
  }

  async listClients(): Promise<readonly Client[]> {
    return withLatency(mockClients, 100)
  }

  async listMerchants(): Promise<readonly Merchant[]> {
    return withLatency(mockMerchants, 100)
  }

  async listAccounts(): Promise<readonly TransactionAccount[]> {
    return withLatency(mockAccounts, 100)
  }
}
