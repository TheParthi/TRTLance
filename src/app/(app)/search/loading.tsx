import { Skeleton } from '@/components/ui/skeleton';

/** Matches search: header, the search field, result tabs, then ledger rows. */
export default function SearchLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Searching">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full max-w-2xl" />
      <div className="flex gap-6 border-b pb-2.5">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-5 w-20" />)}
      </div>
      <div className="ledger">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-8 py-5">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full max-w-xl" />
            </div>
            <Skeleton className="h-7 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
