import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AsOf, ConsoleHeader } from '@/components/admin/console-shell';
import { Panel, Stat, StatGrid } from '@/components/admin/stat';
import { BarList, Sparkline, Trend } from '@/components/admin/trend';
import { getOverview, getTimeseries, type DayPoint } from '@/lib/data/admin';
import { formatAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Overview' };

const count = (value: number) => value.toLocaleString('en-IN');
const coins = (value: number) => formatAmount(value, { symbol: false });

/**
 * What a platform team wants on opening the console: anything waiting for a person, then where the
 * money is, then how the marketplace is moving.
 *
 * The queues come first because they are the only part that is someone's job right now. The charts
 * are small multiples with one measure each — signups are a count and fees are coins, so sharing a
 * pair of axes would need two y-scales, the quickest way to make a chart lie.
 */
export default async function ConsoleOverviewPage() {
  const [overview, series] = await Promise.all([getOverview(), getTimeseries(30)]);
  const { members, projects, contracts, disputes, money, queues, arbitrators } = overview;

  const waiting = queues.attention + queues.withdrawals + queues.bank_accounts + queues.applications + queues.flagged_projects;
  const liveDisputes = disputes.open + disputes.awaiting_evidence + disputes.under_review + disputes.escalated;
  const spark = (pick: (d: DayPoint) => number) => series.map(pick);

  const QUEUES = [
    {
      label: 'Needs an arbitrator', value: queues.attention, unit: 'disputes', tone: 'danger' as const,
      href: '/admin/queues#attention',
      hint: queues.attention > 0 ? 'Open with nobody assigned, or escalated to the team.' : 'Every open dispute has one.',
    },
    {
      label: 'Withdrawals to pay', value: queues.withdrawals, unit: 'requests', tone: 'brand' as const,
      href: '/admin/queues#withdrawals',
      hint: queues.withdrawals > 0 ? `${coins(queues.withdrawals_coins)} coins to transfer` : 'Nothing to send.',
    },
    {
      label: 'Bank accounts to verify', value: queues.bank_accounts, unit: 'members', tone: 'warning' as const,
      href: '/admin/queues#bank-accounts',
      hint: queues.bank_accounts > 0 ? 'Checked before a first withdrawal.' : 'Nothing to check.',
    },
    {
      label: 'Arbitrator applications', value: queues.applications, unit: 'people', tone: 'brass' as const,
      href: '/admin/arbitrators',
      hint: queues.applications > 0 ? 'Eligibility checked; read their experience.' : 'None pending.',
    },
  ];

  return (
    <>
      <ConsoleHeader
        title="Overview"
        description="How TrustLance is doing today, and anything waiting for someone on the platform team."
        meta={<AsOf at={overview.generated_at} />}
        actions={
          <Button asChild variant={waiting > 0 ? 'primary' : 'secondary'}>
            <Link href="/admin/queues">
              {waiting > 0 ? `Work the queues · ${count(waiting)}` : 'Queues'} <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="space-y-10">
        <section aria-labelledby="queues-title">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 id="queues-title" className="font-sans text-base font-semibold tracking-tight">Waiting for a person</h2>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                waiting > 0
                  ? 'bg-warning-soft text-warning-strong ring-1 ring-inset ring-warning/30'
                  : 'bg-success-soft text-success-strong ring-1 ring-inset ring-success/25',
              )}
            >
              {waiting > 0
                ? <>{count(waiting)} item{waiting === 1 ? '' : 's'} in the queues</>
                : <><Check className="size-3.5" aria-hidden /> All clear</>}
            </span>
          </div>
          <StatGrid>
            {QUEUES.map((q) => (
              <Stat
                key={q.label}
                label={q.label}
                value={count(q.value)}
                unit={q.unit}
                hint={q.hint}
                tone={q.tone}
                href={q.href}
                urgent={q.value > 0}
              />
            ))}
          </StatGrid>
          {queues.flagged_projects > 0 && (
            <p className="mt-3 flex items-center gap-2 text-sm text-warning-strong">
              <AlertTriangle className="size-4 shrink-0" aria-hidden />
              {count(queues.flagged_projects)} project{queues.flagged_projects === 1 ? '' : 's'} flagged and still in the marketplace.
              <Link href="/admin/projects?moderation=flagged" className="font-medium underline underline-offset-4">Review</Link>
            </p>
          )}
        </section>

        <Panel
          id="money"
          bare
          title="Where the money is"
          description="Every coin on the platform sits in exactly one of these. One coin is ₹1."
          action={<Button asChild size="sm" variant="ghost"><Link href="/admin/money">The ledger <ArrowRight /></Link></Button>}
        >
          <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <StatGrid columns={2}>
              <Stat label="Locked in escrow" value={coins(money.escrow)} unit="coins" tone="brand"
                hint="Funded milestones on live contracts. Nobody can take this out."
                aside={<Sparkline points={spark((d) => d.funded_coins)} tone="brand" />} />
              <Stat label="Platform fees earned" value={coins(money.fees)} unit="coins" tone="brass"
                hint="Taken from each milestone as it was paid."
                aside={<Sparkline points={spark((d) => d.fees_coins)} tone="brass" />} />
              <Stat label="Waiting out the hold" value={coins(money.pending)} unit="coins" tone="warning"
                hint="Paid to freelancers, not yet withdrawable." />
              <Stat label="Withdrawable earnings" value={coins(money.earnings)} unit="coins" tone="success"
                hint="Past the hold and ready to withdraw." />
            </StatGrid>

            <div className="console-card space-y-3 p-4">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">Coins issued</p>
                <p className="console-figure text-lg">{coins(money.issued)}</p>
              </div>
              {money.issued > 0 ? (
                <BarList
                  total={money.issued}
                  format={coins}
                  items={[
                    { label: 'Member wallets', value: money.wallets, tone: 'info' },
                    { label: 'Locked in escrow', value: money.escrow, tone: 'brand' },
                    { label: 'Waiting out the hold', value: money.pending, tone: 'brass' },
                    { label: 'Withdrawable earnings', value: money.earnings, tone: 'success' },
                    { label: 'Platform fees', value: money.fees, tone: 'refund' },
                    { label: 'In transit', value: money.in_transit, tone: 'danger' },
                  ]}
                />
              ) : (
                <p className="text-xs leading-relaxed text-ink-muted">
                  No coins have been bought yet. Once a client funds a contract this breaks the total
                  down by where every coin sits.
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel id="activity" title="The last 30 days" description="One measure per chart, each on its own scale.">
          <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2 xl:grid-cols-4">
            <Trend title="New members" unit="members" tone="info" points={series.map((d) => ({ day: d.day, value: d.signups }))} />
            <Trend title="Projects published" unit="projects" tone="brand" points={series.map((d) => ({ day: d.day, value: d.projects }))} />
            <Trend title="Contracts funded" unit="contracts" tone="success" points={series.map((d) => ({ day: d.day, value: d.funded }))} />
            <Trend title="Platform fees" unit="coins" tone="brass" format={coins} points={series.map((d) => ({ day: d.day, value: d.fees_coins }))} />
          </div>
        </Panel>

        <Panel id="marketplace" bare title="The marketplace" description="Where everything on the platform currently stands.">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              {
                title: 'Members', total: members.total, foot: `${count(members.new_7d)} joined this week`,
                items: [
                  { label: 'Finished onboarding', value: members.onboarded, tone: 'success' as const },
                  { label: 'Hiring', value: members.hiring, tone: 'brand' as const },
                  { label: 'Looking for work', value: members.working, tone: 'info' as const },
                  { label: 'Suspended', value: members.suspended, tone: 'danger' as const },
                ],
              },
              {
                title: 'Projects', total: projects.total,
                foot: `${count(projects.new_7d)} posted this week · ${count(overview.proposals.pending)} proposals pending`,
                items: [
                  { label: 'Open for proposals', value: projects.open, tone: 'info' as const },
                  { label: 'Hired', value: projects.in_contract, tone: 'brand' as const },
                  { label: 'Completed', value: projects.completed, tone: 'success' as const },
                  { label: 'Flagged or removed', value: projects.flagged + projects.removed, tone: 'danger' as const },
                ],
              },
              {
                title: 'Contracts', total: contracts.total,
                foot: `${coins(Number(contracts.value))} coins contracted in total`,
                items: [
                  { label: 'Active', value: contracts.active, tone: 'brand' as const },
                  { label: 'Completed', value: contracts.completed, tone: 'success' as const },
                  { label: 'Awaiting signatures', value: contracts.pending_signatures, tone: 'brass' as const },
                  { label: 'In dispute', value: contracts.disputed, tone: 'danger' as const },
                ],
              },
            ].map((group) => (
              <div key={group.title} className="console-card space-y-3 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-ink-muted">{group.title}</p>
                  <p className="console-figure text-lg">{count(group.total)}</p>
                </div>
                {group.total > 0
                  ? <BarList total={group.total} items={group.items} />
                  : <p className="text-xs text-ink-muted">None yet.</p>}
                <p className="border-t border-line pt-2.5 text-xs text-ink-muted">{group.foot}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          id="trust"
          bare
          title="Disputes and arbitration"
          description="Cases in flight, and the people who decide them."
          action={<Button asChild size="sm" variant="ghost"><Link href="/admin/disputes">All cases <ArrowRight /></Link></Button>}
        >
          <StatGrid>
            <Stat label="Live cases" value={count(liveDisputes)} unit="disputes" tone={liveDisputes > 0 ? 'warning' : 'neutral'}
              hint={`${count(disputes.resolved)} resolved all time`} href="/admin/disputes?status=live"
              aside={<Sparkline points={spark((d) => d.disputes)} tone="danger" />} />
            <Stat label="Escalated to the team" value={count(disputes.escalated)} unit="disputes"
              tone={disputes.escalated > 0 ? 'danger' : 'neutral'} urgent={disputes.escalated > 0}
              hint={disputes.escalated > 0 ? 'An admin decides these.' : 'None escalated.'} href="/admin/queues#attention" />
            <Stat label="Arbitrators available" value={count(arbitrators.available)} unit="people" tone="brass"
              hint={`${count(arbitrators.approved)} approved · ${count(arbitrators.pending)} applied`} href="/admin/arbitrators" />
            <Stat label="Resolved, not settled" value={count(disputes.unsettled)} unit="disputes"
              tone={disputes.unsettled > 0 ? 'warning' : 'neutral'} urgent={disputes.unsettled > 0}
              hint={disputes.unsettled > 0 ? 'Decided but the coins have not moved.' : 'Every decision has settled.'} />
          </StatGrid>
        </Panel>
      </div>
    </>
  );
}
