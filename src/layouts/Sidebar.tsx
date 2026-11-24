import type { ReactNode } from 'react'
import { NavLink } from 'react-router'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import { primaryNavItems, secondaryNavItems } from '@/lib/navigation'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { NavItem } from '@/types/nav'

interface SidebarProps {
  className?: string
  onNavigate?: () => void
  /**
   * Omit both collapse props entirely for contexts that should never
   * collapse (the mobile navigation Sheet always renders expanded, per
   * Stage 2B §20) — the collapse toggle only renders when
   * `onToggleCollapsed` is provided.
   */
  collapsed?: boolean
  onToggleCollapsed?: () => void
}

/**
 * Fades/shrinks text away rather than unmounting it, so collapsing never
 * causes a layout jump — the label just clips smoothly to nothing.
 *
 * Text wraps naturally (matches the pre-Stage-2B sidebar, where longer
 * labels like "Account Statements" already wrapped to two lines) — a
 * `max-w` cap here is only there to give the collapse transition a
 * numeric width to animate from, not to constrain resting-state layout,
 * so it's set generously above what the row can actually offer.
 */
function CollapsibleLabel({
  collapsed,
  className,
  expandedMaxWidth = 'max-w-56',
  children,
}: {
  collapsed: boolean
  className?: string
  expandedMaxWidth?: 'max-w-56' | 'max-w-none'
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden transition-all duration-200 ease-in-out',
        collapsed
          ? 'max-w-0 -translate-x-1 opacity-0'
          : `${expandedMaxWidth} translate-x-0 opacity-100`,
        className,
      )}
    >
      {children}
    </div>
  )
}

function SidebarLink({
  item,
  onNavigate,
  collapsed,
}: {
  item: NavItem
  onNavigate?: () => void
  collapsed: boolean
}) {
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'relative flex items-center gap-sm rounded-md px-md py-sm text-body-md font-medium text-sidebar-foreground/70 transition-colors duration-150',
          'hover:bg-surface-hover hover:text-sidebar-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          collapsed && 'justify-center px-0',
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
              'absolute top-1/2 left-0 h-4 w-0.75 -translate-y-1/2 rounded-full bg-sidebar-primary transition-opacity duration-150',
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
          <CollapsibleLabel collapsed={collapsed}>{item.label}</CollapsibleLabel>
        </>
      )}
    </NavLink>
  )

  if (!collapsed) return link

  return (
    <Tooltip>
      <TooltipTrigger render={link} />
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  )
}

export function Sidebar({
  className,
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
}: SidebarProps) {
  return (
    <TooltipProvider delay={300}>
      <nav
        aria-label="Primary"
        className={cn(
          'group/sidebar m-2 flex flex-col gap-sm rounded-2xl border border-sidebar-border/60 bg-sidebar p-md shadow-lg shadow-black/20 transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-18' : 'w-60',
          className,
        )}
      >
        <div className="mb-md flex items-center gap-sm px-xs">
          <div
            aria-hidden="true"
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground"
          >
            F
          </div>
          <CollapsibleLabel
            collapsed={collapsed}
            expandedMaxWidth="max-w-none"
            className="min-w-0 flex-1"
          >
            <h1 className="text-headline-sm leading-tight font-bold text-sidebar-foreground">
              Finance Command Center
            </h1>
          </CollapsibleLabel>
        </div>

        {onToggleCollapsed && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={cn(
              'mb-sm flex items-center gap-sm rounded-md px-md py-xs text-body-sm font-medium text-sidebar-foreground/50 transition-colors duration-150',
              'hover:bg-surface-hover hover:text-sidebar-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
              collapsed && 'justify-center px-0',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-4 shrink-0" aria-hidden="true" />
            )}
            <CollapsibleLabel collapsed={collapsed}>Collapse</CollapsibleLabel>
          </button>
        )}

        <div className="flex flex-1 flex-col gap-1">
          {primaryNavItems.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              onNavigate={onNavigate}
              collapsed={collapsed}
            />
          ))}
        </div>

        {secondaryNavItems.length > 0 && (
          <div className="mt-auto flex flex-col gap-1 border-t border-sidebar-border pt-md">
            {secondaryNavItems.map((item) => (
              <SidebarLink
                key={item.href}
                item={item}
                onNavigate={onNavigate}
                collapsed={collapsed}
              />
            ))}
          </div>
        )}
      </nav>
    </TooltipProvider>
  )
}
