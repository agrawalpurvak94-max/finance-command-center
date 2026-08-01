import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface InlineOption {
  id: string
  name: string
}

interface InlineSelectorProps {
  value: string | null
  options: readonly InlineOption[]
  placeholder: string
  emptyLabel?: string
  onChange: (id: string | null) => void
  'aria-label': string
}

const NONE_VALUE = '__none__'

export function InlineSelector({
  value,
  options,
  placeholder,
  emptyLabel = 'None',
  onChange,
  'aria-label': ariaLabel,
}: InlineSelectorProps) {
  // Base UI's SelectValue renders the raw value string unless told how to
  // resolve a label for it — unlike Radix, it does not mirror the matching
  // SelectItem's children automatically.
  const labelsById: Record<string, string> = { [NONE_VALUE]: emptyLabel }
  for (const option of options) labelsById[option.id] = option.name

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(next) => onChange(next === NONE_VALUE ? null : next)}
    >
      <SelectTrigger size="sm" aria-label={ariaLabel} className="w-36 text-body-sm">
        <SelectValue placeholder={placeholder}>
          {(current: string) => labelsById[current] ?? current}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>{emptyLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
