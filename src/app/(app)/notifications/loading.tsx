import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading notifications">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-2 border-b pb-2">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-6 w-20 shrink-0" />)}
      </div>
      <div className="panel divide-y">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3 p-4">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
