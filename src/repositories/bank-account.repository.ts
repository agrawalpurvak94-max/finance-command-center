import type {
  BankAccountCreateInput,
  BankAccountListParams,
  BankAccountListResult,
  BankAccountRecord,
  BankAccountSummary,
  BankAccountUpdateInput,
} from '@/domain/Account'

/**
 * Swap point for real backend integration. Implement this interface with a
 * SupabaseBankAccountRepository (reading vw_accounts / vw_account_summary
 * per CLAUDE.md, writing through the future `accounts` table) and the
 * hooks/components in this module require zero changes.
 */
export interface BankAccountRepository {
  list(params: BankAccountListParams): Promise<BankAccountListResult>
  getSummary(): Promise<BankAccountSummary>
  create(input: BankAccountCreateInput): Promise<BankAccountRecord>
  update(id: string, input: BankAccountUpdateInput): Promise<BankAccountRecord>
  delete(id: string): Promise<void>
  /** "Sync All" header action — refreshes every account's lastSyncAt. */
  syncAll(): Promise<void>
  /**
   * Narrow write for the Account Holder identity field (Husband/Wife/
   * Business) on `accounts.account_holder_name` — mirrors
   * `CreditCardRepository.updateAccountHolder`'s doc comment.
   */
  updateAccountHolder(id: string, accountHolder: string | null): Promise<string | null>
}
