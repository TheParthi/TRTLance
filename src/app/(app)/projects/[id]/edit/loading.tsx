import { Skeleton } from '@/components/ui/skeleton';

/** Posting wizard: step list beside the active step's form. */
export default function Loading() {
  return (
    <div className="grid gap-8 lg:grid-cols-[14rem_1fr]" role="status" aria-label="Loading">
      <div className="hidden space-y-3 lg:block">
        {Array.from({ length: 9 }, (_, i) => <Skeleton key={i} className="h-6 w-40" />)}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-1 w-full lg:hidden" />
        <div className="statement space-y-6 md:p-8">
          <Skeleton className="h-2.5 w-24" />
          <Skeleton className="h-8 w-72 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <div className="flex justify-between border-t pt-5"><Skeleton className="h-10 w-20" /><Skeleton className="h-10 w-28" /></div>
        </div>
      </div>
    </div>
  );
}
