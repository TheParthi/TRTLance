import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { ConsoleHeader } from '@/components/admin/console-shell';
import { Facts, Panel } from '@/components/admin/stat';
import { Mono } from '@/components/admin/table';
import { requireConsole } from '@/lib/admin/access';
import { IDLE_MINUTES, MAX_HOURS } from '@/lib/admin/limits';
import { getConfiguration } from '@/lib/data/admin';
import { formatDate, formatDateTime } from '@/lib/format';
import { HolidayManager, SettingForm, type SettingShape } from './setting-forms';

export const metadata: Metadata = { title: 'Settings' };

/**
 * The numbers that govern everyone's money, the working-day calendar, and who can be here.
 *
 * Grouped by what each number actually decides rather than by its name, because "fee_bps" and
 * "hold_working_days" mean nothing until you know one is taken from every payment and the other
 * decides when a freelancer can touch it.
 */

const GROUPS: { title: string; description: string; keys: string[] }[] = [
  {
    title: 'What the platform takes',
    description: 'The fee on each milestone payment. A contract stores the fee it was created with, so a change applies only to contracts made after it.',
    keys: ['fee_bps'],
  },
  {
    title: 'When money moves',
    description: 'How long a released payment is held before a freelancer can withdraw it, and how long a client has to respond to delivered work before it pays out on its own.',
    keys: ['hold_working_days', 'auto_release_days'],
  },
  {
    title: 'Limits',
    description: 'The smallest and largest amounts the product will accept.',
    keys: ['min_milestone_coins', 'min_purchase_coins', 'max_purchase_coins', 'min_withdrawal_coins'],
  },
  {
    title: 'What a coin is worth',
    description: 'The price of one coin. Changing this changes what every future purchase and withdrawal is worth in rupees.',
    keys: ['paise_per_coin'],
  },
];

/** Which shape each setting reads as. The rendering itself lives in the client component. */
function shapeFor(key: string): SettingShape {
  if (key === 'fee_bps') return 'basisPoints';
  if (key === 'hold_working_days') return 'workingDays';
  if (key === 'auto_release_days') return 'days';
  if (key === 'paise_per_coin') return 'paise';
  return 'coins';
}

export default async function SettingsPage() {
  const [{ viewer }, config] = await Promise.all([requireConsole('/admin/settings'), getConfiguration()]);
  const known = new Set(GROUPS.flatMap((g) => g.keys));
  const other = config.settings.filter((s) => !known.has(s.key));

  return (
    <>
      <ConsoleHeader
        title="Settings"
        description="The platform fee, holds and limits, the working-day calendar, and who is an admin. Every change here is written to the audit trail with the value it replaced."
      />

      <div className="space-y-12">
        {GROUPS.map((group) => {
          const settings = group.keys
            .map((key) => config.settings.find((s) => s.key === key))
            .filter((s): s is NonNullable<typeof s> => Boolean(s));
          if (!settings.length) return null;
          return (
            <Panel key={group.title} title={group.title} description={group.description}>
              <div className="ledger">
                {settings.map((setting) => (
                  <SettingForm key={setting.key} setting={setting} shape={shapeFor(setting.key)} />
                ))}
              </div>
            </Panel>
          );
        })}

        {other.length > 0 && (
          <Panel title="Other settings" description="Added to the database but not yet grouped here.">
            <div className="ledger">
              {other.map((setting) => (
                <SettingForm key={setting.key} setting={setting} shape={shapeFor(setting.key)} />
              ))}
            </div>
          </Panel>
        )}

        <Panel
          title="Working days"
          description="Payment holds are counted in working days. Weekends never count; the days listed here do not count either."
        >
          <HolidayManager holidays={config.holidays} />
        </Panel>

        <Panel
          title={`Admins (${config.admins.length})`}
          description="Everyone who can open this console. Roles are granted and removed from a member's account page — nobody can change their own."
        >
          <Callout tone="secure" title="How console access works">
            Being an admin is not enough on its own: the console asks for the admin’s password again
            and holds that for {IDLE_MINUTES} minutes of use, up to {MAX_HOURS} hours before it has to
            be given again. An admin signing in with Google needs a password on their account before
            they can get in. The platform cannot be left with no admins.
          </Callout>

          <ul className="ledger">
            {config.admins.map((admin) => (
              <li key={admin.user_id} className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <p className="flex min-w-0 flex-wrap items-center gap-2">
                    <Link href={`/admin/members/${admin.user_id}`} className="font-medium hover:text-brand">{admin.display_name}</Link>
                    <span className="t-meta">@{admin.username}</span>
                    <Badge tone="brass"><ShieldCheck /> Admin</Badge>
                    {admin.user_id === viewer.id && <Badge>You</Badge>}
                  </p>
                  <p className="t-meta">
                    {admin.email ? <span className="break-all">{admin.email}</span> : 'no email'} · since {formatDate(admin.granted_at)}
                  </p>
                  {admin.note && <p className="max-w-reading text-sm text-ink-secondary">{admin.note}</p>}
                </div>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/admin/members/${admin.user_id}`}>Account <ArrowRight /></Link>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Your console session" description="This is what the seal on your session currently allows.">
          <Facts
            items={[
              { label: 'Signed in as', value: <><span className="font-medium">{viewer.profile.display_name}</span> <Mono>@{viewer.profile.username}</Mono></> },
              { label: 'Account id', value: <Mono>{viewer.id}</Mono> },
              { label: 'Lapses after', value: `${IDLE_MINUTES} minutes without use` },
              { label: 'Must unseal again', value: `${MAX_HOURS} hours after unsealing, whatever happens` },
              { label: 'Recorded', value: 'Every unsealing is in the audit trail with the time and browser.' },
              { label: 'Now', value: formatDateTime(new Date().toISOString()) },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}
