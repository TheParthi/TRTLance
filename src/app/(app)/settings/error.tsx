'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

export default function SettingsError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="These settings could not be loaded"
      description="Nothing was changed. Check your connection and try again."
      retry={<Button variant="secondary" onClick={reset}>Try again</Button>}
    />
  );
}
