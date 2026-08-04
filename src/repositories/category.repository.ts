import type {
  CategoryCreateInput,
  CategoryListParams,
  CategoryListResult,
  CategoryRecord,
  CategorySummary,
  CategoryUpdateInput,
} from '@/domain/Category'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseCategoryRepository (reading vw_categories / a category-summary view
 * per CLAUDE.md, writing through the existing `categories` table) and the
 * hooks/components in this module require zero changes.
 *
 * Reference data (the lightweight `Category` list used for Transactions'
 * filter/editor dropdowns) is intentionally NOT duplicated here — see
 * hooks/useCategories.ts, which reuses the existing Transactions module's
 * `useTransactionCategories()` for parent-category options, since that list
 * is shared master data, not owned exclusively by either module.
 */
export interface CategoryRepository {
  list(params: CategoryListParams): Promise<CategoryListResult>
  getSummary(): Promise<CategorySummary>
  create(input: CategoryCreateInput): Promise<CategoryRecord>
  update(id: string, input: CategoryUpdateInput): Promise<CategoryRecord>
  delete(id: string): Promise<void>
}
