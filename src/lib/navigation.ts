import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  FileText,
  Tags,
  Store,
  BarChart3,
  KeyRound,
} from 'lucide-react'
import type { NavItem } from '@/types/nav'

/**
 * Canonical nav order confirmed against the finalized Stitch export
 * (majority pattern across 5 of 8 screens). /clients and /categories are not
 * in CLAUDE.md's original routing list but are first-class sidebar items in
 * the confirmed design. Credit Cards was promoted from a tab (inside
 * Financial Accounts) to a dedicated nav item per the Module 2 product
 * decisions (2026-08-01).
 *
 * "Financial Accounts" was removed as a separate sidebar item (Module 12B
 * follow-up) — it's been folded into "Account Statements" (still the
 * `/credit-cards` route/file internally), which now covers Credit Cards,
 * Savings, Current, and OD as one unified statement-analysis area.
 *
 * "Settings" is no longer part of the product roadmap (roadmap correction,
 * 2026-09-17) — "Credentials" is its direct standalone replacement, last in
 * the primary list per the Stitch Credentials export's own sidebar (which
 * shows it as a first-class item, not nested under Settings). Uses `KeyRound`
 * rather than the Stitch mock's reused gear icon, since Credentials is no
 * longer a generic-settings concept and shouldn't look like one.
 */
export const primaryNavItems: readonly NavItem[] = [
  { label: 'Financial Pulse', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Account Intelligence', href: '/credit-cards', icon: CreditCard },
  { label: 'Transactions', href: '/transactions', icon: Receipt },
  { label: 'Statements', href: '/statements', icon: FileText },
  { label: 'Categories', href: '/categories', icon: Tags },
  { label: 'Merchant Center', href: '/merchants', icon: Store },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
  { label: 'Credentials', href: '/credentials', icon: KeyRound },
]

/** No secondary nav items remain now that Settings is gone — see Sidebar.tsx's empty-array guard. */
export const secondaryNavItems: readonly NavItem[] = []
