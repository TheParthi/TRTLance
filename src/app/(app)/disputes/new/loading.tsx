import { Skeleton } from '@/components/ui/skeleton';

/** Matches the wizard: steps on the left, one form box on the right. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <div className="hidden space-y-3 lg:block">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-5 w-40" />)}</div>
        <div className="statement space-y-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-72 max-w-full" />
          <Skeleton className="h-10 w-full" />
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      </div>
    </div>
  );
}
