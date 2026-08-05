// Shared by both Accounts (Module 8) and Credit Cards (Module 9) card/tile
// visuals — there is no bank logo CDN yet, so both render an initials-based
// avatar fallback instead of an <img>.
export function getBankInitials(bankName: string): string {
  const words = bankName.split(' ').filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
