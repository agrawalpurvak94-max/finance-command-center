import type {
  ClientCreateInput,
  ClientListParams,
  ClientListResult,
  ClientRecord,
  ClientSummary,
  ClientUpdateInput,
} from '@/domain/Client'
import type { ClientRepository } from '@/repositories/client.repository'
import { mockClientRecords } from '@/repositories/mock-data/generate-clients'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(client: ClientRecord, params: ClientListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${client.name} ${client.company ?? ''} ${client.email ?? ''} ${client.phone ?? ''}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.clientType && client.clientType !== filters.clientType) return false
  if (filters.status && client.status !== filters.status) return false
  if (filters.categoryId && !client.topCategories.some((c) => c.category.id === filters.categoryId))
    return false
  if (filters.dateAddedFrom && client.createdAt < filters.dateAddedFrom) return false
  if (filters.dateAddedTo && client.createdAt > filters.dateAddedTo) return false

  return true
}

function compareClients(a: ClientRecord, b: ClientRecord, sort: ClientListParams['sort']): number {
  if (!sort) return a.name.localeCompare(b.name)

  let result = 0
  switch (sort.id) {
    case 'name':
      result = a.name.localeCompare(b.name)
      break
    case 'totalSpend':
      result = a.totalSpend - b.totalSpend
      break
    case 'transactionCount':
      result = a.transactionCount - b.transactionCount
      break
    case 'createdAt':
      result = a.createdAt.localeCompare(b.createdAt)
      break
  }
  return sort.desc ? -result : result
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export class MockClientRepository implements ClientRepository {
  private clients: ClientRecord[] = [...mockClientRecords]

  async list(params: ClientListParams): Promise<ClientListResult> {
    const filtered = this.clients
      .filter((client) => matchesFilters(client, params))
      .sort((a, b) => compareClients(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getSummary(): Promise<ClientSummary> {
    const totalSpend = this.clients.reduce((sum, c) => sum + c.totalSpend, 0)
    const clientsRequiringReview = this.clients.filter((c) => c.status === 'pending').length
    const activeClients = this.clients.filter((c) => c.status === 'active').length

    return withLatency(
      { totalClients: this.clients.length, totalSpend, clientsRequiringReview, activeClients },
      250,
    )
  }

  async create(input: ClientCreateInput): Promise<ClientRecord> {
    const client: ClientRecord = {
      id: `client-manual-${Date.now()}`,
      name: input.name,
      clientType: input.clientType,
      company: input.company,
      email: input.email,
      phone: input.phone,
      status: input.status,
      notes: input.notes,
      totalSpend: 0,
      transactionCount: 0,
      linkedAccountsCount: 0,
      linkedCreditCardsCount: 0,
      linkedStatementsCount: 0,
      topCategories: [],
      topMerchants: [],
      firstTransactionAt: null,
      lastTransactionAt: null,
      createdAt: todayIso(),
    }
    this.clients = [client, ...this.clients]
    return withLatency(client, 400)
  }

  async update(id: string, input: ClientUpdateInput): Promise<ClientRecord> {
    const index = this.clients.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Client ${id} not found`)

    const updated: ClientRecord = {
      ...this.clients[index],
      name: input.name,
      company: input.company,
      email: input.email,
      phone: input.phone,
      status: input.status,
      notes: input.notes,
    }
    this.clients[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.clients = this.clients.filter((c) => c.id !== id)
    return withLatency(undefined, 200)
  }
}
