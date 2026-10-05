'use client';

import * as React from 'react';
import { FileText, Link2, StickyNote, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { addEvidence, type EvidenceInput } from '@/lib/actions/disputes';
import { formatBytes } from '@/lib/format';
import { BUCKETS, MAX_UPLOAD_BYTES, objectPath } from '@/lib/storage';
import { getBrowserClient } from '@/lib/supabase/client';

export type EvidenceDraft =
  | { key: string; kind: 'file'; file: File; title: string; description: string }
  | { key: string; kind: 'link'; url: string; title: string; description: string }
  | { key: string; kind: 'note'; title: string; description: string };

const MAX_BYTES = MAX_UPLOAD_BYTES['dispute-evidence'];
const newKey = () => crypto.randomUUID();

function defaultTitle(name: string) {
  const t = name.slice(0, 160);
  return t.length >= 3 ? t : `File ${t}`;
}

/** Returns an error message per draft key (empty when everything is valid). */
export function validateDrafts(drafts: EvidenceDraft[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const d of drafts) {
    if (d.title.trim().length < 3) errors[d.key] = 'Give this item a title of at least 3 characters.';
    else if (d.kind === 'link' && !/^https?:\/\/\S{3,}$/.test(d.url.trim())) errors[d.key] = 'Enter a full link starting with https://.';
    else if (d.kind === 'note' && d.description.trim().length < 10) errors[d.key] = 'Write at least 10 characters.';
    else if (d.kind === 'file' && d.file.size > MAX_BYTES) errors[d.key] = 'Files can be up to 50 MB.';
  }
  return errors;
}

/**
 * Uploads file drafts to dispute-evidence/<disputeId>/… and records every item.
 * Returns how many were saved and which could not be uploaded.
 */
export async function submitEvidence(disputeId: string, drafts: EvidenceDraft[]): Promise<{ saved: number; failed: string[]; error?: string }> {
  const storage = getBrowserClient().storage.from(BUCKETS.disputeEvidence);
  const failed: string[] = [];
  const uploaded: string[] = [];
  const items: EvidenceInput[] = [];
  for (const d of drafts) {
    const base = { title: d.title.trim(), description: d.description.trim() };
    if (d.kind === 'file') {
      const path = objectPath(disputeId, d.file.name);
      const { error } = await storage.upload(path, d.file, { contentType: d.file.type || undefined });
      if (error) {
        failed.push(d.file.name);
        continue;
      }
      uploaded.push(path);
      items.push({ kind: 'file', ...base, storagePath: path, fileName: d.file.name, size: d.file.size, mimeType: d.file.type });
    } else if (d.kind === 'link') {
      items.push({ kind: 'link', ...base, url: d.url.trim() });
    } else {
      items.push({ kind: 'note', ...base });
    }
  }
  if (!items.length) return { saved: 0, failed };
  const r = await addEvidence(disputeId, items);
  if (!r.ok) {
    if (uploaded.length) await storage.remove(uploaded);
    return { saved: 0, failed: drafts.map((d) => d.title), error: r.error.message };
  }
  return { saved: r.data, failed };
}

/** Collects evidence locally: files (up to 50 MB each), links and written notes. */
export function EvidenceComposer({ drafts, onChange, errors = {}, disabled }: {
  drafts: EvidenceDraft[];
  onChange: (drafts: EvidenceDraft[]) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  const fileInput = React.useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next: EvidenceDraft[] = [];
    for (const file of Array.from(list)) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 50 MB.`);
        continue;
      }
      next.push({ key: newKey(), kind: 'file', file, title: defaultTitle(file.name), description: '' });
    }
    onChange([...drafts, ...next]);
    if (fileInput.current) fileInput.current.value = '';
  };

  const update = (key: string, patch: Partial<{ title: string; description: string; url: string }>) =>
    onChange(drafts.map((d) => (d.key === key ? ({ ...d, ...patch } as EvidenceDraft) : d)));

  return (
    <div className="space-y-4">
      {drafts.length > 0 && (
        <ul className="space-y-3">
          {drafts.map((d, i) => {
            const Icon = d.kind === 'file' ? FileText : d.kind === 'link' ? Link2 : StickyNote;
            const label = d.kind === 'file' ? 'File' : d.kind === 'link' ? 'Link' : 'Note';
            return (
              <li key={d.key} className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                    <Icon className="size-4 shrink-0 text-ink-muted" aria-hidden />
                    <span className="truncate">{label} {i + 1}{d.kind === 'file' && <span className="font-normal text-ink-muted"> · {d.file.name} · {formatBytes(d.file.size)}</span>}</span>
                  </p>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Remove ${label.toLowerCase()} ${i + 1}`} disabled={disabled}
                    onClick={() => onChange(drafts.filter((x) => x.key !== d.key))}><Trash2 /></Button>
                </div>
                <Field label="Title" error={errors[d.key]}>
                  <Input value={d.title} maxLength={160} disabled={disabled} onChange={(e) => update(d.key, { title: e.target.value })} />
                </Field>
                {d.kind === 'link' && (
                  <Field label="Link">
                    <Input type="url" inputMode="url" placeholder="https://" value={d.url} maxLength={500} disabled={disabled}
                      onChange={(e) => update(d.key, { url: e.target.value })} />
                  </Field>
                )}
                <Field label={d.kind === 'note' ? 'Note' : 'What this shows'} optional={d.kind !== 'note'}>
                  <Textarea rows={d.kind === 'note' ? 5 : 2} value={d.description} maxLength={3000} disabled={disabled}
                    onChange={(e) => update(d.key, { description: e.target.value })} />
                </Field>
              </li>
            );
          })}
        </ul>
      )}
      <input ref={fileInput} type="file" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => addFiles(e.target.files)} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={disabled} onClick={() => fileInput.current?.click()}><Upload /> Add files</Button>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}
          onClick={() => onChange([...drafts, { key: newKey(), kind: 'link', url: '', title: '', description: '' }])}><Link2 /> Add link</Button>
        <Button type="button" variant="secondary" size="sm" disabled={disabled}
          onClick={() => onChange([...drafts, { key: newKey(), kind: 'note', title: '', description: '' }])}><StickyNote /> Add note</Button>
      </div>
      <p className="t-meta">Files up to 50 MB each. Evidence is visible to both parties, the arbitrator and the platform team, and cannot be deleted once added.</p>
    </div>
  );
}
