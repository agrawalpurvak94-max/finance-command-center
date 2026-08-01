import { NavLink } from 'react-router'
import { cn } from '@/lib/utils'
import { primaryNavItems, secondaryNavItems } from '@/lib/navigation'
import type { NavItem } from '@/types/nav'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-md rounded-lg px-md py-sm text-body-md font-medium text-sidebar-foreground/70 transition-colors duration-200',
          'hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isActive &&
            'bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  )
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'flex h-full w-60 flex-col gap-sm border-r border-sidebar-border bg-sidebar p-md',
        className,
      )}
    >
      <div className="mb-lg px-xs">
        <h1 className="text-headline-sm font-bold text-sidebar-foreground">
          Finance Command Center
        </h1>
      </div>

      <div className="flex flex-1 flex-col gap-1">
        {primaryNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-md">
        {secondaryNavItems.map((item) => (
          <SidebarLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </nav>
  )
}
