import { Link } from 'react-router'
import { cn } from '@/lib/utils'

interface StatementsTabBarProps {
  active: 'control' | 'explorer' | 'analytics'
  /** Where "Statement Explorer" links to — null when no statement exists yet to explore (tab renders disabled). */
  explorerHref: string | null
}

function Tab({
  to,
  isActive,
  disabled,
  children,
}: {
  to: string
  isActive: boolean
  disabled?: boolean
  children: string
}) {
  const className = cn(
    'border-b-2 px-xs pb-sm text-body-md transition-colors',
    isActive
      ? 'border-primary font-bold text-primary'
      : 'border-transparent text-muted-foreground hover:text-foreground',
  )
  if (disabled) {
    return (
      <span
        className={cn(className, 'text-muted-foreground/50 hover:text-muted-foreground/50')}
        title="No statements available yet"
      >
        {children}
      </span>
    )
  }
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  )
}

/**
 * The three Statements tabs (Statement Control / Statement Explorer /
 * Statement Analytics) — real routes, not client-side-only tab state, per
 * the Stitch reference design and this module's routing requirement
 * (Explorer is tied to a real `statement_id` in its URL).
 */
export function StatementsTabBar({ active, explorerHref }: StatementsTabBarProps) {
  return (
    <div className="flex gap-lg border-b border-border">
      <Tab to="/statements" isActive={active === 'control'}>
        Statement Control
      </Tab>
      <Tab to={explorerHref ?? ''} isActive={active === 'explorer'} disabled={!explorerHref}>
        Statement Explorer
      </Tab>
      <Tab to="/statements/analytics" isActive={active === 'analytics'}>
        Statement Analytics
      </Tab>
    </div>
  )
}
