import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface FilterChipProps {
  icon: LucideIcon
  label: string
  isActive?: boolean
  children: ReactNode
}

export function FilterChip({ icon: Icon, label, isActive, children }: FilterChipProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'gap-xs rounded-md border-border bg-card text-body-sm font-medium',
              isActive && 'border-primary/50 bg-primary/10 text-primary',
            )}
          />
        }
      >
        <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
        {label}
        <ChevronDown className="size-3.5" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64">
        {children}
      </PopoverContent>
    </Popover>
  )
}
