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
          'relative flex items-center gap-sm rounded-md px-md py-sm text-body-md font-medium text-sidebar-foreground/70 transition-colors duration-150',
          'hover:bg-sidebar-accent/40 hover:text-sidebar-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isActive &&
            'bg-sidebar-accent/25 font-semibold text-sidebar-foreground hover:bg-sidebar-accent/25',
        )
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <span
            aria-hidden="true"
            className={cn(
              'absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity duration-150',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon
            className={cn(
              'size-4 shrink-0 transition-colors duration-150',
              isActive && 'text-sidebar-primary',
            )}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </>
      )}
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
      <div className="mb-lg flex items-center gap-sm px-xs">
        <div
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
        >
          F
        </div>
        <h1 className="text-headline-sm leading-tight font-bold text-sidebar-foreground">
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
