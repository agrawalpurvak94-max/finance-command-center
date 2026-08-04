import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Store } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { MerchantsHeader } from '@/components/merchants/MerchantsHeader'
import { MerchantFilters } from '@/components/merchants/MerchantFilters'
import { MerchantSummaryWidget } from '@/components/merchants/MerchantSummaryWidget'
import { MerchantTable } from '@/components/merchants/MerchantTable'
import { MerchantTableSkeleton } from '@/components/merchants/MerchantTableSkeleton'
import { MerchantFormDialog } from '@/components/merchants/MerchantFormDialog'
import {
  useCreateMerchant,
  useDeleteMerchant,
  useMerchantsList,
  useMerchantsSummary,
  useUpdateMerchant,
} from '@/hooks/useMerchants'
import { useTransactionCategories } from '@/hooks/useTransactions'
import { downloadCsv, merchantsToCsv } from '@/utils/csv'
import type {
  MerchantFilters as MerchantFiltersType,
  MerchantRecord,
  MerchantSort,
} from '@/domain/Merchant'

const emptyFilters: MerchantFiltersType = {}

export function Merchants() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<MerchantSort | undefined>({ id: 'name', desc: false })
  const [draftFilters, setDraftFilters] = useState<MerchantFiltersType>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<MerchantFiltersType>(emptyFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [editingMerchant, setEditingMerchant] = useState<MerchantRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<MerchantRecord | null>(null)

  const categoriesQuery = useTransactionCategories()

  const summaryQuery = useMerchantsSummary()
  const listQuery = useMerchantsList({
    page,
    pageSize,
    search: search || undefined,
    sort,
    filters: appliedFilters,
  })

  const createMerchant = useCreateMerchant()
  const updateMerchant = useUpdateMerchant()
  const deleteMerchant = useDeleteMerchant()

  function handleAddMerchant() {
    setEditingMerchant(null)
    setFormOpen(true)
  }

  function handleEditMerchant(merchant: MerchantRecord) {
    setEditingMerchant(merchant)
    setFormOpen(true)
  }

  function handleChangeCategory(merchant: MerchantRecord, categoryId: string | null) {
    updateMerchant.mutate({
      id: merchant.id,
      input: {
        name: merchant.name,
        defaultCategoryId: categoryId,
        status: merchant.status,
        notes: merchant.notes,
      },
    })
  }

  function handleViewTransactions(merchant: MerchantRecord) {
    navigate(`/transactions?merchantId=${encodeURIComponent(merchant.id)}`)
  }

  function handleExport() {
    if (!listQuery.data) return
    downloadCsv('merchants.csv', merchantsToCsv(listQuery.data.rows))
  }

  const hasActiveFiltersOrSearch = !!search || Object.keys(appliedFilters).length > 0

  return (
    <PageContainer className="flex flex-col gap-md">
      <MerchantsHeader
        onAddMerchant={handleAddMerchant}
        onExport={handleExport}
        isExportDisabled={!listQuery.data || listQuery.data.rows.length === 0}
      />

      <MerchantSummaryWidget query={summaryQuery} />

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
          placeholder="Search merchants…"
          className="pl-9"
          aria-label="Search merchants"
        />
      </div>

      <MerchantFilters
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
      />

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-bold text-foreground">
            {listQuery.data ? (page - 1) * pageSize + 1 : 0}–
            {listQuery.data ? Math.min(page * pageSize, listQuery.data.total) : 0}
          </span>{' '}
          of {listQuery.data?.total ?? 0} merchants
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <QueryBoundary
          query={listQuery}
          skeleton={<MerchantTableSkeleton rows={pageSize} />}
          isEmpty={(data) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={Store}
              title={
                hasActiveFiltersOrSearch
                  ? search
                    ? 'No merchants match your search'
                    : 'No merchants match these filters'
                  : 'No merchants yet'
              }
              description={
                hasActiveFiltersOrSearch
                  ? 'Try clearing the search or filters to see more results.'
                  : 'Merchants appear automatically as transactions are captured.'
              }
              action={{ label: 'Clear filters', href: '/merchants' }}
            />
          }
        >
          {(data) => (
            <MerchantTable
              merchants={data.rows}
              sort={sort}
              onSortChange={(next) => {
                setSort(next)
                setPage(1)
              }}
              onViewTransactions={handleViewTransactions}
              onEdit={handleEditMerchant}
              onChangeCategory={handleChangeCategory}
              onDelete={(merchant) => setDeleteTarget(merchant)}
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

      <MerchantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        merchant={editingMerchant}
        categories={categoriesQuery.data ?? []}
        isPending={createMerchant.isPending || updateMerchant.isPending}
        onSubmit={(input) => {
          if (editingMerchant) {
            updateMerchant.mutate(
              { id: editingMerchant.id, input },
              { onSuccess: () => setFormOpen(false) },
            )
          } else {
            createMerchant.mutate(input, { onSuccess: () => setFormOpen(false) })
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this merchant?"
        description={
          deleteTarget
            ? `${deleteTarget.name} — this cannot be undone. Transactions already recorded against it are unaffected.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteMerchant.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMerchant.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </PageContainer>
  )
}

export default Merchants
