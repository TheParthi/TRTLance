import { Skeleton } from '@/components/ui/skeleton';

/** Projects: header, view tabs, then grouped ledgers. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading projects">
      <div className="space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="flex gap-6 border-b pb-2.5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-24" />
        <ul className="ledger">
          {[0, 1, 2].map((i) => (
            <li key={i} className="flex items-center gap-6 py-4">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2.5 w-14" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
