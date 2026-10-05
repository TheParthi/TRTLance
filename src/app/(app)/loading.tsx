import { Skeleton } from '@/components/ui/skeleton';

/** Matches the ledger layout: a header, then rows separated by hairlines. */
export default function Loading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="ledger">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-6 py-5">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-2.5 w-2/3 max-w-md" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
