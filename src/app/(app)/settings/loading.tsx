import { Skeleton } from '@/components/ui/skeleton';

/** Matches a settings page: groups separated by rules, label column beside the controls on large screens. */
export default function SettingsLoading() {
  return (
    <div className="divide-y" role="status" aria-label="Loading settings">
      {[0, 1].map((i) => (
        <div key={i} className="grid grid-cols-1 gap-4 py-8 first:pt-0 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
