import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading admin queues">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 border-y md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="space-y-2 px-4 py-3"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-8" /></div>)}
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="h-3 w-40" />
          <div className="ledger"><div className="space-y-2 py-4"><Skeleton className="h-4 w-1/2" /><SkeletonText lines={2} /></div></div>
        </div>
      ))}
    </div>
  );
}
