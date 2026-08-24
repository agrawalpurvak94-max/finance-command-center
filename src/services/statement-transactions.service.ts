import type { StatementTransactionRepository } from '@/repositories/statement-transaction.repository'
import { SupabaseStatementTransactionRepository } from '@/repositories/supabase-statement-transaction.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const statementTransactionRepository: StatementTransactionRepository =
  new SupabaseStatementTransactionRepository(supabase)
