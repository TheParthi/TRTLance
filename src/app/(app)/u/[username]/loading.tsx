import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function ProfileLoading() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading profile">
      <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center md:p-6">
        <Skeleton className="size-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-64 max-w-full" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-5 w-32" />
              <div className="panel p-5"><SkeletonText lines={3} /></div>
            </div>
          ))}
        </div>
        <div className="space-y-6">
          <div className="panel space-y-3 p-5"><Skeleton className="h-3 w-24" /><SkeletonText lines={4} /></div>
          <div className="panel space-y-3 p-5"><Skeleton className="h-3 w-24" /><Skeleton className="h-8 w-16" /></div>
        </div>
      </div>
    </div>
  );
}
