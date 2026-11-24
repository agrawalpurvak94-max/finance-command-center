import { cn } from '@/lib/utils'

interface AmbientGlowProps {
  className?: string
}

/**
 * A single static, blurred radial wash — the "barely visible at rest" page
 * ambient light. Purely decorative (`aria-hidden`), non-interactive, and
 * has no animation of its own, so it costs nothing beyond one composited
 * layer. Uses `--primary`, the existing accent token, never a new color.
 */
export function AmbientGlow({ className }: AmbientGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute -z-10 h-72 w-[36rem] rounded-full opacity-[0.07] blur-[90px]',
        className,
      )}
      style={{ background: 'radial-gradient(closest-side, var(--primary), transparent)' }}
    />
  )
}
