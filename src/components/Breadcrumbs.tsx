import { Fragment } from 'react'
import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BreadcrumbItem {
  readonly label: string
  readonly href?: string
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-xs text-body-sm', className)}>
      <ol className="flex items-center gap-xs">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <Fragment key={item.label}>
              {index > 0 && (
                <ChevronRight className="size-3.5 text-muted-foreground" aria-hidden="true" />
              )}
              <li>
                {item.href && !isLast ? (
                  <Link to={item.href} className="text-muted-foreground hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined} className="text-foreground">
                    {item.label}
                  </span>
                )}
              </li>
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
