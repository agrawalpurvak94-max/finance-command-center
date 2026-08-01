import type { LucideIcon } from 'lucide-react'
import { Zap } from 'lucide-react'

interface FloatingActionButtonProps {
  icon?: LucideIcon
  label: string
  onClick: () => void
}

export function FloatingActionButton({
  icon: Icon = Zap,
  label,
  onClick,
}: FloatingActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="fixed right-lg bottom-lg z-50 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon className="size-6" aria-hidden="true" />
    </button>
  )
}
