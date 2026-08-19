import type { CategoryRepository } from '@/repositories/category.repository'
import { SupabaseCategoryRepository } from '@/repositories/supabase-category.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const categoryRepository: CategoryRepository = new SupabaseCategoryRepository(supabase)
