import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import type { RowSelectionState } from '@tanstack/react-table'
import { Search, Receipt } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { FloatingActionButton } from '@/components/FloatingActionButton'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ActiveFilterBanner } from '@/components/ActiveFilterBanner'
import { TransactionsHeader } from '@/components/transactions/TransactionsHeader'
import { FilterToolbar } from '@/components/transactions/FilterToolbar'
import { BulkActionToolbar } from '@/components/transactions/BulkActionToolbar'
import { TransactionTable } from '@/components/transactions/TransactionTable'
import { TransactionTableSkeleton } from '@/components/transactions/TransactionTableSkeleton'
import { TransactionDetailsDrawer } from '@/components/transactions/TransactionDetailsDrawer'
import { NewTransactionDialog } from '@/components/transactions/NewTransactionDialog'
import {
  useBulkDeleteTransactions,
  useBulkUpdateTransactions,
  useCreateTransaction,
  useTransactionAccounts,
  useTransactionCategories,
  useTransactionClients,
  useTransactionMerchants,
  useTransactionsList,
  useUpdateTransaction,
} from '@/hooks/useTransactions'
import { downloadCsv, transactionsToCsv } from '@/utils/csv'
import type { Transaction, TransactionFilters, TransactionSort } from '@/domain/Transaction'
import type { TransactionAccount } from '@/domain/Account'

const emptyFilters: TransactionFilters = {}

type FilterKey = keyof TransactionFilters
const NUMERIC_FILTER_KEYS: readonly FilterKey[] = ['amountMin', 'amountMax']

// Drill-down entry points other modules navigate here with (e.g. Categories'
// and Merchants' "View Transactions" row actions, or Analytics' Export/chart
// drill-downs). One shared mechanism per CLAUDE.md's "do not duplicate
// business logic" — adding a module here means adding one entry to this map,
// not a second drill-down implementation. Generalized from a single param to
// every matching param present so Analytics can hand off its full stacked
// filter set in one navigation (see MODULE10_REPORT.md); Modules 8/9 already
// established the "extend this map" precedent for bankAccountId/creditCardId.
const DRILL_DOWN_LABELS: Partial<Record<FilterKey, string>> = {
  categoryId: 'category',
  merchantId: 'merchant',
  bankAccountId: 'bank account',
  creditCardId: 'credit card',
  clientId: 'client',
  dateFrom: 'from date',
  dateTo: 'to date',
  type: 'type',
  ownerType: 'biz/personal',
  paymentMode: 'payment mode',
  status: 'status',
  amountMin: 'min amount',
  amountMax: 'max amount',
}

const DRILL_DOWN_KEYS = Object.keys(DRILL_DOWN_LABELS) as FilterKey[]

function readDrillDownFromSearchParams(searchParams: URLSearchParams): TransactionFilters {
  const filters: Record<string, unknown> = {}
  for (const key of DRILL_DOWN_KEYS) {
    const raw = searchParams.get(key)
    if (raw === null || raw === '') continue
    filters[key] = NUMERIC_FILTER_KEYS.includes(key) ? Number(raw) : raw
  }
  return filters as TransactionFilters
}

function accountDrillDownLabel(accounts: readonly TransactionAccount[], id: string): string {
  const account = accounts.find((a) => a.id === id)
  return account ? `${account.bankName} •••• ${account.last4}` : id
}

