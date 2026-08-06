import type {
  ClientCategorySpend,
  ClientMerchantSpend,
  ClientRecord,
  ClientRecordStatus,
  ClientType,
} from '@/domain/Client'
import type { Category } from '@/domain/Category'
import type { Merchant } from '@/domain/Merchant'
import { mockClients } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'
import { mockStatements } from '@/repositories/mock-data/generate-statements'
import { mockBankAccountRecords } from '@/repositories/mock-data/generate-bank-accounts'
import { mockCreditCardRecords } from '@/repositories/mock-data/generate-credit-cards'

// Explicit per-client authoring — with only 8 clients, this reads far more
// like real financial-client records than randomly generated contact data
// would. Types/statuses are diversified deliberately: most existing clients
// read as companies, "Internal" represents the owner's own unattributed
// spend (personal), and Vortex AI stands in for a related business unit —
// so all three of those ClientType values have at least one real row,
// without inventing new client ids that would have zero linked transactions.
interface ClientMeta {
  readonly clientType: ClientType
  readonly company: string | null
  readonly email: string | null
  readonly phone: string | null
  readonly status: ClientRecordStatus
  readonly notes: string | null
  readonly createdAt: string
}

const CLIENT_META: Record<string, ClientMeta> = {
  'client-acme': {
    clientType: 'company',
    company: 'Acme Corp',
    email: 'finance@acmecorp.in',
    phone: '+91 98765 43210',
    status: 'active',
    notes: null,
    createdAt: '2023-10-12',
  },
  'client-stellar': {
    clientType: 'company',
    company: 'Stellar Ltd',
    email: 'accounts@stellarltd.in',
    phone: '+91 99123 00456',
    status: 'active',
    notes: null,
    createdAt: '2024-01-05',
  },
  'client-vortex': {
    clientType: 'business_unit',
    company: 'Vortex AI',
    email: 'ops@vortex.ai',
    phone: '+91 88002 11990',
    status: 'active',
    notes: 'Related business unit — shares the OD facility and one corporate card.',
    createdAt: '2024-02-18',
  },
  'client-finstrat': {
    clientType: 'company',
    company: 'FinStrat Solutions',
    email: 'billing@finstrat.com',
    phone: '+91 97710 22334',
    status: 'pending',
    notes: 'Onboarding documents pending review.',
    createdAt: '2024-03-22',
  },
  'client-solargrid': {
    clientType: 'company',
    company: 'SolarGrid Energy',
    email: 'accounts@solargrid.in',
    phone: '+91 96601 55221',
    status: 'active',
    notes: null,
    createdAt: '2023-11-30',
  },
  'client-indologistics': {
    clientType: 'company',
    company: 'Indo Logistics',
    email: 'finance@indologistics.com',
    phone: '+91 97771 88822',
    status: 'suspended',
    notes: 'Suspended pending updated contract terms.',
    createdAt: '2023-11-30',
  },
  'client-nexus': {
    clientType: 'company',
    company: 'Nexus Technology Corp',
    email: 'ap@nexustech.com',
    phone: '+91 90090 12345',
    status: 'active',
    notes: null,
    createdAt: '2024-04-09',
  },
  'client-internal': {
    clientType: 'personal',
    company: null,
    email: null,
    phone: null,
    status: 'active',
    notes: 'Unattributed / personal spend not tied to an external client.',
    createdAt: '2023-08-01',
  },
}

function isDebit(type: 'debit' | 'credit'): boolean {
  return type === 'debit'
}

function topCategorySpend(
  transactions: readonly (typeof mockTransactions)[number][],
): readonly ClientCategorySpend[] {
  const totals = new Map<string, { category: Category; totalSpend: number }>()
  for (const txn of transactions) {
    if (!txn.category || !isDebit(txn.type)) continue
    const existing = totals.get(txn.category.id)
    totals.set(txn.category.id, {
      category: txn.category,
      totalSpend: (existing?.totalSpend ?? 0) + txn.amount,
    })
  }
  return Array.from(totals.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5)
}

function topMerchantSpend(
  transactions: readonly (typeof mockTransactions)[number][],
): readonly ClientMerchantSpend[] {
  const totals = new Map<string, { merchant: Merchant; totalSpend: number }>()
  for (const txn of transactions) {
    if (!isDebit(txn.type)) continue
    const existing = totals.get(txn.merchant.id)
    totals.set(txn.merchant.id, {
      merchant: txn.merchant,
      totalSpend: (existing?.totalSpend ?? 0) + txn.amount,
    })
  }
  return Array.from(totals.values())
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, 5)
}

function generateClient(client: (typeof mockClients)[number]): ClientRecord {
  const meta = CLIENT_META[client.id] ?? {
    clientType: 'company' as ClientType,
    company: null,
    email: null,
    phone: null,
    status: 'active' as ClientRecordStatus,
    notes: null,
    createdAt: '2023-01-01',
  }

  const clientTransactions = mockTransactions.filter((txn) => txn.client?.id === client.id)
  const totalSpend = clientTransactions
    .filter((txn) => isDebit(txn.type))
    .reduce((sum, txn) => sum + txn.amount, 0)

  const firstTransactionAt = clientTransactions.reduce<string | null>(
    (earliest, txn) => (!earliest || txn.date < earliest ? txn.date : earliest),
    null,
  )
  const lastTransactionAt = clientTransactions.reduce<string | null>(
    (latest, txn) => (!latest || txn.date > latest ? txn.date : latest),
    null,
  )

  const linkedAccountsCount = mockBankAccountRecords.filter((a) => a.clientId === client.id).length
  const linkedCreditCardsCount = mockCreditCardRecords.filter(
    (c) => c.clientId === client.id,
  ).length
  const linkedStatementsCount = mockStatements.filter((s) => s.client?.id === client.id).length

  return {
    id: client.id,
    name: client.name,
    clientType: meta.clientType,
    company: meta.company,
    email: meta.email,
    phone: meta.phone,
    status: meta.status,
    notes: meta.notes,
    totalSpend,
    transactionCount: clientTransactions.length,
    linkedAccountsCount,
    linkedCreditCardsCount,
    linkedStatementsCount,
    topCategories: topCategorySpend(clientTransactions),
    topMerchants: topMerchantSpend(clientTransactions),
    firstTransactionAt,
    lastTransactionAt,
    createdAt: meta.createdAt,
  }
}

export const mockClientRecords: readonly ClientRecord[] = mockClients.map(generateClient)
