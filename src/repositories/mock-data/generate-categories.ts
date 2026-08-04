import type { CategoryColor, CategoryRecord, CategoryStatus } from '@/domain/Category'
import { mockCategories } from '@/repositories/mock-data/reference-data'
import { mockTransactions } from '@/repositories/mock-data/generate-transactions'

interface CategoryMeta {
  readonly description: string
  readonly status: CategoryStatus
  readonly color: CategoryColor
  readonly icon: string
  readonly parentId: string | null
  readonly lastUpdatedAt: string
}

// Hand-authored master data — descriptions, a light two-level hierarchy, and
// status/color/icon per category. Deliberately reuses the existing 13
// category ids from reference-data.ts rather than inventing new ones, so the
// already-deterministic transaction dataset's category assignments are
// unaffected by this module.
const categoryMeta: Record<string, CategoryMeta> = {
  'cat-saas': {
    description: 'Recurring software subscriptions and SaaS tooling.',
    status: 'active',
    color: 'primary',
    icon: 'AppWindow',
    parentId: null,
    lastUpdatedAt: '2025-11-02',
  },
  'cat-cloud': {
    description: 'Cloud compute, storage, and infrastructure hosting spend.',
    status: 'active',
    color: 'blue',
    icon: 'Cloud',
    parentId: 'cat-saas',
    lastUpdatedAt: '2025-12-14',
  },
  'cat-travel': {
    description: 'Flights, ground transport, and lodging for business travel.',
    status: 'active',
    color: 'violet',
    icon: 'Plane',
    parentId: null,
    lastUpdatedAt: '2025-10-20',
  },
  'cat-meals': {
    description: 'Client meals, team meals, and entertainment.',
    status: 'active',
    color: 'amber',
    icon: 'UtensilsCrossed',
    parentId: 'cat-travel',
    lastUpdatedAt: '2025-09-30',
  },
  'cat-statutory': {
    description: 'Government-mandated compliance and statutory obligations.',
    status: 'active',
    color: 'rose',
    icon: 'Landmark',
    parentId: null,
    lastUpdatedAt: '2026-01-05',
  },
  'cat-taxes': {
    description: 'GST, TDS, and other tax remittances.',
    status: 'active',
    color: 'rose',
    icon: 'Receipt',
    parentId: 'cat-statutory',
    lastUpdatedAt: '2026-01-05',
  },
  'cat-payroll': {
    description: 'Employee salaries and statutory payroll deductions.',
    status: 'active',
    color: 'emerald',
    icon: 'Wallet',
    parentId: 'cat-statutory',
    lastUpdatedAt: '2025-12-28',
  },
  'cat-marketing': {
    description: 'Advertising, campaigns, and brand spend.',
    status: 'active',
    color: 'tertiary',
    icon: 'Megaphone',
    parentId: null,
    lastUpdatedAt: '2025-11-18',
  },
  'cat-office': {
    description: 'Office supplies, stationery, and small equipment.',
    status: 'active',
    color: 'amber',
    icon: 'Paperclip',
    parentId: null,
    lastUpdatedAt: '2025-08-22',
  },
  'cat-utilities': {
    description: 'Electricity, internet, and other recurring utilities.',
    status: 'active',
    color: 'blue',
    icon: 'Zap',
    parentId: null,
    lastUpdatedAt: '2025-10-02',
  },
  'cat-professional': {
    description: 'Legal, accounting, and consulting fees.',
    status: 'inactive',
    color: 'violet',
    icon: 'Briefcase',
    parentId: null,
    lastUpdatedAt: '2025-06-11',
  },
  'cat-insurance': {
    description: 'Business and asset insurance premiums.',
    status: 'inactive',
    color: 'emerald',
    icon: 'ShieldCheck',
    parentId: null,
    lastUpdatedAt: '2025-05-30',
  },
  'cat-rent': {
    description: 'Office and facility lease payments.',
    status: 'active',
    color: 'primary',
    icon: 'Building2',
    parentId: null,
    lastUpdatedAt: '2025-09-01',
  },
}

function buildCategoryRecord(categoryId: string): CategoryRecord {
  const category = mockCategories.find((c) => c.id === categoryId)
  if (!category) throw new Error(`Unknown category id in categoryMeta: ${categoryId}`)

  const meta = categoryMeta[categoryId]
  const parentCategory = meta.parentId
    ? (mockCategories.find((c) => c.id === meta.parentId) ?? null)
    : null

  const relatedTransactions = mockTransactions.filter((txn) => txn.category?.id === categoryId)
  const merchantsAssigned = new Set(relatedTransactions.map((txn) => txn.merchant.id)).size

  return {
    id: category.id,
    name: category.name,
    description: meta.description,
    parentCategory,
    status: meta.status,
    color: meta.color,
    icon: meta.icon,
    transactionCount: relatedTransactions.length,
    merchantsAssigned,
    lastUpdatedAt: meta.lastUpdatedAt,
  }
}

export const mockCategoryRecords: readonly CategoryRecord[] = mockCategories
  .map((category) => buildCategoryRecord(category.id))
  .sort((a, b) => a.name.localeCompare(b.name))
