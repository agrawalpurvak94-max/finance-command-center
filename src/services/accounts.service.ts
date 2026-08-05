import type { BankAccountRepository } from '@/repositories/bank-account.repository'
import { MockBankAccountRepository } from '@/repositories/mock-bank-account.repository'

// Swap point for real backend integration — construct a
// SupabaseBankAccountRepository here instead when that's scheduled (Module
// 12A). No other file in this module needs to change.
export const bankAccountRepository: BankAccountRepository = new MockBankAccountRepository()
