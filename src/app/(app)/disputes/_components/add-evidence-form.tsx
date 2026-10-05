'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { toast } from '@/components/ui/toaster';
import { EvidenceComposer, submitEvidence, validateDrafts, type EvidenceDraft } from './evidence-composer';

/** Adds evidence to an open dispute. */
export function AddEvidenceForm({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [drafts, setDrafts] = React.useState<EvidenceDraft[]>([]);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateDrafts(drafts);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setProblem(null);
    const r = await submitEvidence(disputeId, drafts);
    setBusy(false);
    if (r.error) return setProblem(r.error);
    if (r.failed.length) setProblem(`These files could not be uploaded: ${r.failed.join(', ')}. Add them again.`);
    if (r.saved) {
      toast.success(`${r.saved} item${r.saved === 1 ? '' : 's'} added to the case`);
      setDrafts((ds) => ds.filter((d) => d.kind === 'file' && r.failed.includes(d.file.name)));
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="panel space-y-4 p-5" aria-labelledby="add-evidence-title">
      <h3 id="add-evidence-title" className="text-sm font-semibold">Add evidence</h3>
      <EvidenceComposer drafts={drafts} onChange={setDrafts} errors={errors} disabled={busy} />
      {problem && <Callout tone="danger" role="alert">{problem}</Callout>}
      {drafts.length > 0 && (
        <div className="flex justify-end border-t pt-4">
          <Button type="submit" loading={busy}>Add {drafts.length} item{drafts.length === 1 ? '' : 's'} to the case</Button>
        </div>
      )}
    </form>
  );
}
