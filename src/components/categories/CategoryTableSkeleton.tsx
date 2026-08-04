import { Skeleton } from '@/components/ui/skeleton'

interface CategoryTableSkeletonProps {
  rows?: number
}

export function CategoryTableSkeleton({ rows = 10 }: CategoryTableSkeletonProps) {
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label="Loading categories"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-md p-md">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
