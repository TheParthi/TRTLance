import { Skeleton } from '@/components/ui/skeleton';

/** Project brief: title and summary, then the brief beside a sticky terms column. */
export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading project">
      <div className="space-y-3">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2.5 w-32" />
        <Skeleton className="h-9 w-full max-w-lg" />
        <Skeleton className="h-5 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
        <div className="space-y-3 lg:col-start-2 lg:row-start-1">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-12 w-full" />
          <ul className="ledger">
            {[0, 1, 2, 3].map((i) => <li key={i} className="flex justify-between py-3"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-24" /></li>)}
          </ul>
        </div>
        <div className="min-w-0 space-y-10 lg:col-start-1 lg:row-start-1">
          <div className="space-y-3">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-full max-w-xl" />
            <Skeleton className="h-3 w-2/3 max-w-lg" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-32" />
            <ul className="ledger">{[0, 1, 2].map((i) => <li key={i} className="py-3"><Skeleton className="h-3 w-1/2" /></li>)}</ul>
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <ul className="ledger">{[0, 1, 2].map((i) => <li key={i} className="flex justify-between py-3.5"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-3 w-14" /></li>)}</ul>
          </div>
        </div>
      </div>
    </div>
  );
}
