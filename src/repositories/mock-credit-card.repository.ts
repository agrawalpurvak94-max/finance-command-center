import type {
  CreditCardCreateInput,
  CreditCardListParams,
  CreditCardListResult,
  CreditCardRecord,
  CreditCardSummary,
  CreditCardUpdateInput,
} from '@/domain/CreditCard'
import type { CreditCardRepository } from '@/repositories/credit-card.repository'
import { mockCreditCardRecords } from '@/repositories/mock-data/generate-credit-cards'
import { mockStatements } from '@/repositories/mock-data/generate-statements'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(card: CreditCardRecord, params: CreditCardListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${card.bankName} ${card.cardName} ${card.nickname ?? ''} ${card.last4}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.bankName && card.bankName !== filters.bankName) return false
  if (filters.network && card.network !== filters.network) return false
  if (filters.status && card.status !== filters.status) return false
  if (filters.health && card.health !== filters.health) return false
  if (filters.clientId && card.clientId !== filters.clientId) return false

  return true
}

function compareCards(
  a: CreditCardRecord,
  b: CreditCardRecord,
  sort: CreditCardListParams['sort'],
): number {
  if (!sort) return a.bankName.localeCompare(b.bankName)

  let result = 0
  switch (sort.id) {
    case 'bankName':
      result = a.bankName.localeCompare(b.bankName)
      break
    case 'cardName':
      result = a.cardName.localeCompare(b.cardName)
      break
    case 'outstanding':
      result = a.outstanding - b.outstanding
      break
    case 'utilizationPercent':
      result = a.utilizationPercent - b.utilizationPercent
      break
    case 'dueDate':
      result = a.dueDate.localeCompare(b.dueDate)
      break
  }
  return sort.desc ? -result : result
}

function isThisMonth(date: string): boolean {
  const now = new Date()
  const d = new Date(date)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

export class MockCreditCardRepository implements CreditCardRepository {
  private cards: CreditCardRecord[] = [...mockCreditCardRecords]

  async list(params: CreditCardListParams): Promise<CreditCardListResult> {
    const filtered = this.cards
      .filter((card) => matchesFilters(card, params))
      .sort((a, b) => compareCards(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getSummary(): Promise<CreditCardSummary> {
    const totalCreditLimit = this.cards.reduce((sum, c) => sum + c.creditLimit, 0)
    const totalOutstanding = this.cards.reduce((sum, c) => sum + c.outstanding, 0)
    const totalAvailableCredit = this.cards.reduce((sum, c) => sum + c.availableCredit, 0)
    const statementsImportedThisMonth = mockStatements.filter(
      (s) => s.account.kind === 'credit_card' && isThisMonth(s.importedAt),
    ).length

    return withLatency(
      {
        totalCreditCards: this.cards.length,
        totalCreditLimit,
        totalOutstanding,
        totalAvailableCredit,
        statementsImportedThisMonth,
      },
      250,
    )
  }

  async create(input: CreditCardCreateInput): Promise<CreditCardRecord> {
    const card: CreditCardRecord = {
      id: `cc-manual-${Date.now()}`,
      bankName: input.bankName,
      cardName: input.cardName,
      nickname: null,
      network: input.network,
      last4: input.last4,
      maskedNumber: `•••• •••• •••• ${input.last4}`,
      creditLimit: input.creditLimit,
      outstanding: 0,
      availableCredit: input.creditLimit,
      utilizationPercent: 0,
      statementDate: input.statementDate,
      dueDate: input.dueDate,
      minimumDue: 0,
      monthlySpend: 0,
      topMerchant: null,
      topCategory: null,
      lastTransactionAt: null,
      health: 'healthy',
      status: input.status,
      notes: null,
      clientId: null,
    }
    this.cards = [card, ...this.cards]
    return withLatency(card, 400)
  }

  async update(id: string, input: CreditCardUpdateInput): Promise<CreditCardRecord> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Credit card ${id} not found`)

    const updated: CreditCardRecord = {
      ...this.cards[index],
      nickname: input.nickname,
      status: input.status,
      notes: input.notes,
    }
    this.cards[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.cards = this.cards.filter((c) => c.id !== id)
    return withLatency(undefined, 200)
  }
}
