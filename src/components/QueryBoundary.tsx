import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QueryLike<T> {
  isLoading: boolean
  isError: boolean
  data: T | undefined
  refetch: () => void
}

interface QueryBoundaryProps<T> {
  query: QueryLike<T>
  skeleton: ReactNode
  isEmpty?: (data: T) => boolean
  empty?: ReactNode
  children: (data: T) => ReactNode
}

export function QueryBoundary<T>({
  query,
  skeleton,
  isEmpty,
  empty,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isLoading) return <>{skeleton}</>

  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-sm px-lg py-xl text-center">
        <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
        <p className="text-body-md font-medium text-foreground">Couldn't load this data</p>
        <Button size="sm" variant="outline" className="mt-sm" onClick={() => query.refetch()}>
          Retry
        </Button>
      </div>
    )
  }

  if (query.data === undefined) return null

  if (isEmpty && empty && isEmpty(query.data)) {
    return <>{empty}</>
  }

  return <>{children(query.data)}</>
}
