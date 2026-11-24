import type { MotionValue } from 'motion/react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface SpotlightOverlayProps {
  background: MotionValue<string>
  opacity: MotionValue<number>
  /** CSS color the gradient mixes toward — an institution's `glowColor`, or omitted for the neutral `--primary` default (see `useSpotlight`). */
  color?: string
  className?: string
}

/**
 * Renders whatever `useSpotlight` is currently tracking. Always
 * `pointer-events-none` and purely decorative (`aria-hidden`) — the
 * interactive element is whatever this sits inside, never this overlay
 * itself. Positioned to fill its nearest `relative` ancestor.
 */
export function SpotlightOverlay({ background, opacity, color, className }: SpotlightOverlayProps) {
  return (
    <motion.span
      aria-hidden="true"
      style={{
        background,
        opacity,
        ...(color ? { ['--spotlight-color' as string]: color } : {}),
      }}
      className={cn('pointer-events-none absolute inset-0 rounded-[inherit]', className)}
    />
  )
}
