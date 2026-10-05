import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading case">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_21rem]">
        <div className="space-y-4">
          <div className="flex gap-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-24" />)}</div>
          {[0, 1, 2].map((i) => <div key={i} className="panel space-y-3 p-5"><Skeleton className="h-4 w-1/3" /><SkeletonText lines={4} /></div>)}
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="panel space-y-3 p-5"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>)}
        </div>
      </div>
    </div>
  );
}
