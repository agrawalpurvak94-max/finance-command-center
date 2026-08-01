import type { Transaction } from '@/types/transaction'

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
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

  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(','))
    .join('\n')
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
