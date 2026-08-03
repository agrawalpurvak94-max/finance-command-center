import type {
  Statement,
  StatementCreateInput,
  StatementListParams,
  StatementListResult,
  StatementSummary,
} from '@/domain/Statement'
import type { StatementRepository } from '@/repositories/statement.repository'
import { mockStatements } from '@/repositories/mock-data/generate-statements'
import { mockAccounts } from '@/repositories/mock-data/reference-data'

function withLatency<T>(data: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms))
}

function matchesFilters(statement: Statement, params: StatementListParams): boolean {
  const { search, filters } = params

  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${statement.account.bankName} ${statement.fileName} ${statement.client?.name ?? ''}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }

  if (!filters) return true
  if (filters.dateFrom && statement.statementDate < filters.dateFrom) return false
  if (filters.dateTo && statement.statementDate > filters.dateTo) return false
  if (filters.bankName && statement.account.bankName !== filters.bankName) return false
  if (filters.accountKind && statement.account.kind !== filters.accountKind) return false
  if (filters.status && statement.status !== filters.status) return false
  if (filters.clientId && statement.client?.id !== filters.clientId) return false

  return true
}

function compareStatements(a: Statement, b: Statement, sort: StatementListParams['sort']): number {
  if (!sort) return b.statementDate.localeCompare(a.statementDate)

  let result = 0
  switch (sort.id) {
    case 'statementDate':
      result = a.statementDate.localeCompare(b.statementDate)
      break
    case 'importedAt':
      result = a.importedAt.localeCompare(b.importedAt)
      break
    case 'transactionsExtracted':
      result = a.transactionsExtracted - b.transactionsExtracted
      break
  }
  return sort.desc ? -result : result
}

export class MockStatementRepository implements StatementRepository {
  private statements: Statement[] = [...mockStatements]

  async list(params: StatementListParams): Promise<StatementListResult> {
    const filtered = this.statements
      .filter((statement) => matchesFilters(statement, params))
      .sort((a, b) => compareStatements(a, b, params.sort))

    const start = (params.page - 1) * params.pageSize
    const rows = filtered.slice(start, start + params.pageSize)

    return withLatency({ rows, total: filtered.length })
  }

  async getById(id: string): Promise<Statement | null> {
    return withLatency(this.statements.find((s) => s.id === id) ?? null, 150)
  }

  async getSummary(): Promise<StatementSummary> {
    let total = 0
    let processed = 0
    let processing = 0
    let failed = 0
    let pendingReview = 0

    for (const statement of this.statements) {
      total += 1
      if (statement.status === 'processed') processed += 1
      if (statement.status === 'processing') processing += 1
      if (statement.status === 'failed') failed += 1
      if (statement.status === 'pending_review') pendingReview += 1
    }

    return withLatency({ total, processed, processing, failed, pendingReview }, 250)
  }

  async create(input: StatementCreateInput): Promise<Statement> {
    const account = mockAccounts.find((a) => a.id === input.accountId)
    if (!account) throw new Error(`Account ${input.accountId} not found`)

    const now = new Date().toISOString().slice(0, 10)
    const statement: Statement = {
      id: `stmt-manual-${Date.now()}`,
      account,
      client: null,
      statementDate: now,
      statementPeriodLabel: input.statementPeriodLabel,
      fileName: input.fileName,
      transactionsExtracted: 0,
      status: 'imported',
      importedAt: now,
      notes: null,
    }
    this.statements = [statement, ...this.statements]
    return withLatency(statement, 400)
  }

  async reprocess(id: string): Promise<Statement> {
    const index = this.statements.findIndex((s) => s.id === id)
    if (index === -1) throw new Error(`Statement ${id} not found`)

    const updated: Statement = { ...this.statements[index], status: 'processing' }
    this.statements[index] = updated
    return withLatency(updated, 300)
  }

  async delete(id: string): Promise<void> {
    this.statements = this.statements.filter((s) => s.id !== id)
    return withLatency(undefined, 200)
  }
}
