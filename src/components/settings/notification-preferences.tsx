'use client';

import * as React from 'react';
import { Lock } from 'lucide-react';
import { Switch } from '@/components/ui/choice';
import { toast } from '@/components/ui/toaster';
import { updatePrivate } from '@/lib/actions/profile';
import { SettingsSection, SettingsSections } from './settings-section';

const MUTABLE = [
  { key: 'projects', label: 'Projects', description: 'New proposals on your projects, and updates to projects you applied to.' },
  { key: 'messages', label: 'Messages', description: 'New messages in your conversations. You still see unread conversations in Messages.' },
  { key: 'system', label: 'System', description: 'Product news and general account information.' },
] as const;

/** Lets members mute non-critical notification categories. Money, contract and security updates are always delivered. */
export function NotificationPreferences({ muted: initialMuted }: { muted: string[] }) {
  const [muted, setMuted] = React.useState<string[]>(() => initialMuted.filter((c) => MUTABLE.some((m) => m.key === c)));
  const [saving, setSaving] = React.useState<string | null>(null);

  async function toggle(key: string, enabled: boolean) {
    const previous = muted;
    const next = enabled ? muted.filter((c) => c !== key) : Array.from(new Set([...muted, key]));
    setMuted(next);
    setSaving(key);
    const res = await updatePrivate({ muted_notification_categories: next });
    setSaving(null);
    if (!res.ok) {
      setMuted(previous);
      toast.error(res.error.message);
      return;
    }
    toast.success('Notification preferences saved');
  }

  return (
    <SettingsSections>
      <SettingsSection id="notify-optional" title="You choose" description="Turn these off if you don’t need them. Changes save as you switch.">
        <ul className="ledger">
          {MUTABLE.map((item) => {
            const id = `notify-${item.key}`;
            const enabled = !muted.includes(item.key);
            return (
              <li key={item.key} className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0 space-y-0.5">
                  <label htmlFor={id} className="t-label">{item.label}</label>
                  <p id={`${id}-desc`} className="text-sm text-ink-secondary">{item.description}</p>
                </div>
                <Switch
                  id={id}
                  checked={enabled}
                  disabled={saving !== null}
                  aria-describedby={`${id}-desc`}
                  aria-busy={saving === item.key || undefined}
                  onCheckedChange={(value) => void toggle(item.key, value)}
                />
              </li>
            );
          })}
        </ul>
      </SettingsSection>
      <SettingsSection id="notify-always" title="Always delivered">
        <p className="flex items-start gap-2 text-sm text-ink-secondary">
          <Lock className="mt-0.5 size-4 shrink-0 text-ink-muted" aria-hidden />
          <span>
            Contract, milestone, payment, dispute and security notifications cannot be turned off, because they concern money in
            escrow or the safety of your account.
          </span>
        </p>
      </SettingsSection>
    </SettingsSections>
  );
}
