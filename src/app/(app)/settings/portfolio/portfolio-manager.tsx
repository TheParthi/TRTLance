'use client';

import { BadgeCheck, ExternalLink, FolderOpen, PenLine, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { Section } from '@/components/common/page-header';
import { EmptyState } from '@/components/common/states';
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
    <Section id="portfolio" title="Portfolio" description="Examples of your work. Items from completed TrustLance contracts are verified and cannot be edited." action={items.length ? add : undefined}>
      {items.length === 0 ? (
        <EmptyState compact icon={FolderOpen} title="No portfolio items yet" description="Add a few projects you are proud of, with a link where people can see them." action={add} />
      ) : (
        <ul className="panel divide-y">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 p-4">
              <div className="min-w-0 flex-1 space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {item.title}
                  {item.contract_id && <Badge tone="success"><BadgeCheck aria-hidden /> Verified contract</Badge>}
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
    </Section>
  );
}
