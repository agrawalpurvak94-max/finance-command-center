import type { TransactionRepository } from '@/repositories/transaction.repository'
import { SupabaseTransactionRepository } from '@/repositories/supabase-transaction.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const transactionRepository: TransactionRepository = new SupabaseTransactionRepository(
  supabase,
)
