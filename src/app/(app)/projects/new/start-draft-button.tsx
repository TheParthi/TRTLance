'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { createDraftProject } from '@/lib/actions/projects';

export function StartDraftButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      size="lg"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        const r = await createDraftProject();
        if (!r.ok) {
          setBusy(false);
          return toast.error(r.error.message);
        }
        router.push(`/projects/${r.data}/edit`);
      }}
    >
      Start a new project {!busy && <ArrowRight />}
    </Button>
  );
}
