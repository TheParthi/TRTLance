'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

export default function NotificationsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Notifications could not be loaded"
      retry={<Button variant="secondary" onClick={reset}>Try again</Button>}
    />
  );
}
