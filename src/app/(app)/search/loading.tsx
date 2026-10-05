import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function SearchLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Searching">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-10 w-full max-w-xl" />
      </div>
      <div className="flex gap-2 border-b pb-2">
        {[0, 1, 2].map((i) => <Skeleton key={i} className="h-6 w-24" />)}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="panel space-y-3 p-5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-5 w-2/3" />
            <SkeletonText lines={2} />
          </div>
        ))}
      </div>
    </div>
  );
}
