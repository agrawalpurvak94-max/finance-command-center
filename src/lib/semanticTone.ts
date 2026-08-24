/**
 * Shared semantic color vocabulary for status badges and icon chips.
 *
 * Consolidates class strings that were previously hand-written and
 * duplicated across ~7 status/health badge components (StatusBadge,
 * CreditCardHealthBadge, MerchantStatusBadge, ClientStatusBadge,
 * BankAccountHealthBadge, CategoryStatusBadge, StatementStatusBadge).
 * Every color value below is one already in use somewhere in the app —
 * this file does not introduce new colors, only names the existing ones
 * so they stop being re-invented per component.
 *
 * Not used for financial trend direction (positive/negative/neutral) —
 * that has its own established convention (secondary/destructive/muted)
 * distinct from this status vocabulary. See `TrendPill`.
 */
export type SemanticTone = 'success' | 'warning' | 'danger' | 'attention' | 'info' | 'neutral'

const badgeClassNames: Record<SemanticTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  warning: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
  attention: 'border-tertiary/30 bg-tertiary/10 text-tertiary',
  info: 'border-primary/30 bg-primary/10 text-primary',
  neutral: 'border-muted-foreground/30 bg-muted-foreground/10 text-muted-foreground',
}

const iconChipClassNames: Record<SemanticTone, string> = {
  success: 'bg-emerald-500/10 text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-400',
  danger: 'bg-destructive/10 text-destructive',
  attention: 'bg-tertiary/10 text-tertiary',
  info: 'bg-primary/10 text-primary',
  neutral: 'bg-muted-foreground/10 text-muted-foreground',
}

export function semanticToneBadgeClassName(tone: SemanticTone): string {
  return badgeClassNames[tone]
}

export function semanticToneIconChipClassName(tone: SemanticTone): string {
  return iconChipClassNames[tone]
}
