import { Skeleton } from '@/components/ui/skeleton'

interface TransactionTableSkeletonProps {
  rows?: number
}

export function TransactionTableSkeleton({ rows = 10 }: TransactionTableSkeletonProps) {
  return (
    <div
      className="flex flex-col divide-y divide-border"
      role="status"
      aria-label="Loading transactions"
    >
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-md p-md">
          <Skeleton className="size-4 rounded-[4px]" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="size-8 rounded" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="ml-auto h-4 w-20" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  )
}
