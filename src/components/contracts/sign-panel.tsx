'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Checkbox } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { signContract } from '@/lib/actions/contracts';
import { formatDateTime, shortAddress } from '@/lib/format';
import type { Contract } from '@/lib/types';

/**
 * Typed-name signature (keyboard and screen-reader friendly). The signature binds to the exact
 * terms hash shown here and records the signer's verified wallet.
 */
export function SignPanel({ contract, role, myName, walletAddress }: {
  contract: Contract;
  role: 'client' | 'freelancer';
  myName: string;
  walletAddress: string | null;
}) {
  const router = useRouter();
  const [name, setName] = React.useState('');
  const [agree, setAgree] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const signedAt = role === 'client' ? contract.client_signed_at : contract.freelancer_signed_at;

  const parties = [
    { label: 'Client', at: contract.client_signed_at, name: contract.client_signature_name, wallet: contract.client_wallet },
    { label: 'Freelancer', at: contract.freelancer_signed_at, name: contract.freelancer_signature_name, wallet: contract.freelancer_wallet },
  ];

  const sign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree || name.trim().length < 2) return;
    setBusy(true);
    const r = await signContract(contract.id, name, contract.terms_hash);
    setBusy(false);
    if (!r.ok) {
      toast.error(r.error.message);
      if (r.error.code === 'terms_changed') router.refresh();
      return;
    }
    toast.success(r.data === 'awaiting_funding' ? 'Signed by both parties. Escrow can now be funded.' : 'Signed. Waiting for the other party.');
    router.refresh();
  };

  return (
    <section id="sign" aria-labelledby="sign-title" className="panel scroll-mt-24 space-y-5 p-5 md:p-6">
      <div className="space-y-1">
        <h2 id="sign-title" className="t-section-title flex items-center gap-2"><PenLine className="size-5 text-brand" aria-hidden /> Signatures</h2>
        <p className="text-sm text-ink-secondary">Both parties sign the same version of the terms (fingerprint <span className="t-mono">{contract.terms_hash.slice(0, 12)}…</span>). Signing does not move money.</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {parties.map((p) => (
          <li key={p.label} className="rounded-lg border p-4">
            <p className="t-eyebrow">{p.label}</p>
            {p.at ? (
              <div className="mt-1 space-y-0.5 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-success-strong"><CheckCircle2 className="size-4" aria-hidden /> Signed by {p.name}</p>
                <p className="t-meta">{formatDateTime(p.at)} · wallet {shortAddress(p.wallet)}</p>
              </div>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-secondary"><Clock className="size-4" aria-hidden /> Not signed yet</p>
            )}
          </li>
        ))}
      </ul>

      {contract.status === 'pending_signatures' && !signedAt && (
        walletAddress ? (
          <form onSubmit={sign} className="space-y-4 rounded-lg border border-brand/25 bg-brand-soft/30 p-4">
            <Field label="Type your full name to sign" hint={`Signing as ${role}. Your verified wallet ${shortAddress(walletAddress)} will ${role === 'client' ? 'fund' : 'receive'} the escrow payments.`}>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={myName} autoComplete="name" maxLength={100} />
            </Field>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} className="mt-0.5" />
              <span>I have read the scope, deliverables, milestones and payment terms on this page and agree to them.</span>
            </label>
            <Button type="submit" loading={busy} disabled={!agree || name.trim().length < 2}>Sign contract</Button>
          </form>
        ) : (
          <Callout tone="warning" title="Verify your wallet before signing" action={<Button asChild size="sm" variant="secondary"><Link href="/wallet">Verify wallet</Link></Button>}>
            Escrow payments are {role === 'client' ? 'funded from' : 'paid to'} the wallet you verify. It is recorded with your signature.
          </Callout>
        )
      )}
    </section>
  );
}
