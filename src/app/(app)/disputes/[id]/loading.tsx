import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading dispute">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <div className="flex gap-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-8 w-24" />)}</div>
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => <div key={i} className="panel space-y-3 p-5"><Skeleton className="h-4 w-1/2" /><SkeletonText lines={5} /></div>)}
          </div>
        </div>
        <div className="space-y-4">
          {[0, 1].map((i) => <div key={i} className="panel space-y-3 p-5"><Skeleton className="h-4 w-1/3" /><SkeletonText lines={3} /></div>)}
        </div>
      </div>
    </div>
  );
}
