import type { MerchantRecord, MerchantStatus } from '@/domain/Merchant'
import { mockCategories, mockMerchants } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

interface MerchantMeta {
  readonly categoryId: string | null
  readonly status: MerchantStatus
  readonly aliases: readonly string[]
  readonly hasRules: boolean
  readonly notes: string | null
}

// Hand-authored master data — default category, status, aliases, and notes
// per merchant. Reuses the existing 19 merchant ids from reference-data.ts
// rather than inventing new ones, so the already-deterministic transaction
// dataset's merchant assignments are unaffected by this module. Two
// merchants (Razorpay, Zerodha) are deliberately left uncategorized to
// exercise the "Uncategorized Merchants" KPI/filter with real data.
const merchantMeta: Record<string, MerchantMeta> = {
  'merchant-aws': {
    categoryId: 'cat-cloud',
    status: 'active',
    aliases: ['AWS', 'Amazon Web Services'],
    hasRules: true,
    notes: null,
  },
  'merchant-gcp': {
    categoryId: 'cat-cloud',
    status: 'active',
    aliases: ['GCP'],
    hasRules: true,
    notes: null,
  },
  'merchant-bluetokai': {
    categoryId: 'cat-meals',
    status: 'active',
    aliases: ['Blue Tokai'],
    hasRules: false,
    notes: null,
  },
  'merchant-uber': {
    categoryId: 'cat-travel',
    status: 'active',
    aliases: ['Uber'],
    hasRules: true,
    notes: null,
  },
  'merchant-digitalocean': {
    categoryId: 'cat-cloud',
    status: 'active',
    aliases: ['DO', 'Digital Ocean'],
    hasRules: false,
    notes: null,
  },
  'merchant-starbucks': {
    categoryId: 'cat-meals',
    status: 'active',
    aliases: ['Starbucks'],
    hasRules: false,
    notes: null,
  },
  'merchant-hdfc-insurance': {
    categoryId: 'cat-insurance',
    status: 'inactive',
    aliases: ['HDFC Life'],
    hasRules: true,
    notes: 'Policy under review — renewal pending.',
  },
  'merchant-azure': {
    categoryId: 'cat-cloud',
    status: 'active',
    aliases: ['Azure', 'MSFT Azure'],
    hasRules: true,
    notes: null,
  },
  'merchant-adobe': {
    categoryId: 'cat-saas',
    status: 'active',
    aliases: ['Adobe CC'],
    hasRules: true,
    notes: null,
  },
  'merchant-slack': {
    categoryId: 'cat-saas',
    status: 'active',
    aliases: ['Slack'],
    hasRules: true,
    notes: null,
  },
  'merchant-razorpay': {
    categoryId: null,
    status: 'active',
    aliases: ['Razorpay'],
    hasRules: false,
    notes: null,
  },
  'merchant-zomato': {
    categoryId: 'cat-meals',
    status: 'active',
    aliases: ['Zomato'],
    hasRules: false,
    notes: null,
  },
  'merchant-makemytrip': {
    categoryId: 'cat-travel',
    status: 'inactive',
    aliases: ['MMT'],
    hasRules: false,
    notes: null,
  },
  'merchant-swiggy': {
    categoryId: 'cat-meals',
    status: 'active',
    aliases: ['Swiggy'],
    hasRules: false,
    notes: null,
  },
  'merchant-gst': {
    categoryId: 'cat-taxes',
    status: 'active',
    aliases: ['GST'],
    hasRules: true,
    notes: null,
  },
  'merchant-zerodha': {
    categoryId: null,
    status: 'active',
    aliases: ['Zerodha', 'Kite'],
    hasRules: false,
    notes: null,
  },
  'merchant-google-workspace': {
    categoryId: 'cat-saas',
    status: 'active',
    aliases: ['GSuite', 'Workspace'],
    hasRules: true,
    notes: null,
  },
  'merchant-wework': {
    categoryId: 'cat-rent',
    status: 'active',
    aliases: [],
    hasRules: false,
    notes: 'Lease terminates Dec 2026.',
  },
  'merchant-airtel': {
    categoryId: 'cat-utilities',
    status: 'active',
    aliases: ['Airtel'],
    hasRules: true,
    notes: null,
  },
}

function buildMerchantRecord(merchantId: string): MerchantRecord {
  const merchant = mockMerchants.find((m) => m.id === merchantId)
  if (!merchant) throw new Error(`Unknown merchant id in merchantMeta: ${merchantId}`)

  const meta = merchantMeta[merchantId]
  const defaultCategory = meta.categoryId
    ? (mockCategories.find((c) => c.id === meta.categoryId) ?? null)
    : null

  const relatedTransactions = mockTransactions.filter((txn) => txn.merchant.id === merchantId)
  const totalSpend = relatedTransactions.reduce((sum, txn) => sum + txn.amount, 0)
  const averageTransaction =
    relatedTransactions.length > 0 ? totalSpend / relatedTransactions.length : 0
  const lastTransactionAt = relatedTransactions.reduce<string | null>(
    (latest, txn) => (latest === null || txn.date > latest ? txn.date : latest),
    null,
  )

  return {
    id: merchant.id,
    name: merchant.name,
    aliases: meta.aliases,
    defaultCategory,
    status: meta.status,
    notes: meta.notes,
    hasRules: meta.hasRules,
    transactionCount: relatedTransactions.length,
    totalSpend,
    averageTransaction,
    lastTransactionAt,
  }
}

export const mockMerchantRecords: readonly MerchantRecord[] = mockMerchants
  .map((merchant) => buildMerchantRecord(merchant.id))
  .sort((a, b) => a.name.localeCompare(b.name))
