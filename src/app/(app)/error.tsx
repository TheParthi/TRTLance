'use client';

import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common/states';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return <ErrorState retry={<Button variant="secondary" onClick={reset}>Try again</Button>} />;
}
