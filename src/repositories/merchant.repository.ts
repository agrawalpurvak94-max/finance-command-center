import type {
  MerchantCreateInput,
  MerchantListParams,
  MerchantListResult,
  MerchantRecord,
  MerchantSummary,
  MerchantUpdateInput,
} from '@/domain/Merchant'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseMerchantRepository (reading vw_merchants / a merchant-summary view
 * per CLAUDE.md, writing through the existing `merchant_memory` table) and
 * the hooks/components in this module require zero changes.
 *
 * Reference data (the lightweight `Category` list used for the Default
 * Category filter/editor) is intentionally NOT duplicated here — see
 * hooks/useMerchants.ts, which reuses the existing Transactions module's
 * `useTransactionCategories()`, the same "shared master data" reasoning
 * Categories used for its own Parent Category dropdown.
 */
export interface MerchantRepository {
  list(params: MerchantListParams): Promise<MerchantListResult>
  getSummary(): Promise<MerchantSummary>
  create(input: MerchantCreateInput): Promise<MerchantRecord>
  update(id: string, input: MerchantUpdateInput): Promise<MerchantRecord>
  delete(id: string): Promise<void>
}
