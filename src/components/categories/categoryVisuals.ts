import {
  AppWindow,
  Briefcase,
  Building2,
  Cloud,
  Landmark,
  Megaphone,
  Paperclip,
  Plane,
  Receipt,
  ShieldCheck,
  Tag,
  UtensilsCrossed,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryColor } from '@/domain/Category'

// Icon field on CategoryRecord is a plain string (mirrors how a future
// Supabase `categories` table would store an icon key) rather than a
// component reference, so it can round-trip through the repository layer.
// This map resolves it back to a Lucide component for rendering; unknown
// keys (e.g. freshly created categories) fall back to a generic tag icon.
const iconMap: Record<string, LucideIcon> = {
  AppWindow,
  Cloud,
  Plane,
  UtensilsCrossed,
  Landmark,
  Receipt,
  Wallet,
  Megaphone,
  Paperclip,
  Zap,
  Briefcase,
  ShieldCheck,
  Building2,
}

export function resolveCategoryIcon(icon: string): LucideIcon {
  return iconMap[icon] ?? Tag
}

export const categoryColorClassNames: Record<CategoryColor, string> = {
  primary: 'bg-primary/10 text-primary',
  tertiary: 'bg-tertiary/10 text-tertiary',
  emerald: 'bg-emerald-500/10 text-emerald-400',
  blue: 'bg-blue-500/10 text-blue-400',
  amber: 'bg-amber-500/10 text-amber-400',
  rose: 'bg-rose-500/10 text-rose-400',
  violet: 'bg-violet-500/10 text-violet-400',
}

export const categoryColorLabels: Record<CategoryColor, string> = {
  primary: 'Primary (Blue)',
  tertiary: 'Tertiary',
  emerald: 'Emerald',
  blue: 'Blue',
  amber: 'Amber',
  rose: 'Rose',
  violet: 'Violet',
}
