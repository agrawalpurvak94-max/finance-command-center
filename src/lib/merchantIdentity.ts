/**
 * Data-driven visual identity for a merchant — same architecture as
 * `institutionIdentity.ts` (Stage 4), applied to merchants instead of
 * banks. No merchant is ever styled directly in a component; adding a
 * new recognizable merchant means adding one line to `KNOWN_MERCHANTS`.
 *
 * There is no local logo asset pipeline in this app (confirmed absent —
 * see `MerchantCell.tsx`'s own comment on this) and this stage explicitly
 * forbids runtime logo fetching, so identity is initials + a deterministic
 * accent color, never a fetched or hand-drawn brand mark. For merchants
 * confidently recognizable as real, well-known brands, the accent is a
 * deliberate choice (loosely brand-associated, not a reproduction); for
 * everything else it's a hashed pick from the same palette — visually
 * distinct, always identical for the same name, never a guess presented
 * as a real identity.
 */
export interface MerchantIdentity {
  readonly initials: string
  readonly chipClassName: string
}

const ACCENTS = {
  orange: 'bg-orange-500/10 text-orange-400',
  blue: 'bg-blue-500/10 text-blue-400',
  red: 'bg-red-500/10 text-red-400',
  green: 'bg-green-500/10 text-green-400',
  violet: 'bg-violet-500/10 text-violet-400',
  rose: 'bg-rose-500/10 text-rose-400',
  cyan: 'bg-cyan-500/10 text-cyan-400',
  amber: 'bg-amber-500/10 text-amber-400',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-400',
  indigo: 'bg-indigo-500/10 text-indigo-400',
  teal: 'bg-teal-500/10 text-teal-400',
  slate: 'bg-slate-500/10 text-slate-400',
} as const satisfies Record<string, string>

type AccentName = keyof typeof ACCENTS

/**
 * Confidently-recognizable global/national brands only — matched by
 * substring against the lowercased merchant name. Deliberately does NOT
 * include ambiguous or regional-looking names (e.g. "Anand Medical
 * General", "Akshayakalpa Farms") even though they may be well-known
 * locally — those get the honest hashed fallback instead, per this
 * stage's "never guess a brand identity" rule.
 */
const KNOWN_MERCHANTS: Record<string, AccentName> = {
  amazon: 'orange',
  google: 'blue',
  apple: 'slate',
  netflix: 'red',
  spotify: 'green',
  uber: 'slate',
  anthropic: 'orange',
  openai: 'teal',
  microsoft: 'blue',
  azure: 'blue',
  aws: 'orange',
  'amazon web services': 'orange',
  gcp: 'blue',
  adobe: 'red',
  starbucks: 'green',
  swiggy: 'orange',
  zomato: 'red',
  flipkart: 'blue',
  zerodha: 'indigo',
  razorpay: 'blue',
  blinkit: 'amber',
  bigbasket: 'green',
  paytm: 'blue',
  phonepe: 'violet',
  irctc: 'blue',
  meta: 'blue',
  facebook: 'blue',
  bluetokai: 'amber',
}

const FALLBACK_ORDER: readonly AccentName[] = [
  'blue',
  'orange',
  'red',
  'green',
  'violet',
  'rose',
  'cyan',
  'amber',
  'fuchsia',
  'indigo',
  'teal',
  'slate',
]

function matchKnownAccent(merchantName: string): AccentName | null {
  const normalized = merchantName.toLowerCase()
  for (const [key, accent] of Object.entries(KNOWN_MERCHANTS)) {
    if (normalized.includes(key)) return accent
  }
  return null
}

/** Same deterministic djb2 hash as institutionIdentity.ts. */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return Math.abs(hash)
}

function computeInitials(merchantName: string): string {
  const words = merchantName.split(' ').filter(Boolean)
  if (words.length === 0) return '—'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function getMerchantIdentity(merchantName: string): MerchantIdentity {
  const initials = computeInitials(merchantName)
  const known = matchKnownAccent(merchantName)
  const accentName = known ?? FALLBACK_ORDER[hashString(merchantName) % FALLBACK_ORDER.length]
  return { initials, chipClassName: ACCENTS[accentName] }
}
