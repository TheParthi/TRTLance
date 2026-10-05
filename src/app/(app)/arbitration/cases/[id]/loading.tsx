import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

/** Matches the case room: header, money statement, timeline, then the case file beside the actions. */
export default function Loading() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading case">
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-8 w-80 max-w-full" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="statement space-y-4">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-full" />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="space-y-2"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-24" /></div>)}</div>
      </div>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {[0, 1, 2].map((i) => <div key={i} className="space-y-3 border-t pt-4"><Skeleton className="h-3 w-28" /><SkeletonText lines={4} /></div>)}
        </div>
        <div className="statement space-y-3"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      </div>
    </div>
  );
}
