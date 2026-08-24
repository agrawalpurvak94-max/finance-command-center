import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <section
      className={cn(
        'mx-auto w-full min-w-0 max-w-[1600px] flex-1 px-md py-lg sm:px-lg lg:px-xl',
        className,
      )}
    >
      {children}
    </section>
  )
}
