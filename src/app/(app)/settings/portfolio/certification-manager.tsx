'use client';

import { Award, PenLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { deleteCertification, saveCertification } from '@/lib/actions/profile-sections';
import { formatDate } from '@/lib/format';
import type { Certification } from '@/lib/types';
import { DeleteItemButton } from './delete-item-button';
import { EditorDialog } from './editor-dialog';
import { useEditor } from './use-editor';

const EMPTY = { name: '', issuer: '', issued_on: '', credential_url: '' };

export function CertificationManager({ items }: { items: Certification[] }) {
  const ed = useEditor(EMPTY, saveCertification);
  const add = <Button type="button" variant="secondary" size="sm" onClick={() => ed.start(null, EMPTY)}><Plus /> Add certification</Button>;

  return (
    <Section id="certifications" title="Certifications" description="Shown as self-reported. A credential link lets others check with the issuer." action={items.length ? add : undefined}>
      {items.length === 0 ? (
        <EmptyState compact icon={Award} title="No certifications added" description="Optional. Add professional certificates relevant to your work." action={add} />
      ) : (
        <ul className="panel divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="t-meta">{[item.issuer, item.issued_on ? `Issued ${formatDate(item.issued_on, 'MMM yyyy')}` : null].filter(Boolean).join(' · ') || 'No issuer or date'}</p>
                {item.credential_url && <a href={item.credential_url} target="_blank" rel="noopener noreferrer" className="link text-xs">View credential</a>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item.name}`}
                  onClick={() => ed.start(item.id, { name: item.name, issuer: item.issuer ?? '', issued_on: item.issued_on ?? '', credential_url: item.credential_url ?? '' })}>
                  <PenLine />
                </Button>
                <DeleteItemButton label={item.name} onDelete={() => deleteCertification(item.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditorDialog open={ed.open} onOpenChange={ed.setOpen} busy={ed.busy} error={ed.error} onSubmit={ed.submit}
        title={ed.editing ? 'Edit certification' : 'Add certification'} submitLabel={ed.editing ? 'Save changes' : 'Add certification'}>
        <Field label="Name" error={ed.errors.name}>
          <Input value={ed.values.name} onChange={(e) => ed.set('name', e.target.value)} maxLength={160} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Issuer" optional error={ed.errors.issuer}>
            <Input value={ed.values.issuer} onChange={(e) => ed.set('issuer', e.target.value)} maxLength={160} />
          </Field>
          <Field label="Issue date" optional error={ed.errors.issued_on}>
            <Input type="date" value={ed.values.issued_on} onChange={(e) => ed.set('issued_on', e.target.value)} />
          </Field>
        </div>
        <Field label="Credential link" optional error={ed.errors.credential_url} hint="A full https:// address where the credential can be checked.">
          <Input type="url" inputMode="url" placeholder="https://" value={ed.values.credential_url} onChange={(e) => ed.set('credential_url', e.target.value)} maxLength={500} />
        </Field>
      </EditorDialog>
    </Section>
  );
}
