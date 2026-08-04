import type { MerchantRepository } from '@/repositories/merchant.repository'
import { MockMerchantRepository } from '@/repositories/mock-merchant.repository'

// Swap point for real backend integration — construct a
// SupabaseMerchantRepository here instead when that's scheduled. No other
// file in this module needs to change.
export const merchantRepository: MerchantRepository = new MockMerchantRepository()
