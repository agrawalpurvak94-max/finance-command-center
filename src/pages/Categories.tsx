import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Search, Tags } from 'lucide-react'
import { PageContainer } from '@/layouts/PageContainer'
import { Input } from '@/components/ui/input'
import { QueryBoundary } from '@/components/QueryBoundary'
import { EmptyState } from '@/components/EmptyState'
import { Pagination } from '@/components/Pagination'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { CategoriesHeader } from '@/components/categories/CategoriesHeader'
import { CategoryFilters } from '@/components/categories/CategoryFilters'
import { CategorySummaryWidget } from '@/components/categories/CategorySummaryWidget'
import { CategoryTable } from '@/components/categories/CategoryTable'
import { CategoryTableSkeleton } from '@/components/categories/CategoryTableSkeleton'
import { CategoryFormDialog } from '@/components/categories/CategoryFormDialog'
import {
  useCategoriesList,
  useCategoriesSummary,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from '@/hooks/useCategories'
import { useTransactionCategories } from '@/hooks/useTransactions'
import { downloadCsv, categoriesToCsv } from '@/utils/csv'
import type {
  CategoryFilters as CategoryFiltersType,
  CategoryRecord,
  CategorySort,
} from '@/domain/Category'

const emptyFilters: CategoryFiltersType = {}

export function Categories() {
  const navigate = useNavigate()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sort, setSort] = useState<CategorySort | undefined>({ id: 'name', desc: false })
  const [draftFilters, setDraftFilters] = useState<CategoryFiltersType>(emptyFilters)
  const [appliedFilters, setAppliedFilters] = useState<CategoryFiltersType>(emptyFilters)
  const [formOpen, setFormOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<CategoryRecord | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<CategoryRecord | null>(null)

  const parentOptionsQuery = useTransactionCategories()

  const summaryQuery = useCategoriesSummary()
  const listQuery = useCategoriesList({
    page,
    pageSize,
    search: search || undefined,
    sort,
    filters: appliedFilters,
  })

  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  function handleAddCategory() {
    setEditingCategory(null)
    setFormOpen(true)
  }

  function handleEditCategory(category: CategoryRecord) {
    setEditingCategory(category)
    setFormOpen(true)
  }

  function handleViewTransactions(category: CategoryRecord) {
    navigate(`/transactions?categoryId=${encodeURIComponent(category.id)}`)
  }

  function handleViewMerchants(category: CategoryRecord) {
    navigate(`/merchants?categoryId=${encodeURIComponent(category.id)}`)
  }

  function handleExport() {
    if (!listQuery.data) return
    downloadCsv('categories.csv', categoriesToCsv(listQuery.data.rows))
  }

  const hasActiveFiltersOrSearch = !!search || Object.keys(appliedFilters).length > 0

  return (
    <PageContainer className="flex flex-col gap-md">
      <CategoriesHeader
        onAddCategory={handleAddCategory}
        onExport={handleExport}
        isExportDisabled={!listQuery.data || listQuery.data.rows.length === 0}
      />

      <CategorySummaryWidget query={summaryQuery} />

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
          placeholder="Search categories…"
          className="pl-9"
          aria-label="Search categories"
        />
      </div>

      <CategoryFilters
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
        parentCategories={parentOptionsQuery.data ?? []}
      />

      <div className="flex items-center justify-between px-xs text-body-sm text-muted-foreground">
        <span>
          Showing{' '}
          <span className="font-bold text-foreground">
            {listQuery.data ? (page - 1) * pageSize + 1 : 0}–
            {listQuery.data ? Math.min(page * pageSize, listQuery.data.total) : 0}
          </span>{' '}
          of {listQuery.data?.total ?? 0} categories
        </span>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <QueryBoundary
          query={listQuery}
          skeleton={<CategoryTableSkeleton rows={pageSize} />}
          isEmpty={(data) => data.rows.length === 0}
          empty={
            <EmptyState
              icon={Tags}
              title={
                hasActiveFiltersOrSearch
                  ? search
                    ? 'No categories match your search'
                    : 'No categories match these filters'
                  : 'No categories yet'
              }
              description={
                hasActiveFiltersOrSearch
                  ? 'Try clearing the search or filters to see more results.'
                  : 'Add your first category to start classifying transactions.'
              }
              action={{ label: 'Clear filters', href: '/categories' }}
            />
          }
        >
          {(data) => (
            <CategoryTable
              categories={data.rows}
              sort={sort}
              onSortChange={(next) => {
                setSort(next)
                setPage(1)
              }}
              onViewTransactions={handleViewTransactions}
              onViewMerchants={handleViewMerchants}
              onEdit={handleEditCategory}
              onDelete={(category) => setDeleteTarget(category)}
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

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        category={editingCategory}
        parentOptions={parentOptionsQuery.data ?? []}
        isPending={createCategory.isPending || updateCategory.isPending}
        onSubmit={(input) => {
          if (editingCategory) {
            updateCategory.mutate(
              { id: editingCategory.id, input },
              { onSuccess: () => setFormOpen(false) },
            )
          } else {
            createCategory.mutate(input, { onSuccess: () => setFormOpen(false) })
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this category?"
        description={
          deleteTarget
            ? `${deleteTarget.name} — this cannot be undone. Transactions already assigned to it will become uncategorized.`
            : ''
        }
        confirmLabel="Delete"
        variant="destructive"
        isPending={deleteCategory.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteCategory.mutate(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </PageContainer>
  )
}

export default Categories
