import { Skeleton } from '@/components/ui/skeleton'

interface MerchantTableSkeletonProps {
  rows?: number
}

export function MerchantTableSkeleton({ rows = 10 }: MerchantTableSkeletonProps) {
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label="Loading merchants"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-md p-md">
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-28 rounded-lg" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}
