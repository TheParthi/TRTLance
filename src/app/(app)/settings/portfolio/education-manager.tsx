'use client';

import { GraduationCap, PenLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Section } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
import { deleteEducation, saveEducation } from '@/lib/actions/profile-sections';
import type { Education } from '@/lib/types';
import { DeleteItemButton } from './delete-item-button';
import { EditorDialog } from './editor-dialog';
import { useEditor } from './use-editor';

const EMPTY = { school: '', degree: '', field: '', start_year: '', end_year: '' };

export function EducationManager({ items }: { items: Education[] }) {
  const ed = useEditor(EMPTY, saveEducation);
  const add = <Button type="button" variant="secondary" size="sm" onClick={() => ed.start(null, EMPTY)}><Plus /> Add education</Button>;

  return (
    <Section id="education" title="Education" action={items.length ? add : undefined}>
      {items.length === 0 ? (
        <EmptyState compact icon={GraduationCap} title="No education added" description="Optional. Add degrees or courses that matter for your work." action={add} />
      ) : (
        <ul className="panel divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.school}</p>
                {(item.degree || item.field) && <p className="text-sm text-ink-secondary">{[item.degree, item.field].filter(Boolean).join(', ')}</p>}
                {(item.start_year || item.end_year) && <p className="t-meta">{item.start_year ?? '…'} – {item.end_year ?? 'present'}</p>}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item.school}`}
                  onClick={() => ed.start(item.id, {
                    school: item.school, degree: item.degree ?? '', field: item.field ?? '',
                    start_year: item.start_year?.toString() ?? '', end_year: item.end_year?.toString() ?? '',
                  })}>
                  <PenLine />
                </Button>
                <DeleteItemButton label={item.school} onDelete={() => deleteEducation(item.id)} />
              </div>
            </li>
          ))}
        </ul>
      )}

      <EditorDialog open={ed.open} onOpenChange={ed.setOpen} busy={ed.busy} error={ed.error} onSubmit={ed.submit}
        title={ed.editing ? 'Edit education' : 'Add education'} submitLabel={ed.editing ? 'Save changes' : 'Add education'}>
        <Field label="School or institution" error={ed.errors.school}>
          <Input value={ed.values.school} onChange={(e) => ed.set('school', e.target.value)} maxLength={160} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Degree" optional error={ed.errors.degree}>
            <Input value={ed.values.degree} onChange={(e) => ed.set('degree', e.target.value)} maxLength={160} placeholder="e.g. BSc" />
          </Field>
          <Field label="Field of study" optional error={ed.errors.field}>
            <Input value={ed.values.field} onChange={(e) => ed.set('field', e.target.value)} maxLength={160} />
          </Field>
          <Field label="Start year" optional error={ed.errors.start_year}>
            <Input inputMode="numeric" maxLength={4} value={ed.values.start_year} onChange={(e) => ed.set('start_year', e.target.value)} placeholder="YYYY" />
          </Field>
          <Field label="End year" optional error={ed.errors.end_year} hint="Leave empty if ongoing.">
            <Input inputMode="numeric" maxLength={4} value={ed.values.end_year} onChange={(e) => ed.set('end_year', e.target.value)} placeholder="YYYY" />
          </Field>
        </div>
      </EditorDialog>
    </Section>
  );
}
