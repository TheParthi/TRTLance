'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

export default function MessagesError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="lg:p-6">
      <ErrorState
        title="This conversation could not be loaded"
        retry={
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="secondary" onClick={reset}>Try again</Button>
            <Button asChild variant="ghost" className="lg:hidden"><Link href="/messages">All conversations</Link></Button>
          </div>
        }
      />
    </div>
  );
}
