import { Skeleton } from '@/components/ui/skeleton';

export default function ConsoleLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-7 border-y py-6 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="space-y-2 pl-3.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 8 }, (_, i) => <Skeleton key={i} className="h-11 w-full" />)}
      </div>
    </div>
  );
}
