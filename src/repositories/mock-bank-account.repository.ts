import type {
  BankAccountCreateInput,
  BankAccountListParams,
  BankAccountListResult,
  BankAccountRecord,
  BankAccountSummary,
  BankAccountUpdateInput,
} from '@/domain/Account'
import type { BankAccountRepository } from '@/repositories/bank-account.repository'
import { mockBankAccountRecords } from '@/repositories/mock-data/generate-bank-accounts'
import { mockStatements } from '@/repositories/mock-data/generate-statements'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(account: BankAccountRecord, params: BankAccountListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${account.bankName} ${account.accountName} ${account.nickname ?? ''} ${account.last4}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.bankName && account.bankName !== filters.bankName) return false
  if (filters.accountType && account.accountType !== filters.accountType) return false
  if (filters.status && account.status !== filters.status) return false
  if (filters.health && account.health !== filters.health) return false
  if (filters.clientId && account.clientId !== filters.clientId) return false

  return true
}

function compareAccounts(
  a: BankAccountRecord,
  b: BankAccountRecord,
  sort: BankAccountListParams['sort'],
): number {
  if (!sort) return a.bankName.localeCompare(b.bankName)

  let result = 0
  switch (sort.id) {
    case 'bankName':
      result = a.bankName.localeCompare(b.bankName)
      break
    case 'accountName':
      result = a.accountName.localeCompare(b.accountName)
      break
    case 'currentBalance':
      result = a.currentBalance - b.currentBalance
      break
    case 'availableBalance':
      result = a.availableBalance - b.availableBalance
      break
    case 'lastSyncAt':
      result = a.lastSyncAt.localeCompare(b.lastSyncAt)
      break
  }
  return sort.desc ? -result : result
}

function isThisMonth(date: string): boolean {
  const now = new Date()
  const d = new Date(date)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export class MockBankAccountRepository implements BankAccountRepository {
  private accounts: BankAccountRecord[] = [...mockBankAccountRecords]

  async list(params: BankAccountListParams): Promise<BankAccountListResult> {
    const filtered = this.accounts
      .filter((account) => matchesFilters(account, params))
      .sort((a, b) => compareAccounts(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getSummary(): Promise<BankAccountSummary> {
    const totalCurrentBalance = this.accounts.reduce((sum, a) => sum + a.currentBalance, 0)
    const totalAvailableBalance = this.accounts.reduce((sum, a) => sum + a.availableBalance, 0)
    const statementsImportedThisMonth = mockStatements.filter(
      (s) => s.account.kind === 'bank' && isThisMonth(s.importedAt),
    ).length

    return withLatency(
      {
        totalBankAccounts: this.accounts.length,
        totalCurrentBalance,
        totalAvailableBalance,
        statementsImportedThisMonth,
      },
      250,
    )
  }

  async create(input: BankAccountCreateInput): Promise<BankAccountRecord> {
    const last4 = input.accountNumber.slice(-4).padStart(4, '0')
    const account: BankAccountRecord = {
      id: `acct-manual-${Date.now()}`,
      bankName: input.bankName,
      accountName: input.accountName,
      nickname: input.nickname,
      accountType: input.accountType,
      last4,
      maskedAccountNumber: `•••• •••• ${last4}`,
      currentBalance: input.openingBalance,
      availableBalance: input.openingBalance,
      monthlyCredits: 0,
      monthlyDebits: 0,
      topMerchant: null,
      topCategory: null,
      recentActivityCount: 0,
      lastSyncAt: todayIso(),
      lastTransactionAt: null,
      health: 'healthy',
      status: input.status,
      notes: null,
      clientId: null,
    }
    this.accounts = [account, ...this.accounts]
    return withLatency(account, 400)
  }

  async update(id: string, input: BankAccountUpdateInput): Promise<BankAccountRecord> {
    const index = this.accounts.findIndex((a) => a.id === id)
    if (index === -1) throw new Error(`Bank account ${id} not found`)

    const updated: BankAccountRecord = {
      ...this.accounts[index],
      nickname: input.nickname,
      status: input.status,
      notes: input.notes,
    }
    this.accounts[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.accounts = this.accounts.filter((a) => a.id !== id)
    return withLatency(undefined, 200)
  }

  async syncAll(): Promise<void> {
    const now = todayIso()
    this.accounts = this.accounts.map((a) => ({
      ...a,
      lastSyncAt: now,
      health: a.health === 'sync_required' ? 'healthy' : a.health,
    }))
    return withLatency(undefined, 600)
  }
}
