import type { MerchantRepository } from '@/repositories/merchant.repository'
import { SupabaseMerchantRepository } from '@/repositories/supabase-merchant.repository'
import { supabase } from '@/lib/supabase'

// Module 12A swap point. No other file in this module needed to change.
export const merchantRepository: MerchantRepository = new SupabaseMerchantRepository(supabase)
