import type { MouseEvent } from 'react'
import { useMotionTemplate, useMotionValue, useReducedMotion } from 'motion/react'

/**
 * Cursor-following spotlight for a single interactive surface (account tile,
 * KPI card, payment row) — the same "track position via a motion value,
 * render it as a CSS `background`" technique Magic UI's `MagicCard` uses
 * internally, built on the `motion` library already installed here rather
 * than adding that package. Motion values mutate the DOM node directly on
 * `mousemove` (no React state, no re-render per frame), so this stays cheap
 * even attached to every tile in a large grid — see `SpotlightOverlay`,
 * which is the only thing that actually reads `background`/`opacity`.
 *
 * Fully inert under `prefers-reduced-motion`: the overlay never becomes
 * visible, and `onMouseMove` is a no-op, so no listener work happens either.
 */
export function useSpotlight(radiusPx = 200) {
  const prefersReducedMotion = useReducedMotion()
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const opacity = useMotionValue(0)
  const background = useMotionTemplate`radial-gradient(${radiusPx}px circle at ${mouseX}px ${mouseY}px, color-mix(in srgb, var(--spotlight-color, var(--primary)) 35%, transparent), transparent 70%)`

  function onMouseMove(event: MouseEvent<HTMLElement>) {
    if (prefersReducedMotion) return
    const rect = event.currentTarget.getBoundingClientRect()
    mouseX.set(event.clientX - rect.left)
    mouseY.set(event.clientY - rect.top)
  }

  function onMouseEnter() {
    // Capped well below full opacity — "felt rather than noticed" even
    // before the gradient's own color-mix/falloff further softens it.
    if (!prefersReducedMotion) opacity.set(0.5)
  }

  function onMouseLeave() {
    opacity.set(0)
  }

  return { onMouseMove, onMouseEnter, onMouseLeave, background, opacity }
}
