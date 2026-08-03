import type { Statement, StatementStatus } from '@/domain/Statement'
import { mockAccounts, mockClients } from '@/repositories/mock-data/reference-data'

// Deterministic PRNG (mulberry32) so the mock dataset is stable across
// reloads and test runs instead of re-randomizing every time. Same seed
// pattern as generate-transactions.ts, different seed value so the two
// datasets don't shadow each other.
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const random = mulberry32(20260802)

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(random() * items.length)]
}

const statusWeights: readonly [StatementStatus, number][] = [
  ['processed', 55],
  ['imported', 15],
  ['processing', 12],
  ['pending_review', 12],
  ['failed', 6],
]

function pickStatus(): StatementStatus {
  const total = statusWeights.reduce((sum, [, weight]) => sum + weight, 0)
  let roll = random() * total
  for (const [status, weight] of statusWeights) {
    if (roll < weight) return status
    roll -= weight
  }
  return 'processed'
}

const monthLabels = [
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

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
}

function generateStatement(index: number, account: (typeof mockAccounts)[number]): Statement {
  const monthsAgo = Math.floor(random() * 6)
  const periodEnd = new Date()
  periodEnd.setDate(1)
  periodEnd.setMonth(periodEnd.getMonth() - monthsAgo + 1)
  periodEnd.setDate(0)

  const statementDate = periodEnd.toISOString().slice(0, 10)
  const importedDate = new Date(periodEnd)
  importedDate.setDate(importedDate.getDate() + 1 + Math.floor(random() * 3))
  const importedAt = importedDate.toISOString().slice(0, 10)

  const status = pickStatus()
  const client = random() > 0.35 ? pick(mockClients) : null
  const transactionsExtracted =
    status === 'failed' ? 0 : Math.floor(random() * 260) + (status === 'processing' ? 0 : 8)

  const periodLabel = `${monthLabels[periodEnd.getMonth()]} ${periodEnd.getFullYear()}`

  return {
    id: `stmt-${index.toString().padStart(4, '0')}`,
    account,
    client,
    statementDate,
    statementPeriodLabel: periodLabel,
    fileName: `${slugify(account.bankName)}-${account.last4}-${statementDate.slice(0, 7)}.pdf`,
    transactionsExtracted,
    status,
    importedAt,
    notes: null,
  }
}

const STATEMENTS_PER_ACCOUNT = 3

export const mockStatements: readonly Statement[] = mockAccounts
  .flatMap((account, accountIndex) =>
    Array.from({ length: STATEMENTS_PER_ACCOUNT }, (_, i) =>
      generateStatement(accountIndex * STATEMENTS_PER_ACCOUNT + i + 1, account),
    ),
  )
  .sort((a, b) => b.statementDate.localeCompare(a.statementDate))
