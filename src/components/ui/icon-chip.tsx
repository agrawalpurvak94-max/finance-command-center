import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'
import { semanticToneIconChipClassName, type SemanticTone } from '@/lib/semanticTone'

const iconChipVariants = cva('flex shrink-0 items-center justify-center rounded-md', {
  variants: {
    size: {
      sm: 'size-6 [&_svg]:size-3.5',
      md: 'size-8 [&_svg]:size-4',
      lg: 'size-12 [&_svg]:size-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

interface IconChipProps extends React.ComponentProps<'div'>, VariantProps<typeof iconChipVariants> {
  tone?: SemanticTone
}

function IconChip({ className, size, tone = 'info', ...props }: IconChipProps) {
  return (
    <div
      data-slot="icon-chip"
      className={cn(iconChipVariants({ size }), semanticToneIconChipClassName(tone), className)}
      {...props}
    />
  )
}

export { IconChip, iconChipVariants }
