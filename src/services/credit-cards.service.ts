import type { CreditCardRepository } from '@/repositories/credit-card.repository'
import { SupabaseCreditCardRepository } from '@/repositories/supabase-credit-card.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const creditCardRepository: CreditCardRepository = new SupabaseCreditCardRepository(supabase)
