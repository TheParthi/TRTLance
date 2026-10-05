import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-72 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel space-y-3 p-5">
            <Skeleton className="h-4 w-1/2" />
            <SkeletonText lines={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
