'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      className="my-8"
      title="This page could not be loaded"
      description="We could not reach TrustLance just now. Nothing was changed — no money moved and nothing was saved. Try again, or go back to your home page."
      retry={<><Button onClick={reset}>Try again</Button><Button asChild variant="ghost"><Link href="/dashboard">Go to home</Link></Button></>}
    />
  );
}
