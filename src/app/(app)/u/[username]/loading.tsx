import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

/** Matches the profile: header, a facts line between rules, then labelled sections separated by rules. */
export default function ProfileLoading() {
  return (
    <div role="status" aria-label="Loading profile">
      <div className="flex flex-col gap-5 pb-8 sm:flex-row sm:items-center">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="flex gap-10 border-y py-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
      <div className="divide-y">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-1 gap-3 py-8 lg:grid-cols-[11rem_minmax(0,1fr)] lg:gap-10">
            <Skeleton className="h-3 w-20" />
            <SkeletonText lines={3} />
          </div>
        ))}
      </div>
    </div>
  );
}
