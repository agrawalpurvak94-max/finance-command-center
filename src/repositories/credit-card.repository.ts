import type {
  CreditCardCreateInput,
  CreditCardListParams,
  CreditCardListResult,
  CreditCardPosition,
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
  /** Raw nullable credit-position fields for one card — see `CreditCardPosition`'s doc comment for why this doesn't reuse `list()`'s 0/'VISA' fallback. */
  getCreditPosition(id: string): Promise<CreditCardPosition>
  /**
   * Narrow write for Financial Pulse's inline credit-limit edit (banks
   * raise/lower limits; the user records that manually). Deliberately
   * separate from `update()`, which requires nickname/status/notes as a
   * full replace — a caller that only has the credit limit (like the
   * Financial Pulse drawer, which never loads those other fields) would
   * silently wipe them if it called `update()` instead.
   */
  updateCreditLimit(id: string, creditLimit: number): Promise<CreditCardPosition>
  /**
   * Narrow write for the Account Holder identity field (Husband/Wife/
   * Business) — same `accounts.account_holder_name` column `updateCreditLimit`
   * writes alongside, mirrored here so a caller with only the holder value
   * (Financial Pulse's inline drawer edit) never has to load/resubmit
   * nickname/status/notes via the full `update()`.
   */
  updateAccountHolder(id: string, accountHolder: string | null): Promise<string | null>
  create(input: CreditCardCreateInput): Promise<CreditCardRecord>
  update(id: string, input: CreditCardUpdateInput): Promise<CreditCardRecord>
  delete(id: string): Promise<void>
}
