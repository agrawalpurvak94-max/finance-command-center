import type { TransactionRepository } from '@/repositories/transaction.repository'
import { MockTransactionRepository } from '@/repositories/mock-transaction.repository'

/**
 * Single swap point for backend integration: replace this instantiation with
 * `new SupabaseTransactionRepository(supabase)` once Module 3 moves off mock
 * data. Hooks and components only ever depend on the TransactionRepository
 * interface, never this concrete class.
 */
export const transactionRepository: TransactionRepository = new MockTransactionRepository()
