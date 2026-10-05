import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading notifications">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-6 overflow-hidden border-b pb-2">
        {[0, 1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-6 w-16 shrink-0" />)}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-16" />
        <div className="divide-y border-y">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-3 py-4 pl-4 sm:gap-5">
              <Skeleton className="mt-0.5 h-3 w-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
