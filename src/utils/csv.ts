import type { Transaction } from '@/domain/Transaction'
import type { CategoryRecord } from '@/domain/Category'

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
