import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, LogOut, Mail, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Facts } from '@/components/common/page-header';
import { requireViewer } from '@/lib/auth';
import { formatDate, shortAddress } from '@/lib/format';
import { createClient } from '@/lib/supabase/server';
import { PasswordForm } from './password-form';
import { PhoneForm } from './phone-form';

export const metadata: Metadata = { title: 'Account & security' };

function Panel({ id, title, description, children }: { id: string; title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="panel space-y-4 p-5 md:p-6" aria-labelledby={`${id}-title`}>
      <div className="space-y-1">
        <h2 id={`${id}-title`} className="t-section-title">{title}</h2>
        {description && <p className="text-sm text-ink-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default async function AccountSettingsPage() {
  const viewer = await requireViewer('/settings/account');
  const supabase = await createClient();
  const { data: priv, error } = await supabase.from('profile_private').select('phone').eq('id', viewer.id).maybeSingle<{ phone: string | null }>();
  if (error) throw error;

  return (
    <div className="space-y-6">
      <Panel id="email" title="Email" description="Used to sign in and for contract, payment and security notifications. Never shown publicly.">
        <div className="flex flex-wrap items-center gap-3">
          <Mail className="size-4 text-ink-muted" aria-hidden />
          <span className="break-all text-sm font-medium">{viewer.email ?? 'No email on file'}</span>
          {viewer.emailConfirmed
            ? <Badge tone="success"><CheckCircle2 aria-hidden /> Verified</Badge>
            : <Badge tone="warning">Not verified</Badge>}
        </div>
        {!viewer.emailConfirmed && (
          <Callout tone="warning" title="Verify your email">
            Open the confirmation link we sent when you signed up. Members see whether your email is verified.
          </Callout>
        )}
      </Panel>

      <Panel id="password" title="Password" description="If you signed in with Google, this adds a password you can also use.">
        <PasswordForm />
      </Panel>

      <Panel id="phone" title="Phone">
        <PhoneForm phone={priv?.phone ?? null} />
      </Panel>

      <Panel id="wallet" title="Wallet" description="Payments are released to, and refunds returned to, your verified wallet.">
        {viewer.wallet ? (
          <Facts
            items={[
              { label: 'Verified address', value: <span className="t-mono">{shortAddress(viewer.wallet.address)}</span> },
              { label: 'Verified on', value: formatDate(viewer.wallet.verified_at) },
            ]}
          />
        ) : (
          <p className="flex items-center gap-2 text-sm text-ink-secondary"><Wallet className="size-4 text-ink-muted" aria-hidden /> No verified wallet yet. You need one to sign or fund a contract.</p>
        )}
        <Button asChild variant="secondary" size="sm"><Link href="/wallet">{viewer.wallet ? 'Manage wallet' : 'Connect a wallet'}</Link></Button>
      </Panel>

      <Panel id="session" title="Sessions" description="Sign out of TrustLance on this device. Other devices stay signed in.">
        <form action="/auth/signout" method="post">
          <Button type="submit" variant="secondary"><LogOut /> Sign out of this device</Button>
        </form>
      </Panel>

      <Panel id="delete" title="Delete account">
        <p className="text-sm text-ink-secondary">
          Account deletion is handled by our support team for now, because open contracts, escrowed funds and disputes have to be
          settled first. Contact support from the email address on this account and we will walk you through it.
        </p>
      </Panel>
    </div>
  );
}