export function Transactions() {
  const [searchParams, setSearchParams] = useSearchParams()
  // Captured once on mount so clearing it doesn't reappear if the user then
  // edits filters by hand.
  const [drillDown, setDrillDown] = useState<TransactionFilters | undefined>(() => {
    const seeded = readDrillDownFromSearchParams(searchParams)
    return Object.keys(seeded).length > 0 ? seeded : undefined
  })

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<TransactionSort | undefined>({ id: 'date', desc: true })
  const [draftFilters, setDraftFilters] = useState<TransactionFilters>(
    () => drillDown ?? emptyFilters,
  )
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>(
    () => drillDown ?? emptyFilters,
  )
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [newTransactionOpen, setNewTransactionOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null)

  const categoriesQuery = useTransactionCategories()
  const clientsQuery = useTransactionClients()
  const merchantsQuery = useTransactionMerchants()
  const accountsQuery = useTransactionAccounts()

  const bankAccounts = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.kind === 'bank'),
    [accountsQuery.data],
  )
  const creditCards = useMemo(
    () => (accountsQuery.data ?? []).filter((a) => a.kind === 'credit_card'),
    [accountsQuery.data],
  )

  const listQuery = useTransactionsList({
    page,
    pageSize,
    search: search || undefined,
    sort,
    filters: appliedFilters,
  })

  const updateOne = useUpdateTransaction()
  const bulkUpdate = useBulkUpdateTransactions()
  const bulkDelete = useBulkDeleteTransactions()
  const createTransaction = useCreateTransaction()

  const selectedIds = useMemo(
    () => Object.keys(rowSelection).filter((id) => rowSelection[id]),
    [rowSelection],
  )

  function handleOpenDetails(transaction: Transaction) {
    setSelectedTransaction(transaction)
    setDrawerOpen(true)
  }

  function handleExportCurrentPage() {
    if (!listQuery.data) return
    downloadCsv(`transactions-page-${page}.csv`, transactionsToCsv(listQuery.data.rows))
  }

  function handleExportSelected() {
    const rows = (listQuery.data?.rows ?? []).filter((txn) => selectedIds.includes(txn.id))
    downloadCsv('transactions-selected.csv', transactionsToCsv(rows))
  }

  function handleClearDrillDown() {
    if (!drillDown) return
    const keys = Object.keys(drillDown) as FilterKey[]
    setDrillDown(undefined)
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setPage(1)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const key of keys) next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  function resolveDrillDownLabel(): string | null {
    if (!drillDown) return null
    const parts: string[] = []
    for (const key of Object.keys(drillDown) as FilterKey[]) {
      const value = drillDown[key]
      if (value === undefined) continue
      const label = DRILL_DOWN_LABELS[key] ?? key
      let displayValue: string
      switch (key) {
        case 'categoryId':
          displayValue = categoriesQuery.data?.find((c) => c.id === value)?.name ?? String(value)
          break
        case 'merchantId':
          displayValue = merchantsQuery.data?.find((m) => m.id === value)?.name ?? String(value)
          break
        case 'clientId':
          displayValue = clientsQuery.data?.find((c) => c.id === value)?.name ?? String(value)
          break
        case 'bankAccountId':
        case 'creditCardId':
          displayValue = accountDrillDownLabel(accountsQuery.data ?? [], String(value))
          break
        default:
          displayValue = String(value)
      }
      parts.push(`${label}: ${displayValue}`)
    }
    return parts.join(', ')
  }

  const drillDownLabel = resolveDrillDownLabel()

  return (
    <PageContainer className="flex flex-col gap-md">
      <TransactionsHeader
        onExportCsv={handleExportCurrentPage}
        onNewTransaction={() => setNewTransactionOpen(true)}
      />

      {drillDown && (
        <ActiveFilterBanner
          label={`Filtered by ${drillDownLabel}`}
          onClear={handleClearDrillDown}
        />
      )}

      <div className="relative max-w-96">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          placeholder="Search transactions…"
          className="pl-9"
          aria-label="Search transactions"
        />
      </div>

      <FilterToolbar
        draft={draftFilters}
        onChange={(patch) => setDraftFilters((prev) => ({ ...prev, ...patch }))}
        onApply={() => {
          setAppliedFilters(draftFilters)
          setPage(1)
        }}
        onClear={() => {
          setDraftFilters(emptyFilters)
          setAppliedFilters(emptyFilters)
          setPage(1)
        }}
        categories={categoriesQuery.data ?? []}
        clients={clientsQuery.data ?? []}
        merchants={merchantsQuery.data ?? []}
        bankAccounts={bankAccounts}
        creditCards={creditCards}
      />

      <BulkActionToolbar
        selectedCount={selectedIds.length}
        categories={categoriesQuery.data ?? []}
        clients={clientsQuery.data ?? []}
        merchants={merchantsQuery.data ?? []}
        isMutating={bulkUpdate.isPending || bulkDelete.isPending}
        onMarkReviewed={() => {
          bulkUpdate.mutate({ ids: selectedIds, patch: { status: 'reviewed' } })
          setRowSelection({})
        }}
        onChangeCategory={(categoryId) => {
          bulkUpdate.mutate({ ids: selectedIds, patch: { categoryId } })
          setRowSelection({})
        }}
        onAssignClient={(clientId) => {
          bulkUpdate.mutate({ ids: selectedIds, patch: { clientId } })
          setRowSelection({})
        }}
        onChangeMerchant={(merchantId) => {
          bulkUpdate.mutate({ ids: selectedIds, patch: { merchantId } })
          setRowSelection({})
        }}
        onAddNotes={(notes) => {
          bulkUpdate.mutate({ ids: selectedIds, patch: { notes } })
          setRowSelection({})
        }}
        onExportSelected={handleExportSelected}
        onDeleteSelected={() => {
          bulkDelete.mutate(selectedIds)
          setRowSelection({})
        }}
      />

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-bold text-foreground">
            {listQuery.data ? (page - 1) * pageSize + 1 : 0}–
            {listQuery.data ? Math.min(page * pageSize, listQuery.data.total) : 0}
          </span>{' '}
          of {listQuery.data?.total ?? 0} transactions
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <QueryBoundary
          query={listQuery}
          skeleton={<TransactionTableSkeleton rows={pageSize} />}
          isEmpty={(data) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={Receipt}
              title="No transactions match these filters"
              description="Try clearing filters or search to see more results."
              action={{ label: 'Clear filters', href: '/transactions' }}
            />
          }
        >
          {(data) => (
            <TransactionTable
              transactions={data.rows}
              sort={sort}
              onSortChange={(next) => {
                setSort(next)
                setPage(1)
              }}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
              onOpenDetails={handleOpenDetails}
              onDeleteOne={(txn) => setDeleteTarget(txn)}
              onUpdateOne={(id, patch) => updateOne.mutate({ id, patch })}
            />
          )}
        </QueryBoundary>
      </div>

      {listQuery.data && (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalItems={listQuery.data.total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      )}

      <FloatingActionButton
        label="Quick Add Transaction"
        onClick={() => setNewTransactionOpen(true)}
      />

      <TransactionDetailsDrawer
        transaction={selectedTransaction}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onUpdate={(id, patch) => updateOne.mutate({ id, patch })}
      />

      <NewTransactionDialog
        open={newTransactionOpen}
        onOpenChange={setNewTransactionOpen}
        accounts={accountsQuery.data ?? []}
        categories={categoriesQuery.data ?? []}
        clients={clientsQuery.data ?? []}
        isPending={createTransaction.isPending}
        onSubmit={(input) => {
          createTransaction.mutate(input)
          setNewTransactionOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this transaction?"
        description={deleteTarget ? `${deleteTarget.merchant.name} — this cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        isPending={bulkDelete.isPending}
        onConfirm={() => {
          if (deleteTarget) bulkDelete.mutate([deleteTarget.id])
          setDeleteTarget(null)
        }}
      />
    </PageContainer>
  )
}

export default Transactions
