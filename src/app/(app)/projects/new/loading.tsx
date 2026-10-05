import { Skeleton } from '@/components/ui/skeleton';

/** Post a project: header, four notes, the start button. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <ul className="ledger">
        {[0, 1, 2, 3].map((i) => (
          <li key={i} className="flex gap-4 py-4">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-4 w-2/3" />
          </li>
        ))}
      </ul>
      <Skeleton className="h-12 w-52" />
    </div>
  );
}
