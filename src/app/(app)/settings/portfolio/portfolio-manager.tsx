'use client';

import { ExternalLink, PenLine, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { SettingsSection } from '@/components/settings/settings-section';
import { deletePortfolioItem, savePortfolioItem } from '@/lib/actions/profile-sections';
import type { PortfolioItem } from '@/lib/types';
import { DeleteItemButton } from './delete-item-button';
import { EditorDialog } from './editor-dialog';
import { useEditor } from './use-editor';

const EMPTY = { title: '', description: '', url: '' };

export function PortfolioManager({ items }: { items: PortfolioItem[] }) {
  const ed = useEditor(EMPTY, savePortfolioItem);
  const add = <Button type="button" variant="secondary" size="sm" onClick={() => ed.start(null, EMPTY)}><Plus /> Add item</Button>;

  return (
    <SettingsSection id="portfolio" title="Portfolio" description="Examples of your work. Items from completed TrustLance contracts are verified and cannot be edited." action={items.length ? add : undefined}>
      {items.length === 0 ? (
        <div className="space-y-1">
          <p className="font-medium">No portfolio items yet</p>
          <p className="text-sm text-ink-secondary">Add a few projects you are proud of, with a link where people can see them.</p>
          <div className="pt-3">{add}</div>
        </div>
      ) : (
        <ul className="ledger">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
                  {item.title}
                  {item.contract_id && <VerifiedMark />}
                </p>
                {item.description && <p className="line-clamp-2 text-sm text-ink-secondary">{item.description}</p>}
                {item.url && (
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="link inline-flex max-w-full items-center gap-1 truncate text-xs">
                    {item.url.replace(/^https:\/\//, '')} <ExternalLink className="size-3" aria-hidden />
                  </a>
                )}
              </div>
              {item.contract_id ? (
                <span className="t-meta shrink-0 pt-1">Read-only</span>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Edit ${item.title}`}
                    onClick={() => ed.start(item.id, { title: item.title, description: item.description, url: item.url ?? '' })}>
                    <PenLine />
                  </Button>
                  <DeleteItemButton label={item.title} onDelete={() => deletePortfolioItem(item.id)} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <EditorDialog open={ed.open} onOpenChange={ed.setOpen} busy={ed.busy} error={ed.error} onSubmit={ed.submit}
        title={ed.editing ? 'Edit portfolio item' : 'Add portfolio item'} submitLabel={ed.editing ? 'Save changes' : 'Add item'}>
        <Field label="Title" error={ed.errors.title}>
          <Input value={ed.values.title} onChange={(e) => ed.set('title', e.target.value)} maxLength={120} required />
        </Field>
        <Field label="Description" optional error={ed.errors.description} hint="What you did and the outcome.">
          <Textarea rows={4} value={ed.values.description} onChange={(e) => ed.set('description', e.target.value)} maxLength={2000} />
        </Field>
        <Field label="Link" optional error={ed.errors.url} hint="A full https:// address.">
          <Input type="url" inputMode="url" placeholder="https://" value={ed.values.url} onChange={(e) => ed.set('url', e.target.value)} maxLength={500} />
        </Field>
      </EditorDialog>
    </SettingsSection>
  );
}

/** Dot + small caps: this item comes from a completed TrustLance contract. */
function VerifiedMark() {
  return (
    <span className="inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em] text-success-strong">
      <span className="inline-block size-1.5 rounded-full bg-success" aria-hidden />
      Verified contract
    </span>
  );
}
