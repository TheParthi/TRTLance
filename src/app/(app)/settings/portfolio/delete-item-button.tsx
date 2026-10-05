'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { ConfirmDialog } from '@/components/common/confirm-dialog';
import type { SectionResult } from '@/lib/actions/profile-sections';

export function DeleteItemButton({ label, onDelete }: { label: string; onDelete: () => Promise<SectionResult> }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const confirm = async () => {
    setBusy(true);
    const r = await onDelete();
    setBusy(false);
    if (!r.ok) return void toast.error(r.error.message);
    setOpen(false);
    toast.success('Removed from your profile');
    router.refresh();
  };
  return (
    <>
      <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(true)} aria-label={`Delete ${label}`}>
        <Trash2 />
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Delete “${label}”?`}
        description="It will be removed from your public profile. This cannot be undone."
        confirmLabel="Delete"
        tone="danger"
        busy={busy}
        onConfirm={confirm}
      />
    </>
  );
}
