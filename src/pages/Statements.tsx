import { useMemo, useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { StatementsHeader } from '@/components/statements/StatementsHeader'
import { StatementFilters } from '@/components/statements/StatementFilters'
import { StatementSummaryWidget } from '@/components/statements/StatementSummaryWidget'
import { StatementTable } from '@/components/statements/StatementTable'
import { StatementTableSkeleton } from '@/components/statements/StatementTableSkeleton'
import { StatementDetailsDrawer } from '@/components/statements/StatementDetailsDrawer'
import { UploadStatementDialog } from '@/components/statements/UploadStatementDialog'
import {
  useCreateStatement,
  useDeleteStatement,
  useReprocessStatement,
  useStatementsList,
  useStatementsSummary,
} from '@/hooks/useStatements'
import { useTransactionAccounts, useTransactionClients } from '@/hooks/useTransactions'
import type {
  Statement,
  StatementFilters as StatementFiltersType,
  StatementSort,
} from '@/domain/Statement'

const emptyFilters: StatementFiltersType = {}

export function Statements() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<StatementSort | undefined>({ id: 'statementDate', desc: true })
  const [draftFilters, setDraftFilters] = useState<StatementFiltersType>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<StatementFiltersType>(emptyFilters)
  const [selectedStatement, setSelectedStatement] = useState<Statement | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Statement | null>(null)
  const [reprocessingId, setReprocessingId] = useState<string | null>(null)

  const accountsQuery = useTransactionAccounts()
  const clientsQuery = useTransactionClients()

  const bankNames = useMemo(
    () => Array.from(new Set((accountsQuery.data ?? []).map((a) => a.bankName))).sort(),
    [accountsQuery.data],
  )

  const summaryQuery = useStatementsSummary()
  const listQuery = useStatementsList({
    page,
    pageSize,
    search: search || undefined,
    sort,
    filters: appliedFilters,
  })

  const createStatement = useCreateStatement()
  const reprocessStatement = useReprocessStatement()
  const deleteStatement = useDeleteStatement()

  function handleOpenDetails(statement: Statement) {
    setSelectedStatement(statement)
    setDrawerOpen(true)
  }

  function handleReprocess(statement: Statement) {
    setReprocessingId(statement.id)
    reprocessStatement.mutate(statement.id, {
      onSettled: () => setReprocessingId(null),
    })
  }

  return (
    <PageContainer className="flex flex-col gap-md">
      <StatementsHeader
        onUpload={() => setUploadOpen(true)}
        onRefresh={() => {
          void listQuery.refetch()
          void summaryQuery.refetch()
        }}
        isRefreshing={listQuery.isFetching || summaryQuery.isFetching}
      />

      <StatementSummaryWidget query={summaryQuery} />

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
          placeholder="Search statements…"
          className="pl-9"
          aria-label="Search statements"
        />
      </div>

      <StatementFilters
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
        bankNames={bankNames}
        clients={clientsQuery.data ?? []}
      />

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-bold text-foreground">
            {listQuery.data ? (page - 1) * pageSize + 1 : 0}–
            {listQuery.data ? Math.min(page * pageSize, listQuery.data.total) : 0}
          </span>{' '}
          of {listQuery.data?.total ?? 0} statements
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <QueryBoundary
          query={listQuery}
          skeleton={<StatementTableSkeleton rows={pageSize} />}
          isEmpty={(data) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={FileText}
              title={
                search || Object.keys(appliedFilters).length > 0
                  ? 'No statements match these filters'
                  : 'No statements yet'
              }
              description={
                search || Object.keys(appliedFilters).length > 0
                  ? 'Try clearing filters or search to see more results.'
                  : 'Upload a bank or credit card statement to get started.'
              }
              action={{ label: 'Clear filters', href: '/statements' }}
            />
          }
        >
          {(data) => (
            <StatementTable
              statements={data.rows}
              sort={sort}
              onSortChange={(next) => {
                setSort(next)
                setPage(1)
              }}
              onOpenDetails={handleOpenDetails}
              onReprocess={handleReprocess}
              onDelete={(statement) => setDeleteTarget(statement)}
              reprocessingId={reprocessingId}
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

      <StatementDetailsDrawer
        statement={selectedStatement}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />

      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        accounts={accountsQuery.data ?? []}
        isPending={createStatement.isPending}
        onSubmit={(input) => {
          createStatement.mutate(input)
          setUploadOpen(false)
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this statement?"
        description={deleteTarget ? `${deleteTarget.fileName} — this cannot be undone.` : ''}
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteStatement.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteStatement.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </PageContainer>
  )
}

export default Statements
