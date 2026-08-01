/**
 * Credit cards are modeled today as `Account.TransactionAccount` /
 * `ConnectedAccount` records with `kind: 'credit_card'` — there is no
 * separate credit-card table/view yet (Module 6 has not been designed or
 * approved). This file holds only the credit-card-specific vocabulary that
 * already exists in the mock data (see
 * `repositories/mock-data/reference-data.ts`), so future modules have one
 * place to import it from instead of inventing ad-hoc string literals.
 *
 * Do not add speculative fields (credit limit, statement date, rewards,
 * etc.) here until Module 6 is actually scoped — see ARCHITECTURE_AUDIT.md.
 */
export const KNOWN_CARD_NETWORKS = ['VISA', 'Mastercard', 'AMEX'] as const

export type CardNetwork = (typeof KNOWN_CARD_NETWORKS)[number]
