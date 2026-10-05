import { Skeleton } from '@/components/ui/skeleton';

/** Proposal composer: the form box beside a plain summary column. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-56" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-12">
        <div className="statement space-y-6">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-40 w-full" />
          <div className="grid gap-5 sm:grid-cols-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-2.5 w-20" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
