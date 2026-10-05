import { Skeleton } from '@/components/ui/skeleton';

/** Shown in the right-hand pane on large screens while the page segment loads. */
export default function Loading() {
  return (
    <div className="hidden h-full flex-col items-center justify-center gap-3 p-8 lg:flex" role="status" aria-label="Loading">
      <Skeleton className="size-11 rounded-full" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-3 w-64" />
    </div>
  );
}
