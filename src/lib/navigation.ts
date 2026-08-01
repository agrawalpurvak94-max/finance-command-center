import {
  LayoutDashboard,
  Users,
  Landmark,
  CreditCard,
  Receipt,
  FileText,
  Tags,
  Store,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { NavItem } from '@/types/nav'

/**
 * Canonical nav order confirmed against the finalized Stitch export
 * (majority pattern across 5 of 8 screens). /clients and /categories are not
 * in CLAUDE.md's original routing list but are first-class sidebar items in
 * the confirmed design. Credit Cards was promoted from a tab (inside
 * Financial Accounts) to a dedicated nav item per the Module 2 product
 * decisions (2026-08-01).
 */
export const primaryNavItems: readonly NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Clients', href: '/clients', icon: Users },
  { label: 'Financial Accounts', href: '/accounts', icon: Landmark },
  { label: 'Credit Cards', href: '/credit-cards', icon: CreditCard },
  { label: 'Transactions', href: '/transactions', icon: Receipt },
  { label: 'Statements', href: '/statements', icon: FileText },
  { label: 'Categories', href: '/categories', icon: Tags },
  { label: 'Merchant Center', href: '/merchants', icon: Store },
  { label: 'Analytics', href: '/analytics', icon: BarChart3 },
]

export const secondaryNavItems: readonly NavItem[] = [
  { label: 'Settings', href: '/settings', icon: Settings },
]
