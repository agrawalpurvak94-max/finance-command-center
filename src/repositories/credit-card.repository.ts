import type {
  CreditCardCreateInput,
  CreditCardListParams,
  CreditCardListResult,
  CreditCardRecord,
  CreditCardSummary,
  CreditCardUpdateInput,
} from '@/domain/CreditCard'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseCreditCardRepository (reading vw_accounts / a credit-card-specific
 * view per CLAUDE.md, writing through the future `accounts` table) and the
 * hooks/components in this module require zero changes.
 */
export interface CreditCardRepository {
  list(params: CreditCardListParams): Promise<CreditCardListResult>
  getSummary(): Promise<CreditCardSummary>
  create(input: CreditCardCreateInput): Promise<CreditCardRecord>
  update(id: string, input: CreditCardUpdateInput): Promise<CreditCardRecord>
  delete(id: string): Promise<void>
}
