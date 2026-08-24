import { getBankInitials } from '@/utils/bank'

/**
 * Data-driven visual identity for a bank/card institution — used by every
 * Account Statement tile so no institution is ever styled directly in JSX
 * (see Stage 4 brief §33). Adding a new institution means adding one line
 * to `KNOWN_INSTITUTIONS` below, nothing else.
 *
 * Every class string here is a complete literal (never template-built from
 * a color variable) because Tailwind's build-time scanner only picks up
 * classes that appear verbatim in source — the same constraint the rest of
 * this codebase's semanticTone.ts already follows.
 */
export interface InstitutionIdentity {
  readonly initials: string
  /** Icon-chip background/text pairing. */
  readonly chipClassName: string
  /** Subtle tile border ring on hover. */
  readonly ringClassName: string
  /** Low-opacity header wash — never covers the whole card. */
  readonly gradientClassName: string
  /** 2px top accent strip. */
  readonly barClassName: string
}

type AccentPalette = Omit<InstitutionIdentity, 'initials'>

const ACCENTS = {
  blue: {
    chipClassName: 'bg-blue-500/10 text-blue-400',
    ringClassName: 'hover:ring-blue-500/20',
    gradientClassName: 'from-blue-500/10 via-transparent to-transparent',
    barClassName: 'bg-blue-500/70',
  },
  orange: {
    chipClassName: 'bg-orange-500/10 text-orange-400',
    ringClassName: 'hover:ring-orange-500/20',
    gradientClassName: 'from-orange-500/10 via-transparent to-transparent',
    barClassName: 'bg-orange-500/70',
  },
  rose: {
    chipClassName: 'bg-rose-500/10 text-rose-400',
    ringClassName: 'hover:ring-rose-500/20',
    gradientClassName: 'from-rose-500/10 via-transparent to-transparent',
    barClassName: 'bg-rose-500/70',
  },
  indigo: {
    chipClassName: 'bg-indigo-500/10 text-indigo-400',
    ringClassName: 'hover:ring-indigo-500/20',
    gradientClassName: 'from-indigo-500/10 via-transparent to-transparent',
    barClassName: 'bg-indigo-500/70',
  },
  violet: {
    chipClassName: 'bg-violet-500/10 text-violet-400',
    ringClassName: 'hover:ring-violet-500/20',
    gradientClassName: 'from-violet-500/10 via-transparent to-transparent',
    barClassName: 'bg-violet-500/70',
  },
  teal: {
    chipClassName: 'bg-teal-500/10 text-teal-400',
    ringClassName: 'hover:ring-teal-500/20',
    gradientClassName: 'from-teal-500/10 via-transparent to-transparent',
    barClassName: 'bg-teal-500/70',
  },
  sky: {
    chipClassName: 'bg-sky-500/10 text-sky-400',
    ringClassName: 'hover:ring-sky-500/20',
    gradientClassName: 'from-sky-500/10 via-transparent to-transparent',
    barClassName: 'bg-sky-500/70',
  },
  red: {
    chipClassName: 'bg-red-500/10 text-red-400',
    ringClassName: 'hover:ring-red-500/20',
    gradientClassName: 'from-red-500/10 via-transparent to-transparent',
    barClassName: 'bg-red-500/70',
  },
  fuchsia: {
    chipClassName: 'bg-fuchsia-500/10 text-fuchsia-400',
    ringClassName: 'hover:ring-fuchsia-500/20',
    gradientClassName: 'from-fuchsia-500/10 via-transparent to-transparent',
    barClassName: 'bg-fuchsia-500/70',
  },
  cyan: {
    chipClassName: 'bg-cyan-500/10 text-cyan-400',
    ringClassName: 'hover:ring-cyan-500/20',
    gradientClassName: 'from-cyan-500/10 via-transparent to-transparent',
    barClassName: 'bg-cyan-500/70',
  },
} as const satisfies Record<string, AccentPalette>

type AccentName = keyof typeof ACCENTS

/**
 * Known-institution mapping — matched by substring against the lowercased
 * institution name, so "HDFC Bank", "HDFC", "HDFC BANK LTD" all resolve the
 * same way. Colors here are chosen for visual distinctiveness across a grid
 * of tiles, not exact brand-color reproduction (see Stage 4 brief §14).
 * Unmatched institutions fall through to the deterministic hash fallback —
 * never a guess, never an invented/borrowed brand mark (see §6).
 */
const KNOWN_INSTITUTIONS: Record<string, AccentName> = {
  hdfc: 'blue',
  icici: 'orange',
  axis: 'rose',
  sbi: 'indigo',
  'state bank': 'indigo',
  yes: 'violet',
  au: 'teal',
  'au bank': 'teal',
  amex: 'sky',
  'american express': 'sky',
  kotak: 'red',
  idfc: 'fuchsia',
  indusind: 'cyan',
}

const FALLBACK_ORDER: readonly AccentName[] = [
  'blue',
  'orange',
  'rose',
  'indigo',
  'violet',
  'teal',
  'sky',
  'red',
  'fuchsia',
  'cyan',
]

function matchKnownAccent(institutionName: string): AccentName | null {
  const normalized = institutionName.toLowerCase()
  for (const [key, accent] of Object.entries(KNOWN_INSTITUTIONS)) {
    if (normalized.includes(key)) return accent
  }
  return null
}

/** Simple deterministic string hash (djb2) — same institution name always
 * resolves to the same fallback accent, across renders and sessions. */
function hashString(value: string): number {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return Math.abs(hash)
}

export function getInstitutionIdentity(institutionName: string): InstitutionIdentity {
  const initials = getBankInitials(institutionName)
  const known = matchKnownAccent(institutionName)
  const accentName = known ?? FALLBACK_ORDER[hashString(institutionName) % FALLBACK_ORDER.length]
  return { initials, ...ACCENTS[accentName] }
}
