import { cn } from '@/lib/utils'
import type { OwnerType } from '@/types/transaction'

interface BizPersonalPillProps {
  value: OwnerType
  onChange?: (value: OwnerType) => void
  disabled?: boolean
}

const options: { value: OwnerType; label: string }[] = [
  { value: 'business', label: 'B' },
  { value: 'personal', label: 'P' },
]

export function BizPersonalPill({ value, onChange, disabled }: BizPersonalPillProps) {
  return (
    <div
      role="group"
      aria-label="Business or personal"
      className="inline-flex rounded-full border border-border bg-muted p-0.5"
    >
      {options.map((option) => {
        const isActive = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => onChange?.(option.value)}
            className={cn(
              'flex size-5 items-center justify-center rounded-full text-[10px] font-bold transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            title={option.value === 'business' ? 'Business' : 'Personal'}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
