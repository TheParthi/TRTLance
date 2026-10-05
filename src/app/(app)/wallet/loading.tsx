import { Skeleton } from '@/components/ui/skeleton';

/** Matches the wallet: header, two wallet lines, the statements, then transaction rows. */
export default function WalletLoading() {
  return (
    <div className="space-y-12" role="status" aria-label="Loading wallet">
      <div className="space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-full max-w-2xl" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>
      <div className="ledger">
        {[0, 1].map((i) => (
          <div key={i} className="grid gap-2 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
            <Skeleton className="h-3 w-24" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="statement space-y-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-full" />
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="space-y-1.5">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <div className="ledger">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-6 py-4">
              <Skeleton className="h-3 w-20" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64 max-w-full" />
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
