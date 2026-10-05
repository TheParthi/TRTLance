import { Skeleton } from '@/components/ui/skeleton';

/** Compare proposals: one column per proposal from md up, stacked rows on phones. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading proposals">
      <div className="space-y-3">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <Skeleton className="h-10 w-44" />
      <div className="grid grid-cols-1 gap-x-8 gap-y-10 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-4">
            <div className="flex items-center gap-3"><Skeleton className="size-10 rounded-full" /><Skeleton className="h-4 w-32" /></div>
            {[0, 1, 2, 3].map((j) => (
              <div key={j} className="space-y-2 border-t pt-4">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className={j === 0 ? 'h-8 w-28' : 'h-3 w-3/4'} />
              </div>
            ))}
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
