import { Skeleton, SkeletonText } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading settings">
      {[0, 1].map((i) => (
        <div key={i} className="panel space-y-4 p-5 md:p-6">
          <Skeleton className="h-5 w-40" />
          <SkeletonText lines={2} />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}
