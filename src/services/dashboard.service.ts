import type { ConnectedAccount } from '@/domain/Account'
import type {
  FinancialSnapshotMetric,
  QuickAction,
  RecentTransaction,
  ResolutionQueueItem,
} from '@/domain/Dashboard'

/**
 * Mock data source. CLAUDE.md's Module 2 contract calls for these to read
 * from vw_dashboard_summary / vw_dashboard_accounts / vw_dashboard_due_cards /
 * vw_ai_review_summary via Supabase — deferred until backend integration is
 * explicitly scheduled, per this project's "keep fake data until backend
 * integration" instruction. Only this file changes when that happens; hooks
 * and components are already written against the real interfaces.
 */

const financialSnapshot: FinancialSnapshotMetric[] = [
  {
    id: 'total-spend-mtd',
    label: 'Total Spend (MTD)',
    value: 8422190,
    trend: { direction: 'up', label: '12.4% vs last month', tone: 'negative' },
  },
  {
    id: 'total-income-mtd',
    label: 'Total Income (MTD)',
    value: 14208500,
    trend: { direction: 'up', label: '8.2% vs last month', tone: 'positive' },
  },
  {
    id: 'cc-outstanding',
    label: 'CC Outstanding',
    value: 1245600,
    warningLabel: 'Due in 48h',
  },
]

const connectedAccounts: ConnectedAccount[] = [
  {
    id: 'icici-current',
    kind: 'bank',
    name: 'ICICI Current Account',
    maskedNumber: 'xxxx 1102',
    balance: 28410200,
    status: 'active',
    lastSyncedLabel: '10m ago',
    inflow: 1240000,
    outflow: 310000,
  },
  {
    id: 'kotak-treasury',
    kind: 'bank',
    name: 'Kotak Treasury Account',
    maskedNumber: 'xxxx 4001',
    balance: 12820680,
    status: 'active',
    lastSyncedLabel: '2h ago',
    inflow: 50000,
    outflow: 0,
  },
]

const creditCards: ConnectedAccount[] = [
  {
    id: 'hdfc-corporate-platinum',
    kind: 'credit_card',
    name: 'HDFC Corporate Platinum',
    maskedNumber: 'xxxx 8829',
    balance: 842100,
    status: 'urgent',
    dueDate: '28 Oct',
    dueAmount: 842100,
    dailyAverage: 42000,
  },
]

const resolutionQueue: ResolutionQueueItem[] = [
  {
    id: 'txn-amazon-pay',
    reason: 'uncategorized',
    reasonLabel: 'Uncategorized',
    description: 'Amazon Pay (Retail & Ent.)',
    amount: 4200,
    flaggedOnLabel: 'Oct 24',
  },
  {
    id: 'txn-swiggy',
    reason: 'missing_gst',
    reasonLabel: 'Missing GST',
    description: 'Swiggy Ltd (Vendor: Bundl)',
    amount: 890.5,
    flaggedOnLabel: 'Oct 25',
  },
  {
    id: 'txn-tds',
    reason: 'tag_required',
    reasonLabel: 'Tag Required',
    description: 'TDS Payment - Q3 Filing',
    amount: 145000,
    flaggedOnLabel: 'Oct 26',
  },
]

const recentTransactions: RecentTransaction[] = [
  {
    id: 'txn-gcp',
    dateLabel: '26 Oct',
    merchant: 'Google Cloud Platform',
    category: 'Software/SaaS',
    amount: 45210,
    status: 'processed',
  },
  {
    id: 'txn-starbucks',
    dateLabel: '26 Oct',
    merchant: 'Starbucks Corporate',
    category: 'F&B',
    amount: 1240,
    status: 'pending',
  },
  {
    id: 'txn-hdfc-insurance',
    dateLabel: '25 Oct',
    merchant: 'HDFC Insurance Ltd',
    category: 'Statutory',
    amount: 1200000,
    status: 'processed',
  },
  {
    id: 'txn-uber',
    dateLabel: '25 Oct',
    merchant: 'Uber India Tech',
    category: 'Travel',
    amount: 480,
    status: 'flagged',
  },
  {
    id: 'txn-aws',
    dateLabel: '24 Oct',
    merchant: 'Amazon AWS Services',
    category: 'Cloud',
    amount: 112000,
    status: 'processed',
  },
]

const quickActions: QuickAction[] = [
  { id: 'add-transaction', label: 'Add Transaction', href: '/transactions' },
  { id: 'add-client', label: 'Add Client', href: '/clients' },
  { id: 'add-merchant', label: 'Add Merchant', href: '/merchants' },
  { id: 'new-report', label: 'New Report', href: '/analytics' },
]

function withLatency<T>(data: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), 300))
}

export const dashboardService = {
  getFinancialSnapshot: () => withLatency(financialSnapshot),
  getConnectedAccounts: () => withLatency(connectedAccounts),
  getCreditCards: () => withLatency(creditCards),
  getResolutionQueue: () => withLatency(resolutionQueue),
  getRecentTransactions: () => withLatency(recentTransactions),
  getQuickActions: () => withLatency(quickActions),
}
