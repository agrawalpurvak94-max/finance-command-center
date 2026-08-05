import type { CreditCardRepository } from '@/repositories/credit-card.repository'
import { MockCreditCardRepository } from '@/repositories/mock-credit-card.repository'

// Swap point for real backend integration — construct a
// SupabaseCreditCardRepository here instead when that's scheduled (Module
// 12A). No other file in this module needs to change.
export const creditCardRepository: CreditCardRepository = new MockCreditCardRepository()
