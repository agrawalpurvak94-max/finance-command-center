import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { StatementSelectorOption } from '@/domain/StatementTransaction'

export const ALL_STATEMENTS_VALUE = '__all_statements__'

interface StatementSelectorProps {
  options: readonly StatementSelectorOption[]
  value: string
  onChange: (statementId: string) => void
  isLoading?: boolean
  /** Prepends an "All Statements" entry (value `ALL_STATEMENTS_VALUE`) — used by Statement Explorer's cross-statement mode. */
  includeAllOption?: boolean
}

/**
 * The Statement Explorer's top statement picker — switching selection here
 * changes the route (either `/statements/:statementId` or, for "All
 * Statements", `/statements/explorer`), which drives every other query on
 * the page (see StatementExplorer.tsx). Populated from real Supabase
 * statements via `statementExplorerService.getStatementSelectorOptions`.
 */
export function StatementSelector({
  options,
  value,
  onChange,
  isLoading,
  includeAllOption,
}: StatementSelectorProps) {
  const labelsById: Record<string, string> = {}
  if (includeAllOption) labelsById[ALL_STATEMENTS_VALUE] = 'All Statements'
  for (const option of options) labelsById[option.id] = option.label

  return (
    <Select value={value} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger aria-label="Select statement" className="w-full min-w-72 sm:w-auto">
        <SelectValue placeholder={isLoading ? 'Loading statements…' : 'Select a statement'}>
          {(current: string) => labelsById[current] ?? current}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && <SelectItem value={ALL_STATEMENTS_VALUE}>All Statements</SelectItem>}
        {options.map((option) => (
          <SelectItem key={option.id} value={option.id}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
