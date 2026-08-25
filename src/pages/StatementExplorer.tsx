import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { PageContainer } from '@/layouts/PageContainer'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CircleAlert, FileStack } from 'lucide-react'
import { StatementsTabBar } from '@/components/statements/StatementsTabBar'
import {
  StatementSelector,
  ALL_STATEMENTS_VALUE,
} from '@/components/statements/explorer/StatementSelector'
import { StatementExplorerSummary } from '@/components/statements/explorer/StatementExplorerSummary'
import { StatementIdentityBar } from '@/components/statements/explorer/StatementIdentityBar'
import { StatementTransactionFilters } from '@/components/statements/explorer/StatementTransactionFilters'
import { StatementTransactionTable } from '@/components/statements/explorer/StatementTransactionTable'
import { StatementTransactionDrawer } from '@/components/statements/explorer/StatementTransactionDrawer'
import {
  useStatementExplorerDetail,
  useStatementSelectorOptions,
  useStatementTransactions,
  useAllStatementTransactions,
  useUpdateStatementTransactionCategory,
  useUpdateStatementTransactionClient,
  useUpdateStatementTransactionOwnerType,
} from '@/hooks/useStatementExplorer'
import { useTransactionCategories, useTransactionClients } from '@/hooks/useTransactions'
import { useCategoriesList } from '@/hooks/useCategories'
import type { CategoryVisual } from '@/components/merchants/MerchantCategoryControl'
import type {
  StatementTransactionFilters as FiltersType,
  StatementTransactionRow,
} from '@/domain/StatementTransaction'
import type { OwnerType } from '@/domain/Transaction'

const emptyFilters: FiltersType = {}

function matchesFilters(
  row: StatementTransactionRow,
  search: string,
  filters: FiltersType,
): boolean {
  if (search) {
    const needle = search.toLowerCase()
    const haystack =
      `${row.merchant} ${row.normalizedMerchant ?? ''} ${row.rawDescription ?? ''}`.toLowerCase()
    if (!haystack.includes(needle)) return false
  }
  if (filters.category && row.category !== filters.category) return false
  if (filters.uncategorizedOnly && row.category && row.category !== 'Uncategorized') return false
  if (filters.type && row.type !== filters.type) return false
  if (filters.categorySource && row.categorySource !== filters.categorySource) return false
  if (filters.status && row.status !== filters.status) return false
  if (filters.clientId && row.clientId !== filters.clientId) return false
  if (filters.ownerType && row.ownerType !== filters.ownerType) return false
  if (filters.dateFrom && row.date < filters.dateFrom) return false
  if (filters.dateTo && row.date > filters.dateTo) return false
  if (filters.confidenceTier) {
    if (row.confidence === null) return false
    if (filters.confidenceTier === 'high' && row.confidence < 80) return false
    if (filters.confidenceTier === 'medium' && (row.confidence < 50 || row.confidence >= 80))
      return false
    if (filters.confidenceTier === 'low' && row.confidence >= 50) return false
  }
  return true
}

/** Reads drill-down query params into initial filter/search state — from Statement Analytics' handleDrillDown, or Merchant Center's "Uncategorized Merchants" KPI tile (`?uncategorized=1`). */
function readInitialState(searchParams: URLSearchParams): { search: string; filters: FiltersType } {
  const filters: {
    category?: string
    clientId?: string
    type?: 'debit' | 'credit'
    ownerType?: OwnerType
    dateFrom?: string
    dateTo?: string
    uncategorizedOnly?: boolean
  } = {}
  const category = searchParams.get('category')
  if (category) filters.category = category
  const clientId = searchParams.get('clientId')
  if (clientId) filters.clientId = clientId
  const type = searchParams.get('type')
  if (type === 'debit' || type === 'credit') filters.type = type
  const ownerType = searchParams.get('ownerType')
  if (ownerType === 'business' || ownerType === 'personal') filters.ownerType = ownerType
  const dateFrom = searchParams.get('dateFrom')
  if (dateFrom) filters.dateFrom = dateFrom
  const dateTo = searchParams.get('dateTo')
  if (dateTo) filters.dateTo = dateTo
  // Drill-down from Merchant Center's "Uncategorized Merchants" KPI tile.
  if (searchParams.get('uncategorized') === '1') filters.uncategorizedOnly = true
  return { search: searchParams.get('merchant') ?? '', filters }
}

/**
 * Statement Explorer (Statements module, Tab 2). Two modes, same page:
 * - `/statements/:statementId` — every figure belongs to exactly ONE
 *   statement; switching the selector changes the URL.
 * - `/statements/explorer` (no id) — every statement_transactions row the
 *   user has, across every statement; this is the drill-down destination
 *   for Statement Analytics (Tab 3), never `/transactions`.
 * Reads `statement_transactions` only, filtered by `statement_id`; never
 * sums those rows into a total that duplicates `statements.total_debits/
 * total_credits` (see statement-explorer.service.ts's header comment).
 */
