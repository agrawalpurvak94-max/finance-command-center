import type { BankAccountRepository } from '@/repositories/bank-account.repository'
import { SupabaseBankAccountRepository } from '@/repositories/supabase-bank-account.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const bankAccountRepository: BankAccountRepository = new SupabaseBankAccountRepository(
  supabase,
)
