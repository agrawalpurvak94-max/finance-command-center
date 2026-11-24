/**
 * Settings → Credentials — the client-facing management surface for
 * `accounts.statement_password` / `accounts.card_product`. Deliberately a
 * read shape separate from `BankAccountRecord`/`CreditCardRecord`: those are
 * sourced from `vw_accounts`, which does not project either column, so this
 * type is populated only by `BankAccountRepository.listCredentials()` /
 * `CreditCardRepository.listCredentials()`, which read `accounts` directly.
 */
export type AccountCredentialKind = 'credit_card' | 'bank'

export interface AccountCredentialRecord {
  readonly id: string
  readonly kind: AccountCredentialKind
  readonly institutionName: string
  /** Credit cards only (e.g. "Diners Black") — always null for bank accounts. */
  readonly cardProduct: string | null
  readonly last4: string
  /** Display label — 'Credit Card' / 'Savings' / 'Current' / 'Overdraft'. */
  readonly accountTypeLabel: string
  readonly accountCategory: string | null
  readonly currency: string
  readonly statementPassword: string | null
  readonly status: 'active' | 'inactive'
  readonly updatedAt: string
}

/**
 * API keys (`public.api_keys`) — WRITE-ONLY from the browser. RLS lets the app
 * user SELECT only `name` / `updated_at` and INSERT/UPDATE `value`, so the
 * stored key is never read back; the UI only knows whether a slot is set.
 */
export interface ApiKeySlot {
  readonly name: string
  readonly label: string
}

/** Known key slots shown on the Credentials page — append to add more. */
export const API_KEY_SLOTS: readonly ApiKeySlot[] = [
  { name: 'gemini_api_key', label: 'Gemini API key' },
]

/** Status of one stored key — carries no key material. */
export interface ApiKeyStatus {
  readonly name: string
  readonly updatedAt: string
}
