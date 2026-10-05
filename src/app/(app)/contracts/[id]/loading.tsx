import { Skeleton } from '@/components/ui/skeleton';

/** Contract workspace while loading: header, escrow statement, next step, then the milestone spine. */
export default function Loading() {
  return (
    <div className="space-y-10 md:space-y-12" role="status" aria-label="Loading contract">
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-9 w-[28rem] max-w-full" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="statement space-y-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-4 border-t pt-4 sm:grid-cols-3 lg:grid-cols-6">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}
        </div>
      </div>
      <div className="space-y-2 border-l-2 border-line pl-5">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-7 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-96 max-w-full" />
      </div>
      <ol className="space-y-8">
        {[0, 1, 2].map((i) => (
          <li key={i} className="flex gap-4">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-24" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-6 w-20" />
          </li>
        ))}
      </ol>
    </div>
  );
}
