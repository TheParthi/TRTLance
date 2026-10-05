import { Skeleton } from '@/components/ui/skeleton';

/** Find work: large title, search field, category strip, toolbar, then ledger rows with a rail. */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading projects">
      <div className="space-y-3 pb-2">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2 overflow-hidden">
        {['w-16', 'w-32', 'w-36', 'w-20', 'w-24', 'w-28'].map((w) => <Skeleton key={w} className={`h-9 shrink-0 rounded-full ${w}`} />)}
      </div>
      <div className="flex items-center justify-between border-b pb-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <ul className="ledger border-t-0">
        {[0, 1, 2].map((i) => (
          <li key={i} className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-10">
            <div className="space-y-2.5">
              <Skeleton className="h-2.5 w-28" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full max-w-xl" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-1.5 w-full max-w-xs" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-8 w-24" />
          </li>
        ))}
      </ul>
    </div>
  );
}
