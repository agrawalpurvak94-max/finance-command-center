import type { CategoryRepository } from '@/repositories/category.repository'
import { MockCategoryRepository } from '@/repositories/mock-category.repository'

// Swap point for real backend integration — construct a
// SupabaseCategoryRepository here instead when that's scheduled. No other
// file in this module needs to change.
export const categoryRepository: CategoryRepository = new MockCategoryRepository()
