import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface FilterReferenceSelectProps {
  value: string | undefined
  placeholder: string
  options: readonly { id: string; name: string }[]
  onChange: (value: string | undefined) => void
  ariaLabel: string
}

const ALL_VALUE = '__all__'

/** Shared "All / pick one" popover select used by every filter bar's
 * dimension pickers (Transactions' `FilterToolbar`, Analytics' `GlobalFilterBar`) —
 * promoted out of `FilterToolbar` so the two don't carry duplicate copies. */
export function FilterReferenceSelect({
  value,
  placeholder,
  options,
  onChange,
  ariaLabel,
}: FilterReferenceSelectProps) {
  const labelsById: Record<string, string> = { [ALL_VALUE]: 'All' }
  for (const option of options) labelsById[option.id] = option.name

  return (
    <Select
      value={value ?? ALL_VALUE}
      onValueChange={(v) => onChange(v === ALL_VALUE ? undefined : (v ?? undefined))}
    >
      <SelectTrigger aria-label={ariaLabel} className="w-full">
        <SelectValue placeholder={placeholder}>
          {(current: string) => labelsById[current] ?? current}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL_VALUE}>All</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