export function StatementExplorer() {
  const { statementId } = useParams<{ statementId?: string }>()
  const isAllMode = !statementId
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const initial = useMemo(() => readInitialState(searchParams), [searchParams])
  const [search, setSearch] = useState(initial.search)
  const [filters, setFilters] = useState<FiltersType>(initial.filters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [selectedRow, setSelectedRow] = useState<StatementTransactionRow | null>(null)

  const selectorQuery = useStatementSelectorOptions()
  const detailQuery = useStatementExplorerDetail(statementId)
  const singleTxnQuery = useStatementTransactions(statementId)
  const allTxnQuery = useAllStatementTransactions()
  const transactionsQuery = isAllMode ? allTxnQuery : singleTxnQuery
  const masterCategoriesQuery = useTransactionCategories()
  const masterClientsQuery = useTransactionClients()
  const updateCategory = useUpdateStatementTransactionCategory(statementId)
  const updateClient = useUpdateStatementTransactionClient(statementId)
  const updateOwnerType = useUpdateStatementTransactionOwnerType(statementId)

  // Read-only icon/color enrichment for the Category column's display —
  // the selectable options themselves still come from masterCategoriesQuery
  // above, unchanged. Keyed by name (not id) because
  // StatementTransactionRow.category is free text, not a category
  // reference — same "large pageSize stands in for all categories" pattern
  // Merchants.tsx already uses for its own category-visual enrichment.
  const categoryRecordsQuery = useCategoriesList({ page: 1, pageSize: 200 })
  const categoryVisualsByName = useMemo<ReadonlyMap<string, CategoryVisual>>(() => {
    const rows = categoryRecordsQuery.data?.rows ?? []
    return new Map(rows.map((c) => [c.name, { color: c.color, icon: c.icon }]))
  }, [categoryRecordsQuery.data])

  // In "All Statements" mode the drawer's account/statement context is
  // per-ROW (each row can belong to a different statement), so it's fetched
  // on demand for whichever row is selected — reusing the same detail hook
  // the single-statement mode uses, just keyed by that row's own statementId.
  const rowDetailQuery = useStatementExplorerDetail(
    isAllMode ? selectedRow?.statementId : undefined,
  )

  const filteredRows = useMemo(() => {
    const rows = transactionsQuery.data ?? []
    return rows.filter((row) => matchesFilters(row, search, filters))
  }, [transactionsQuery.data, search, filters])

  // `selectedRow` is a snapshot captured at click time — re-resolve it
  // against the live query data so the drawer's InlineSelectors reflect a
  // category/client edit made from inside the drawer itself, not a stale copy.
  const liveSelectedRow = selectedRow
    ? (transactionsQuery.data?.find((r) => r.id === selectedRow.id) ?? selectedRow)
    : null

  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * pageSize, page * pageSize),
    [filteredRows, page, pageSize],
  )

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (transactionsQuery.data ?? []).map((r) => r.category).filter((c): c is string => !!c),
        ),
      ).sort(),
    [transactionsQuery.data],
  )
  const categorySourceOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (transactionsQuery.data ?? [])
            .map((r) => r.categorySource)
            .filter((c): c is string => !!c),
        ),
      ).sort(),
    [transactionsQuery.data],
  )
  const statusOptions = useMemo(
    () => Array.from(new Set((transactionsQuery.data ?? []).map((r) => r.status))).sort(),
    [transactionsQuery.data],
  )

  const { debitCount, creditCount, topCategory, topMerchant } = useMemo(() => {
    const rows = transactionsQuery.data ?? []
    let debits = 0
    let credits = 0
    const categorySpend = new Map<string, number>()
    const merchantSpend = new Map<string, number>()
    for (const r of rows) {
      if (r.type === 'debit') {
        debits += 1
        if (r.category)
          categorySpend.set(r.category, (categorySpend.get(r.category) ?? 0) + r.amount)
        merchantSpend.set(r.merchant, (merchantSpend.get(r.merchant) ?? 0) + r.amount)
      } else {
        credits += 1
      }
    }
    const top = (m: Map<string, number>) => {
      let best: [string, number] | null = null
      for (const entry of m) if (!best || entry[1] > best[1]) best = entry
      return best?.[0] ?? null
    }
    return {
      debitCount: debits,
      creditCount: credits,
      topCategory: top(categorySpend),
      topMerchant: top(merchantSpend),
    }
  }, [transactionsQuery.data])

  function handleUpdateCategory(rowId: string, category: string) {
    updateCategory.mutate({ id: rowId, category })
  }

  function handleUpdateClient(rowId: string, clientId: string | null) {
    updateClient.mutate({ id: rowId, clientId })
  }

  function handleUpdateOwnerType(rowId: string, ownerType: OwnerType) {
    updateOwnerType.mutate({ id: rowId, ownerType })
  }

  function handleSelectStatement(id: string) {
    setSearch('')
    setFilters(emptyFilters)
    setPage(1)
    navigate(id === ALL_STATEMENTS_VALUE ? '/statements/explorer' : `/statements/${id}`)
  }

  return (
    <PageContainer className="flex flex-col gap-md">
      <div className="flex flex-col gap-md sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-headline-lg text-foreground">Statement Intelligence</h1>
          <p className="text-body-sm text-muted-foreground">
            {isAllMode
              ? 'Every transaction extracted from every statement.'
              : 'Explore every transaction extracted from this statement.'}
          </p>
        </div>
        <StatementSelector
          options={selectorQuery.data ?? []}
          value={statementId ?? ALL_STATEMENTS_VALUE}
          onChange={handleSelectStatement}
          isLoading={selectorQuery.isLoading}
          includeAllOption
        />
      </div>

      <StatementsTabBar active="explorer" explorerHref="/statements/explorer" />

      {!isAllMode && detailQuery.data && <StatementIdentityBar detail={detailQuery.data} />}

      {!isAllMode && detailQuery.isLoading && (
        <div className="flex flex-col gap-md">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
        </div>
      )}

      {!isAllMode && detailQuery.isError && (
        <div className="flex flex-1 flex-col items-center justify-center gap-sm px-lg py-xl text-center">
          <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
          <p className="text-body-md font-medium text-foreground">Couldn't load this statement</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-sm"
            onClick={() => detailQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      )}

      {!isAllMode &&
        !detailQuery.isLoading &&
        !detailQuery.isError &&
        detailQuery.data === null && (
          <EmptyState
            icon={FileStack}
            title="Statement not found"
            description="This statement may have been deleted, or the link is no longer valid."
            action={{ label: 'Back to Statement Control', href: '/statements' }}
          />
        )}

      {(isAllMode || detailQuery.data) && (
        <>
          {!isAllMode && detailQuery.data && (
            <StatementExplorerSummary
              detail={detailQuery.data}
              transactionCount={transactionsQuery.data?.length ?? 0}
              debitCount={debitCount}
              creditCount={creditCount}
              topCategory={topCategory}
              topMerchant={topMerchant}
            />
          )}

          <StatementTransactionFilters
            search={search}
            onSearchChange={(v) => {
              setSearch(v)
              setPage(1)
            }}
            filters={filters}
            onFiltersChange={(patch) => {
              setFilters((prev) => ({ ...prev, ...patch }))
              setPage(1)
            }}
            onClear={() => {
              setFilters(emptyFilters)
              setPage(1)
            }}
            categoryOptions={categoryOptions}
            categorySourceOptions={categorySourceOptions}
            statusOptions={statusOptions}
            clientOptions={masterClientsQuery.data ?? []}
          />

          <div className="text-body-sm text-muted-foreground">
            {transactionsQuery.isLoading
              ? 'Loading…'
              : `${filteredRows.length} of ${transactionsQuery.data?.length ?? 0} statement transactions`}
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-card">
            {transactionsQuery.isError ? (
              <p className="p-xl text-center text-body-sm text-destructive">
                Couldn't load statement transactions. Try refreshing the page.
              </p>
            ) : (
              <StatementTransactionTable
                rows={pagedRows}
                isLoading={transactionsQuery.isLoading}
                onOpenRow={setSelectedRow}
                categoryOptions={masterCategoriesQuery.data ?? []}
                categoryVisualsByName={categoryVisualsByName}
                onUpdateCategory={handleUpdateCategory}
                clientOptions={masterClientsQuery.data ?? []}
                onUpdateClient={handleUpdateClient}
                onUpdateOwnerType={handleUpdateOwnerType}
              />
            )}
          </div>

          {filteredRows.length > 0 && (
            <Pagination
              page={page}
              pageSize={pageSize}
              totalItems={filteredRows.length}
              pageSizeOptions={[25, 50, 100]}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
            />
          )}

          <StatementTransactionDrawer
            row={liveSelectedRow}
            detail={isAllMode ? (rowDetailQuery.data ?? null) : (detailQuery.data ?? null)}
            onOpenChange={(open) => !open && setSelectedRow(null)}
            categoryOptions={masterCategoriesQuery.data ?? []}
            onUpdateCategory={handleUpdateCategory}
            clientOptions={masterClientsQuery.data ?? []}
            onUpdateClient={handleUpdateClient}
            onUpdateOwnerType={handleUpdateOwnerType}
          />
        </>
      )}
    </PageContainer>
  )
}

export default StatementExplorer
