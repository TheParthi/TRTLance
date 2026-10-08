import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Ban, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { Ledger, LedgerRow } from '@/components/common/ledger';
import { Money } from '@/components/common/money';
import { EmptyState } from '@/components/common/states';
import { MilestoneStatusBadge } from '@/components/common/status-badge';
import { ConsoleHeader } from '@/components/admin/console-shell';
import { Facts, Panel, Stat, StatGrid } from '@/components/admin/stat';
import { Mono } from '@/components/admin/table';
import { getAdminContractDetail } from '@/lib/data/admin';
import { disputeNumber, formatDate, formatDateTime } from '@/lib/format';
import { feePercent, formatAmount } from '@/lib/money';
import { coinTxLabel, contractStatus } from '@/lib/status';
import { cn } from '@/lib/utils';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!UUID.test(id)) return { title: 'Contract' };
  const detail = await getAdminContractDetail(id).catch(() => null);
  return { title: detail?.contract.title ?? 'Contract' };
}

/**
 * One contract, read end to end: the terms, each milestone, every coin that moved, and everything
 * that happened to it.
 *
 * The escrow movements and the event log are the two things worth having side by side when answering
 * "where did the money go" — the ledger says what moved and the events say who asked for it.
 */
export default async function ContractDetailPage({ params }: Params) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const detail = await getAdminContractDetail(id).catch(() => null);
  if (!detail) notFound();

  const { contract, client, freelancer, milestones, ledger, events, disputes } = detail;
  const paid = milestones.filter((m) => m.status === 'paid');
  const fees = milestones.reduce((sum, m) => sum + Number(m.platform_fee ?? 0), 0);

  return (
    <>
      <ConsoleHeader
        breadcrumb={{ label: 'All contracts', href: '/admin/contracts' }}
        title={contract.title}
        meta={
          <>
            <Badge tone={contractStatus[contract.status]?.tone ?? 'neutral'}>{contractStatus[contract.status]?.label ?? contract.status}</Badge>
            <Mono>{contract.id}</Mono>
            <span>Created {formatDate(contract.created_at)}</span>
          </>
        }
        actions={
          <Button asChild variant="secondary">
            <Link href={`/contracts/${contract.id}`}>Open the contract <ExternalLink /></Link>
          </Button>
        }
      />

      <div className="space-y-12">
        {disputes.some((d) => d.status !== 'resolved') && (
          <Callout tone="danger" title="This contract has a live dispute">
            A disputed milestone is frozen until an arbitrator decides it. Nothing can be released or
            refunded in the meantime.
          </Callout>
        )}

        <StatGrid>
          <Stat label="Contract value" value={formatAmount(contract.total_amount, { symbol: false })} unit="coins" tone="neutral"
            hint={`${milestones.length} milestone${milestones.length === 1 ? '' : 's'} · ${feePercent(contract.fee_bps)} platform fee`} />
          <Stat label="Still in escrow" value={formatAmount(detail.escrow_balance, { symbol: false })} unit="coins" tone="brand"
            hint={contract.funded_at ? `Funded ${formatDate(contract.funded_at)}` : 'Not funded yet.'} />
          <Stat label="Paid to the freelancer" value={formatAmount(paid.reduce((s, m) => s + Number(m.freelancer_payout ?? 0), 0), { symbol: false })} unit="coins" tone="success"
            hint={`${paid.length} of ${milestones.length} milestones released`} />
          <Stat label="Platform fee taken" value={formatAmount(fees, { symbol: false })} unit="coins" tone="brass"
            hint="Taken as each milestone was paid." />
        </StatGrid>

        <Panel title="The parties">
          <div className="grid gap-x-10 gap-y-6 md:grid-cols-2">
            {[{ role: 'Client', party: client, signed: contract.client_signed_at, name: contract.client_signature_name },
              { role: 'Freelancer', party: freelancer, signed: contract.freelancer_signed_at, name: contract.freelancer_signature_name }].map((side) => (
              <Facts
                key={side.role}
                items={[
                  {
                    label: side.role,
                    value: (
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Link href={`/admin/members/${side.party.id}`} className="font-medium hover:text-brand">{side.party.display_name}</Link>
                        <span className="t-meta">@{side.party.username}</span>
                        {side.party.suspended && <Badge tone="danger"><Ban /> Suspended</Badge>}
                      </span>
                    ),
                  },
                  {
                    label: 'Signed',
                    value: side.signed
                      ? <>{formatDateTime(side.signed)} as <span className="font-medium">{side.name}</span></>
                      : <span className="text-warning-strong">not signed</span>,
                  },
                ]}
              />
            ))}
          </div>
          <Facts
            className="mt-2"
            items={[
              { label: 'Terms hash', value: <Mono className="break-all">{contract.terms_hash}</Mono> },
              { label: 'Scope', value: <span className="whitespace-pre-line">{contract.scope}</span> },
              ...(contract.deliverables.length ? [{ label: 'Deliverables', value: <ul className="list-disc space-y-0.5 pl-4">{contract.deliverables.map((d) => <li key={d}>{d}</li>)}</ul> }] : []),
            ]}
          />
        </Panel>

        <Panel title={`Milestones (${milestones.length})`}>
          <Ledger empty={<EmptyState compact title="No milestones" description="This contract has none." />}>
            {milestones.map((m) => (
              <LedgerRow key={m.id} trail={<Money amount={m.amount} size="sm" />}>
                <p className="flex min-w-0 flex-wrap items-center gap-2">
                  <Mono>#{m.position}</Mono>
                  <span className="truncate font-medium">{m.title}</span>
                  <MilestoneStatusBadge status={m.status} />
                </p>
                <p className="t-meta">
                  {m.due_date ? `Due ${formatDate(m.due_date)}` : `Due ${m.due_in_days} days after funding`}
                  {m.paid_at ? ` · paid ${formatDate(m.paid_at)}` : ''}
                  {m.freelancer_payout ? ` · ${formatAmount(m.freelancer_payout)} to the freelancer` : ''}
                  {m.platform_fee ? ` · ${formatAmount(m.platform_fee)} fee` : ''}
                  {m.revision_count > 0 ? ` · ${m.revision_count} revision${m.revision_count === 1 ? '' : 's'}` : ''}
                </p>
              </LedgerRow>
            ))}
          </Ledger>
        </Panel>

        {disputes.length > 0 && (
          <Panel title={`Disputes (${disputes.length})`}>
            <Ledger>
              {disputes.map((d) => (
                <LedgerRow key={d.id} href={`/arbitration/cases/${d.id}`} className="group" trail={<Money amount={d.amount} size="sm" />}>
                  <p className="flex min-w-0 items-center gap-2">
                    <Mono>{disputeNumber(d.number)}</Mono>
                    <span className="font-medium">{d.status.replace(/_/g, ' ')}</span>
                    {d.status === 'resolved' && <Badge tone={d.settlement_status === 'settled' ? 'success' : 'warning'}>{d.settlement_status}</Badge>}
                  </p>
                  <p className="t-meta">
                    Opened {formatDate(d.created_at)}
                    {d.arbitrator_id ? ' · an arbitrator is assigned' : ' · no arbitrator yet'}
                  </p>
                </LedgerRow>
              ))}
            </Ledger>
          </Panel>
        )}

        <div className="grid gap-12 lg:grid-cols-2">
          <Panel title="Escrow movements" description="Every coin in and out of this contract's escrow, newest first.">
            <Ledger empty={<EmptyState compact title="Nothing has moved" description="This contract has not been funded." />}>
              {ledger.map((entry) => (
                <LedgerRow
                  key={entry.entry_id}
                  trail={
                    <span className="space-y-0.5 text-right">
                      <span className={cn('block t-money text-sm', entry.amount > 0 ? 'text-success-strong' : 'text-ink')}>
                        {entry.amount > 0 ? '+' : '−'}{formatAmount(Math.abs(entry.amount), { symbol: false })}
                      </span>
                      <span className="block t-meta">{formatAmount(entry.balance_after, { symbol: false })} held</span>
                    </span>
                  }
                >
                  <p className="font-medium">{coinTxLabel[entry.kind as keyof typeof coinTxLabel] ?? entry.kind}</p>
                  <p className="t-meta">{entry.memo} · {formatDateTime(entry.created_at)}</p>
                </LedgerRow>
              ))}
            </Ledger>
          </Panel>

          <Panel title="What happened" description="The contract's event log, newest first. Up to 100 entries.">
            <Ledger empty={<EmptyState compact title="No events" description="Nothing has been recorded yet." />}>
              {events.map((event) => (
                <LedgerRow key={event.id}>
                  <p className="font-medium">{event.type.replace(/[._]/g, ' ')}</p>
                  <p className="t-meta">{event.actor ?? 'The system'} · {formatDateTime(event.created_at)}</p>
                </LedgerRow>
              ))}
            </Ledger>
          </Panel>
        </div>
      </div>
    </>
  );
}
