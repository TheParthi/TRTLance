import type { Metadata } from 'next';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SettingsSection, SettingsSections } from '@/components/settings/settings-section';
import { requireViewer } from '@/lib/auth';
import { formatAmount } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';
import { PasswordForm } from './password-form';
import { PhoneForm } from './phone-form';

export const metadata: Metadata = { title: 'Account & security' };

/** Dot + small-caps state, the quiet alternative to a pill. */
function Mark({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.1em]', ok ? 'text-success-strong' : 'text-warning-strong')}>
      <span className={cn('inline-block size-1.5 rounded-full', ok ? 'bg-success' : 'bg-warning')} aria-hidden />
      {children}
    </span>
  );
}

export default async function AccountSettingsPage() {
  const viewer = await requireViewer('/settings/account');
  const supabase = await createClient();
  const { data: priv, error } = await supabase.from('profile_private').select('phone').eq('id', viewer.id).maybeSingle<{ phone: string | null }>();
  if (error) throw error;

  return (
    <SettingsSections>
      <SettingsSection id="email" title="Email" description="Used to sign in and for contract, payment and security notifications. Never shown publicly.">
        <div className="space-y-1.5">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="break-all text-sm font-medium">{viewer.email ?? 'No email on file'}</span>
            <Mark ok={viewer.emailConfirmed}>{viewer.emailConfirmed ? 'Verified' : 'Not verified'}</Mark>
          </p>
          {!viewer.emailConfirmed && (
            <p className="text-sm text-warning-strong">
              Open the confirmation link we sent when you signed up. Members see whether your email is verified.
            </p>
          )}
        </div>
      </SettingsSection>

      <SettingsSection id="password" title="Password" description="If you signed in with Google, this adds a password you can also use.">
        <PasswordForm />
      </SettingsSection>

      <SettingsSection id="phone" title="Phone">
        <PhoneForm phone={priv?.phone ?? null} />
      </SettingsSection>

      <SettingsSection id="wallet" title="Coins and payouts" description="Your coin balance, and the bank account your earnings are withdrawn to.">
        <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
          <div className="space-y-0.5">
            <dt className="t-label-caps">Coin wallet</dt>
            <dd>{formatAmount(viewer.coins.wallet)}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="t-label-caps">Withdrawable</dt>
            <dd>{formatAmount(viewer.coins.earnings)}</dd>
          </div>
          <div className="space-y-0.5">
            <dt className="t-label-caps">Bank account and PAN</dt>
            <dd>{viewer.stats.identity_verified ? <Mark ok>Verified</Mark> : 'Not verified yet'}</dd>
          </div>
        </dl>
        <Button asChild variant="secondary" size="sm"><Link href="/wallet">Open wallet</Link></Button>
      </SettingsSection>

      <SettingsSection id="session" title="Sessions" description="Sign out of TrustLance on this device. Other devices stay signed in.">
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="secondary"><LogOut /> Sign out of this device</Button>
        </form>
      </SettingsSection>

      <SettingsSection id="delete" title="Delete account">
        <p className="max-w-prose text-sm text-ink-secondary">
          Account deletion is handled by our support team for now, because open contracts, escrowed funds and disputes have to be
          settled first. Contact support from the email address on this account and we will walk you through it.
        </p>
      </SettingsSection>
    </SettingsSections>
  );
}
