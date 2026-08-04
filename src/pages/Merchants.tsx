import { useCallback, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Store } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Toast } from '@/components/Toast'
import { MerchantsHeader } from '@/components/merchants/MerchantsHeader'
import { MerchantFilters } from '@/components/merchants/MerchantFilters'
import { MerchantSummaryWidget } from '@/components/merchants/MerchantSummaryWidget'
import { MerchantTable } from '@/components/merchants/MerchantTable'
import { MerchantTableSkeleton } from '@/components/merchants/MerchantTableSkeleton'
import { MerchantFormDialog } from '@/components/merchants/MerchantFormDialog'
import { MerchantReviewDrawer } from '@/components/merchants/MerchantReviewDrawer'
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
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewingMerchant, setReviewingMerchant] = useState<MerchantRecord | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  // Base UI's Sheet only auto-restores focus when opened via its own
  // Trigger component; every dialog/drawer in this app (including this one)
  // is opened via externally-controlled state instead, so restoring focus
  // has to be done explicitly — see MerchantReviewDrawer's onClosed (fires
  // once the close transition genuinely finishes, via EntityReviewDrawer/
  // Sheet's onOpenChangeComplete).
  //
  // Storing a merchant id (not a captured DOM node) deliberately: opening
  // the drawer changes this page's state, which re-renders MerchantTable
  // with new (unmemoized) row-action callbacks, which changes its `columns`
  // useMemo, which makes TanStack Table's flexRender treat every cell as a
  // brand-new component and remount it — so a DOM ref captured at open time
  // is reliably stale by close time regardless of which of the three entry
  // points (row / name / "Review Merchant" menu item) was used. Re-querying
  // by id at restore time sidesteps that instead of trying to fix table
  // cell identity project-wide, which is out of this module's scope.
  const reviewTriggerMerchantId = useRef<string | null>(null)
  // Base UI's own scroll-lock (applied while the drawer/dialog is open)
  // clamps window.scrollY the moment it engages, and the browser never
  // auto-restores it once the lock lifts — confirmed via instrumentation
  // (scrollTo/scrollIntoView were never called; the drop happens a frame
  // before the lock's own "overflow: hidden" is even applied, so it's a
  // side effect of Base UI's internal lock, not this page's rendering).
  // That's library behavior out of this module's scope to fix generically,
  // but the table is fully obscured/inert for the whole time the drawer is
  // open anyway, so restoring the captured position on close satisfies
  // "preserves scroll position" without touching Base UI internals.
  const scrollPositionRef = useRef<number | null>(null)

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

  // The row-action handlers below are memoized with useCallback — passed
  // straight through to MerchantTable, which puts them in its `columns`
  // useMemo's dependency array. Unmemoized, they're new function references
  // on every Merchants render, which made TanStack Table's flexRender treat
  // every cell as a brand-new component and remount it on each render —
  // discovered because it broke drawer focus restoration (see
  // reviewTriggerMerchantId below) and, more visibly, reset window scroll
  // position on drawer open (the transient DOM churn briefly shrinks the
  // document, which clamps scrollY). Memoizing here removes the churn at
  // its source, scoped to this page — MerchantTable/columns themselves are
  // unchanged, and no other module's tables are touched.
  const handleEditMerchant = useCallback((merchant: MerchantRecord) => {
    setEditingMerchant(merchant)
    setFormOpen(true)
  }, [])

  const handleReviewMerchant = useCallback((merchant: MerchantRecord) => {
    reviewTriggerMerchantId.current = merchant.id
    scrollPositionRef.current = window.scrollY
    setReviewingMerchant(merchant)
    setReviewOpen(true)
  }, [])

  // TanStack Query's useMutation() returns a new wrapper object on every
  // render (isPending/isIdle/etc. tracking) — only .mutate itself is
  // referentially stable — so depending on the whole `updateMerchant`
  // object here would silently defeat this useCallback, same failure mode
  // as leaving it unmemoized. Depending on the stable .mutate specifically
  // is what actually keeps handleChangeCategory's identity fixed.
  const updateMerchantMutate = updateMerchant.mutate
  const handleChangeCategory = useCallback(
    (merchant: MerchantRecord, categoryId: string | null) => {
      updateMerchantMutate({
        id: merchant.id,
        input: {
          name: merchant.name,
          defaultCategoryId: categoryId,
          status: merchant.status,
          notes: merchant.notes,
        },
      })
    },
    [updateMerchantMutate],
  )

  const handleViewTransactions = useCallback(
    (merchant: MerchantRecord) => {
      navigate(`/transactions?merchantId=${encodeURIComponent(merchant.id)}`)
    },
    [navigate],
  )

  const handleDeleteMerchant = useCallback((merchant: MerchantRecord) => {
    setDeleteTarget(merchant)
  }, [])

  const handleSortChange = useCallback((next: MerchantSort) => {
    setSort(next)
    setPage(1)
  }, [])

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
              onSortChange={handleSortChange}
              onReview={handleReviewMerchant}
              onViewTransactions={handleViewTransactions}
              onEdit={handleEditMerchant}
              onChangeCategory={handleChangeCategory}
              onDelete={handleDeleteMerchant}
              selectedMerchantId={reviewOpen ? reviewingMerchant?.id : null}
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

      <MerchantReviewDrawer
        merchant={reviewingMerchant}
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        onClosed={() => {
          const restoreY = scrollPositionRef.current
          if (restoreY !== null) window.scrollTo(0, restoreY)

          const id = reviewTriggerMerchantId.current
          if (!id) return
          // Re-query for a live node rather than reusing a captured ref —
          // see the comment on reviewTriggerMerchantId above for why a
          // captured ref goes stale here. Deferred one macrotask so it also
          // runs after Base UI's own trailing focus-into-popup cleanup.
          setTimeout(() => {
            document
              .querySelector<HTMLElement>(`[data-merchant-row-trigger="${CSS.escape(id)}"]`)
              // preventScroll: focus() scrolls its target into view by
              // default, which fights the "preserve table scroll position"
              // requirement — the row is already on screen (that's how it
              // got clicked), so no scroll adjustment is needed here.
              ?.focus({ preventScroll: true })
            // Base UI's scroll-lock itself clamps window.scrollY the moment
            // it engages, independent of anything this page does (confirmed
            // via instrumentation: no scrollTo/scrollIntoView call is ever
            // made — see scrollPositionRef above) and never un-clamps on its
            // own, so re-assert the saved position once more after this
            // deferred cleanup in case its own trailing work re-touches it.
            if (restoreY !== null) window.scrollTo(0, restoreY)
          }, 0)
        }}
        onViewAllTransactions={handleViewTransactions}
        onSaved={setToastMessage}
      />

      {toastMessage && <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />}
    </PageContainer>
  )
}

export default Merchants
