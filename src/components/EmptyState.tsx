import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-sm px-lg py-xl text-center',
        className,
      )}
    >
      <Icon className="size-8 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p className="w-full text-body-md font-medium text-foreground">{title}</p>
      <p className="mx-auto w-full max-w-80 text-body-sm text-muted-foreground">{description}</p>
      {action && (
        <Button size="sm" variant="outline" className="mt-sm" render={<Link to={action.href} />}>
          {action.label}
        </Button>
      )}
    </div>
  )
}
