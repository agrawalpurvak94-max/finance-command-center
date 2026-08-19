import type { StatementRepository } from '@/repositories/statement.repository'
import { SupabaseStatementRepository } from '@/repositories/supabase-statement.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const statementRepository: StatementRepository = new SupabaseStatementRepository(supabase)
