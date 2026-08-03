import type { StatementRepository } from '@/repositories/statement.repository'
import { MockStatementRepository } from '@/repositories/mock-statement.repository'

// Swap point for real backend integration — construct a
// SupabaseStatementRepository here instead when that's scheduled. No other
// file in this module needs to change.
export const statementRepository: StatementRepository = new MockStatementRepository()
