import { Skeleton } from '@/components/ui/skeleton'

interface StatementTableSkeletonProps {
  rows?: number
}

export function StatementTableSkeleton({ rows = 10 }: StatementTableSkeletonProps) {
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label="Loading statements"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-md p-md">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-24 rounded-full" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
