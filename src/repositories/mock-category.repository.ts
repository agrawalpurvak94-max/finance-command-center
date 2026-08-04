import type {
  CategoryCreateInput,
  CategoryListParams,
  CategoryListResult,
  CategoryRecord,
  CategorySummary,
  CategoryUpdateInput,
} from '@/domain/Category'
import type { CategoryRepository } from '@/repositories/category.repository'
import { mockCategoryRecords } from '@/repositories/mock-data/generate-categories'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(category: CategoryRecord, params: CategoryListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack = `${category.name} ${category.description}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.status && category.status !== filters.status) return false
  if (filters.parentCategoryId && category.parentCategory?.id !== filters.parentCategoryId)
    return false
  if (
    filters.minTransactionCount !== undefined &&
    category.transactionCount < filters.minTransactionCount
  )
    return false
  if (
    filters.maxTransactionCount !== undefined &&
    category.transactionCount > filters.maxTransactionCount
  )
    return false

  return true
}

function compareCategories(
  a: CategoryRecord,
  b: CategoryRecord,
  sort: CategoryListParams['sort'],
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
    case 'merchantsAssigned':
      result = a.merchantsAssigned - b.merchantsAssigned
      break
    case 'lastUpdatedAt':
      result = a.lastUpdatedAt.localeCompare(b.lastUpdatedAt)
      break
  }
  return sort.desc ? -result : result
}

export class MockCategoryRepository implements CategoryRepository {
  private categories: CategoryRecord[] = [...mockCategoryRecords]

  async list(params: CategoryListParams): Promise<CategoryListResult> {
    const filtered = this.categories
      .filter((category) => matchesFilters(category, params))
      .sort((a, b) => compareCategories(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getSummary(): Promise<CategorySummary> {
    let active = 0
    let inactive = 0

    for (const category of this.categories) {
      if (category.status === 'active') active += 1
      if (category.status === 'inactive') inactive += 1
    }

    const uncategorizedTransactions = mockTransactions.filter((txn) => txn.category === null).length

    return withLatency(
      { total: this.categories.length, active, inactive, uncategorizedTransactions },
      250,
    )
  }

  async create(input: CategoryCreateInput): Promise<CategoryRecord> {
    const parentCategory = input.parentCategoryId
      ? (this.categories.find((c) => c.id === input.parentCategoryId) ?? null)
      : null

    const category: CategoryRecord = {
      id: `cat-manual-${Date.now()}`,
      name: input.name,
      description: input.description,
      parentCategory: parentCategory ? { id: parentCategory.id, name: parentCategory.name } : null,
      status: input.status,
      color: input.color,
      icon: 'Tag',
      transactionCount: 0,
      merchantsAssigned: 0,
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
    }
    this.categories = [category, ...this.categories]
    return withLatency(category, 400)
  }

  async update(id: string, input: CategoryUpdateInput): Promise<CategoryRecord> {
    const index = this.categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Category ${id} not found`)

    const parentCategory = input.parentCategoryId
      ? (this.categories.find((c) => c.id === input.parentCategoryId) ?? null)
      : null

    const current = this.categories[index]
    const updated: CategoryRecord = {
      ...current,
      name: input.name,
      description: input.description,
      parentCategory: parentCategory ? { id: parentCategory.id, name: parentCategory.name } : null,
      status: input.status,
      color: input.color,
      lastUpdatedAt: new Date().toISOString().slice(0, 10),
    }
    this.categories[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.categories = this.categories.filter((c) => c.id !== id)
    return withLatency(undefined, 200)
  }
}
