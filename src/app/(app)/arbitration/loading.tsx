import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading arbitration">
      <div className="space-y-3">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => <div key={i} className="panel space-y-2 p-4"><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-10" /></div>)}
      </div>
      <div className="panel space-y-3 p-5"><Skeleton className="h-4 w-1/3" /><SkeletonText lines={4} /></div>
    </div>
  );
}
