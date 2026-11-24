import type {
  CreditCardCreateInput,
  CreditCardListParams,
  CreditCardListResult,
  CreditCardPosition,
  CreditCardRecord,
  CreditCardSummary,
  CreditCardUpdateInput,
} from '@/domain/CreditCard'
import type { CreditCardRepository } from '@/repositories/credit-card.repository'
import { mockCreditCardRecords } from '@/repositories/mock-data/generate-credit-cards'
import { mockStatements } from '@/repositories/mock-data/generate-statements'
import type { AccountCredentialRecord } from '@/domain/Credential'

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
  // Settings → Credentials fields aren't part of CreditCardRecord (see
  // domain/Credential.ts's doc comment) — kept as side-maps here so this
  // mock (currently unused; Module 12A swapped to Supabase) still satisfies
  // CreditCardRepository.
  private cardProducts = new Map<string, string | null>()
  private statementPasswords = new Map<string, string | null>()

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

  async getCreditPosition(id: string): Promise<CreditCardPosition> {
    const card = this.cards.find((c) => c.id === id)
    if (!card) throw new Error(`Credit card ${id} not found`)

    return withLatency(
      {
        creditLimit: card.creditLimit,
        availableCredit: card.availableCredit,
        utilizationPercent: card.utilizationPercent,
        cardNetwork: card.network,
      },
      200,
    )
  }

  async updateCreditLimit(id: string, creditLimit: number): Promise<CreditCardPosition> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Credit card ${id} not found`)

    const existing = this.cards[index]
    const availableCredit = Math.max(
      0,
      Math.round((creditLimit - existing.outstanding) * 100) / 100,
    )
    const utilizationPercent =
      creditLimit > 0 ? Math.round((existing.outstanding / creditLimit) * 1000) / 10 : 0

    this.cards[index] = { ...existing, creditLimit, availableCredit, utilizationPercent }

    return withLatency(
      { creditLimit, availableCredit, utilizationPercent, cardNetwork: existing.network },
      300,
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
      accountHolder: input.accountHolder ?? null,
    }
    this.cards = [card, ...this.cards]
    this.cardProducts.set(card.id, input.cardProduct ?? null)
    this.statementPasswords.set(card.id, input.statementPassword ?? null)
    return withLatency(card, 400)
  }

  async updateAccountHolder(id: string, accountHolder: string | null): Promise<string | null> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Credit card ${id} not found`)
    this.cards[index] = { ...this.cards[index], accountHolder }
    return withLatency(accountHolder, 200)
  }

  async update(id: string, input: CreditCardUpdateInput): Promise<CreditCardRecord> {
    const index = this.cards.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Credit card ${id} not found`)

    const existing = this.cards[index]
    const creditLimit = input.creditLimit
    const availableCredit = Math.max(
      0,
      Math.round((creditLimit - existing.outstanding) * 100) / 100,
    )
    const utilizationPercent =
      creditLimit > 0
        ? Math.round((existing.outstanding / creditLimit) * 1000) / 10
        : existing.utilizationPercent
    // Utilization is the only health signal that moves with the limit itself —
    // due_soon/payment_overdue are date-driven and stay untouched by a limit change.
    const health =
      existing.health === 'healthy' || existing.health === 'high_utilization'
        ? utilizationPercent >= 75
          ? 'high_utilization'
          : 'healthy'
        : existing.health

    const updated: CreditCardRecord = {
      ...existing,
      nickname: input.nickname,
      status: input.status,
      notes: input.notes,
      creditLimit,
      availableCredit,
      utilizationPercent,
      health,
    }
    this.cards[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.cards = this.cards.filter((c) => c.id !== id)
    return withLatency(undefined, 200)
  }

  async listCredentials(): Promise<AccountCredentialRecord[]> {
    return withLatency(
      this.cards.map((c) => ({
        id: c.id,
        kind: 'credit_card',
        institutionName: c.bankName,
        cardProduct: this.cardProducts.get(c.id) ?? c.cardName,
        last4: c.last4,
        accountTypeLabel: 'Credit Card',
        accountCategory: null,
        currency: 'INR',
        statementPassword: this.statementPasswords.get(c.id) ?? null,
        status: c.status === 'inactive' ? 'inactive' : 'active',
        updatedAt: c.lastTransactionAt ?? new Date().toISOString(),
      })),
      250,
    )
  }

  async updateStatementPassword(
    id: string,
    statementPassword: string | null,
  ): Promise<string | null> {
    if (!this.cards.some((c) => c.id === id)) throw new Error(`Credit card ${id} not found`)
    this.statementPasswords.set(id, statementPassword)
    return withLatency(statementPassword, 200)
  }
}
