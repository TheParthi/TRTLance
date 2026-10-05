import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading dispute">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-full" />
      </div>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="grid gap-6 border-y py-5 lg:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="space-y-3"><Skeleton className="h-4 w-1/2" /><SkeletonText lines={5} /></div>)}
        </div>
        <div className="ledger">
          {[0, 1, 2, 3].map((i) => <div key={i} className="space-y-2 py-3"><Skeleton className="h-3 w-1/3" /><Skeleton className="h-4 w-2/3" /></div>)}
        </div>
      </div>
    </div>
  );
}
