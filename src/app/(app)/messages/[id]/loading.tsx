import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading conversation"
      className="flex h-[calc(100dvh-12.25rem)] min-h-[26rem] flex-col overflow-hidden md:h-[calc(100dvh-12.75rem)] lg:h-full lg:min-h-0"
    >
      <div className="flex items-center gap-3 border-b pb-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 max-w-full" />
        </div>
      </div>
      <div className="flex-1 space-y-4 py-4">
        <Skeleton className="mx-auto h-3 w-24" />
        <Skeleton className="h-12 w-2/3 rounded-lg" />
        <Skeleton className="ml-auto h-10 w-1/2 rounded-lg" />
        <Skeleton className="h-16 w-3/5 rounded-lg" />
        <Skeleton className="ml-auto h-10 w-2/5 rounded-lg" />
      </div>
      <div className="border-t pt-3">
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}
