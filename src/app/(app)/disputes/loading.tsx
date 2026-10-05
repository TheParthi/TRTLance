import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading disputes">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="flex gap-6 border-b pb-2.5"><Skeleton className="h-4 w-20" /><Skeleton className="h-4 w-20" /></div>
      <div className="ledger">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-start justify-between gap-4 py-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-64 max-w-full" />
              <SkeletonText lines={2} />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
