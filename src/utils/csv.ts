import type { Transaction } from '@/domain/Transaction'
import type { CategoryRecord } from '@/domain/Category'
import type { MerchantRecord } from '@/domain/Merchant'
import type { ClientRecord } from '@/domain/Client'
import type { Statement } from '@/domain/Statement'
import type { AnalyticsRankedRow } from '@/domain/Analytics'

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function rowsToCsv(headers: readonly string[], rows: readonly (readonly unknown[])[]): string {
  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','))
    .join('\n')
}

export function transactionsToCsv(transactions: readonly Transaction[]): string {
  const headers = [
    'Date',
    'Merchant',
    'Category',
    'Client',
    'Bank/Card',
    'Business/Personal',
    'Amount',
    'Status',
    'Notes',
  ]

  const rows = transactions.map((txn) => [
    txn.date,
    txn.merchant.name,
    txn.category?.name ?? 'Uncategorized',
    txn.client?.name ?? '',
    `${txn.account.bankName} ${txn.account.last4}`,
    txn.ownerType,
    txn.amount.toFixed(2),
    txn.status,
    txn.notes ?? '',
  ])

  return rowsToCsv(headers, rows)
}

export function categoriesToCsv(categories: readonly CategoryRecord[]): string {
  const headers = [
    'Category Name',
    'Parent Category',
    'Description',
    'Transaction Count',
    'Merchants Assigned',
    'Status',
    'Last Updated',
  ]

  const rows = categories.map((category) => [
    category.name,
    category.parentCategory?.name ?? '',
    category.description,
    category.transactionCount,
    category.merchantsAssigned,
    category.status,
    category.lastUpdatedAt,
  ])

  return rowsToCsv(headers, rows)
}

export function merchantsToCsv(merchants: readonly MerchantRecord[]): string {
  const headers = [
    'Merchant Name',
    'Default Category',
    'Transaction Count',
    'Total Spend',
    'Average Transaction',
    'Last Transaction',
    'Status',
  ]

  const rows = merchants.map((merchant) => [
    merchant.name,
    merchant.defaultCategory?.name ?? 'Uncategorized',
    merchant.transactionCount,
    merchant.totalSpend.toFixed(2),
    merchant.averageTransaction.toFixed(2),
    merchant.lastTransactionAt ?? '',
    merchant.status,
  ])

  return rowsToCsv(headers, rows)
}

export function clientsToCsv(clients: readonly ClientRecord[]): string {
  const headers = [
    'Client Name',
    'Email',
    'Company',
    'Phone',
    'Status',
    'Total Spend',
    'Transactions',
    'Accounts',
    'Cards',
    'Created Date',
  ]

  const rows = clients.map((client) => [
    client.name,
    client.email ?? '',
    client.company ?? '',
    client.phone ?? '',
    client.status,
    client.totalSpend.toFixed(2),
    client.transactionCount,
    client.linkedAccountsCount,
    client.linkedCreditCardsCount,
    client.createdAt,
  ])

  return rowsToCsv(headers, rows)
}

export function statementsToCsv(statements: readonly Statement[]): string {
  const headers = [
    'Statement Date',
    'Period',
    'Account',
    'Client',
    'Status',
    'Transactions Extracted',
    'Imported At',
  ]

  const rows = statements.map((stmt) => [
    stmt.statementDate,
    stmt.statementPeriodLabel,
    `${stmt.account.bankName} ${stmt.account.last4}`,
    stmt.client?.name ?? '',
    stmt.status,
    stmt.transactionsExtracted,
    stmt.importedAt,
  ])

  return rowsToCsv(headers, rows)
}

/** Generic exporter for every Analytics ranked-row dataset (Category/Merchant/
 * Client/Card summaries and every secondary-analytics table) — one function
 * instead of a bespoke CSV shape per widget, since they all share the same
 * `AnalyticsRankedRow` shape. */
export function analyticsRowsToCsv(
  rows: readonly AnalyticsRankedRow[],
  valueColumnLabel: string,
  secondaryColumnLabel?: string,
): string {
  const headers = secondaryColumnLabel
    ? ['Label', 'Detail', valueColumnLabel, secondaryColumnLabel]
    : ['Label', 'Detail', valueColumnLabel]

  const rows_ = rows.map((row) =>
    secondaryColumnLabel
      ? [row.label, row.sublabel ?? '', row.valueLabel, row.secondaryLabel ?? '']
      : [row.label, row.sublabel ?? '', row.valueLabel],
  )

  return rowsToCsv(headers, rows_)
}

export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
