'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Loader2, Paperclip, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { submitMilestone } from '@/lib/actions/contracts';
import { formatBytes } from '@/lib/format';
import { BUCKETS, MAX_UPLOAD_BYTES, objectPath } from '@/lib/storage';
import { getBrowserClient } from '@/lib/supabase/client';

interface Uploaded { storage_path: string; file_name: string; size_bytes: number; mime_type: string }

export function SubmitWorkDialog({ open, onOpenChange, contractId, milestone, isRevision }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contractId: string;
  milestone: { id: string; position: number; title: string };
  isRevision: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = React.useState('');
  const [links, setLinks] = React.useState<string[]>(['']);
  const [files, setFiles] = React.useState<Uploaded[]>([]);
  const [uploading, setUploading] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);

  const upload = async (list: FileList | null) => {
    if (!list) return;
    for (const file of Array.from(list)) {
      if (files.length >= 10) break;
      if (file.size > MAX_UPLOAD_BYTES['contract-files']) {
        toast.error(`${file.name} is larger than 50 MB.`);
        continue;
      }
      setUploading((n) => n + 1);
      const path = objectPath(contractId, file.name);
      const { error: e } = await getBrowserClient().storage.from(BUCKETS.contractFiles).upload(path, file, { contentType: file.type || undefined });
      setUploading((n) => n - 1);
      if (e) toast.error(`Upload of ${file.name} failed.`);
      else setFiles((f) => [...f, { storage_path: path, file_name: file.name, size_bytes: file.size, mime_type: file.type || 'application/octet-stream' }]);
    }
    if (input.current) input.current.value = '';
  };

  const submit = async () => {
    setError(null);
    if (note.trim().length < 10) return setError('Describe what you are delivering (at least 10 characters).');
    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (cleanLinks.some((l) => !/^https?:\/\/\S{3,}$/.test(l))) return setError('Links must start with http:// or https://');
    setBusy(true);
    const r = await submitMilestone(contractId, milestone.id, { note, links: cleanLinks, files });
    setBusy(false);
    if (!r.ok) return setError(r.error.message);
    toast.success('Work submitted. The client has been notified.');
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>{isRevision ? 'Submit an updated version' : 'Submit work'} — milestone {milestone.position}</DialogTitle>
          <DialogDescription>{milestone.title}. The client will review it and approve or request changes.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          <Field label="Delivery note" hint="What you delivered, how to review it, and anything the client should know." error={error && note.trim().length < 10 ? error : null}>
            <Textarea rows={5} value={note} onChange={(e) => setNote(e.target.value)} maxLength={5000} />
          </Field>
          <FieldGroup legend="Links" hint="Staging sites, repositories, design files (up to 10).">
            <ul className="space-y-2">
              {links.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <Input type="url" aria-label={`Link ${i + 1}`} placeholder="https://" value={l} onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))} />
                  {links.length > 1 && <Button type="button" variant="ghost" size="icon" aria-label={`Remove link ${i + 1}`} onClick={() => setLinks(links.filter((_, j) => j !== i))}><Trash2 /></Button>}
                </li>
              ))}
            </ul>
            {links.length < 10 && <Button type="button" variant="secondary" size="sm" onClick={() => setLinks([...links, ''])}><Plus /> Add link</Button>}
          </FieldGroup>
          <FieldGroup legend="Files" hint="Up to 10 files, 50 MB each. Only you, the client and an assigned arbitrator can open them.">
            {files.length > 0 && (
              <ul className="divide-y rounded-lg border">
                {files.map((f) => (
                  <li key={f.storage_path} className="flex items-center gap-3 p-2.5 text-sm">
                    <FileText className="size-4 text-ink-muted" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{f.file_name}</span>
                    <span className="t-meta">{formatBytes(f.size_bytes)}</span>
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${f.file_name}`} onClick={() => setFiles(files.filter((x) => x !== f))}><Trash2 /></Button>
                  </li>
                ))}
              </ul>
            )}
            {uploading > 0 && <p className="flex items-center gap-2 text-sm text-ink-secondary" role="status"><Loader2 className="size-4 animate-spin" aria-hidden /> Uploading…</p>}
            <input ref={input} type="file" multiple className="sr-only" tabIndex={-1} onChange={(e) => void upload(e.target.files)} />
            <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()} disabled={files.length >= 10}><Paperclip /> Attach files</Button>
          </FieldGroup>
          {error && note.trim().length >= 10 && <p role="alert" className="text-sm text-danger-strong">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={uploading > 0}>Submit for review</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
