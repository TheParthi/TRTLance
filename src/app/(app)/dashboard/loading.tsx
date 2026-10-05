import { Skeleton } from '@/components/ui/skeleton';

/** Home while loading: the greeting, the next-up ledger, then contracts beside the money statement. */
export default function Loading() {
  return (
    <div className="space-y-12 md:space-y-16" role="status" aria-label="Loading your home">
      <div className="space-y-3">
        <Skeleton className="h-3 w-36" />
        <Skeleton className="h-12 w-96 max-w-full md:h-14" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-3 w-20" />
        <div className="ledger">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid grid-cols-[2rem_minmax(0,1fr)] gap-3 py-5 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto] sm:gap-6">
              <Skeleton className="h-4 w-6" />
              <div className="space-y-2">
                <Skeleton className="h-2.5 w-48" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-3.5 w-1/2" />
              </div>
              <Skeleton className="col-start-2 h-8 w-32 sm:col-start-3" />
            </div>
          ))}
        </div>
      </div>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-14">
        <div className="ledger">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-2.5 py-5">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-2 w-full max-w-md" />
            </div>
          ))}
        </div>
        <div className="statement space-y-4">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
          </div>
        </div>
      </div>
    </div>
  );
}
