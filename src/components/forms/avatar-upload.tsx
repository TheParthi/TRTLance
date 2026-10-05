'use client';

import * as React from 'react';
import { Upload } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getBrowserClient } from '@/lib/supabase/client';
import { BUCKETS, MAX_UPLOAD_BYTES, objectPath } from '@/lib/storage';

export function AvatarUpload({ userId, name, path, onUploaded }: {
  userId: string;
  name: string;
  path: string | null;
  onUploaded: (path: string) => Promise<void> | void;
}) {
  const input = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Use a PNG, JPG or WebP image.');
    if (file.size > MAX_UPLOAD_BYTES.avatars) return setError('Images must be 2 MB or smaller.');
    setBusy(true);
    const target = objectPath(userId, file.name);
    const { error: e } = await getBrowserClient().storage.from(BUCKETS.avatars).upload(target, file, { contentType: file.type, upsert: false });
    if (e) {
      setBusy(false);
      return setError('Upload failed. Try again.');
    }
    await onUploaded(target);
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} path={path} size="xl" />
      <div className="space-y-1.5">
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => void onFile(e.target.files?.[0])} />
        <Button type="button" variant="secondary" size="sm" onClick={() => input.current?.click()} loading={busy}>
          {!busy && <Upload />} {path ? 'Replace photo' : 'Upload photo'}
        </Button>
        <p className="text-xs text-ink-muted">PNG, JPG or WebP, up to 2 MB. Shown on your public profile.</p>
        {error && <p role="alert" className="text-xs text-danger-strong">{error}</p>}
      </div>
    </div>
  );
}
