'use client';

import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

/**
 * A console screen that could not load. Every read here goes through a database function that
 * refuses anyone who is not an admin, so the usual cause is a lapsed session or a dropped
 * connection — in both cases nothing was changed, and the honest advice is to try again.
 */
export default function ConsoleError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="This console screen could not be loaded"
      description="Nothing was changed. If it keeps happening, your console session may have lapsed — reload the page and unseal it again."
      retry={
        <>
          <Button variant="secondary" onClick={reset}><RotateCw /> Try again</Button>
          <Button asChild variant="ghost"><a href="/admin">Back to the overview</a></Button>
        </>
      }
    />
  );
}
