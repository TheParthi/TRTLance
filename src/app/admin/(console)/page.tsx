import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { AsOf, ConsoleHeader } from '@/components/admin/console-shell';
import { Panel, Stat, StatGrid } from '@/components/admin/stat';
import { BarList, Trend } from '@/components/admin/trend';
import { getOverview, getTimeseries } from '@/lib/data/admin';
import { formatAmount } from '@/lib/money';

export const metadata: Metadata = { title: 'Overview' };

const count = (value: number) => value.toLocaleString('en-IN');
const coins = (value: number) => formatAmount(value, { symbol: false });

/**
 * What a platform team wants on opening the console: anything waiting for a person, then how the
 * marketplace is moving, then where the money is.
 *
 * The queues come first because they are the only part that is someone's job right now. The charts
 * are small multiples with one measure each — signups are a count and fees are coins, so sharing a
 * pair of axes would need two y-scales, which is the quickest way to make a chart lie.
 */
export default async function ConsoleOverviewPage() {
  const [overview, series] = await Promise.all([getOverview(), getTimeseries(30)]);
  const { members, projects, contracts, disputes, money, queues, arbitrators } = overview;

  const waiting = queues.attention + queues.withdrawals + queues.bank_accounts + queues.applications + queues.flagged_projects;
  const liveDisputes = disputes.open + disputes.awaiting_evidence + disputes.under_review + disputes.escalated;

  return (
    <>
      <ConsoleHeader
        title="Overview"
        description="How TrustLance is doing today, and anything waiting for someone on the platform team."
        meta={<AsOf at={overview.generated_at} />}
        actions={
          <Button asChild variant={waiting > 0 ? 'primary' : 'secondary'}>
            <Link href="/admin/queues">
              {waiting > 0 ? `Work the queues (${count(waiting)})` : 'Queues'} <ArrowRight />
            </Link>
          </Button>
        }
      />

      <div className="space-y-12">
        {waiting === 0 ? (
          <Callout tone="success" title="Nothing is waiting">
            Every dispute has an arbitrator, there are no withdrawals to pay, no bank accounts to
            verify and no applications to review.
          </Callout>
        ) : (
          <StatGrid>
            <Stat
              label="Needs an arbitrator" value={count(queues.attention)} unit="disputes"
              hint={queues.attention > 0 ? 'Open with nobody assigned, or escalated to the platform team.' : 'All assigned.'}
              href="/admin/queues#attention" urgent={queues.attention > 0} tone="danger"
            />
            <Stat
              label="Withdrawals to pay" value={count(queues.withdrawals)} unit="requests"
              hint={queues.withdrawals > 0 ? `${coins(queues.withdrawals_coins)} coins to transfer` : 'Nothing to send.'}
              href="/admin/queues#withdrawals" urgent={queues.withdrawals > 0} tone="brand"
            />
            <Stat
              label="Bank accounts to verify" value={count(queues.bank_accounts)} unit="members"
              hint={queues.bank_accounts > 0 ? 'Checked before a member’s first withdrawal.' : 'Nothing to check.'}
              href="/admin/queues#bank-accounts" urgent={queues.bank_accounts > 0} tone="warning"
            />
            <Stat
              label="Arbitrator applications" value={count(queues.applications)} unit="people"
              hint={queues.applications > 0 ? 'Eligibility already checked; read their experience.' : 'None pending.'}
              href="/admin/arbitrators" urgent={queues.applications > 0} tone="brass"
            />
          </StatGrid>
        )}

        {queues.flagged_projects > 0 && (
          <Callout tone="warning" title={`${count(queues.flagged_projects)} project${queues.flagged_projects === 1 ? '' : 's'} flagged`}
            action={<Button asChild size="sm" variant="secondary"><Link href="/admin/projects?moderation=flagged">Review</Link></Button>}>
            Flagged projects stay in the marketplace. Clear the flag or remove them.
          </Callout>
        )}

        <Panel
          id="money"
          title="Where the money is"
          description="Every coin on the platform sits in exactly one of these. One coin is ₹1."
          action={<Button asChild size="sm" variant="ghost"><Link href="/admin/money">The ledger <ArrowRight /></Link></Button>}
        >
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
            <StatGrid className="border-y-0 py-0" columns={2}>
              <Stat label="Locked in escrow" value={coins(money.escrow)} unit="coins" tone="brand"
                hint="Funded milestones on live contracts. Nobody can take this out." />
              <Stat label="Platform fees earned" value={coins(money.fees)} unit="coins" tone="brass"
                hint="Taken from each milestone as it was paid." />
              <Stat label="Waiting out the hold" value={coins(money.pending)} unit="coins" tone="warning"
                hint="Paid to freelancers, not yet withdrawable." />
              <Stat label="Withdrawable earnings" value={coins(money.earnings)} unit="coins" tone="success"
                hint="Past the hold and ready to withdraw." />
            </StatGrid>

            <div className="space-y-3">
              <p className="t-label-caps">Coins issued, by where they sit</p>
              <BarList
                total={money.issued || 1}
                format={coins}
                items={[
                  { label: 'Member wallets', value: money.wallets, tone: 'info' },
                  { label: 'Locked in escrow', value: money.escrow, tone: 'brand' },
                  { label: 'Waiting out the hold', value: money.pending, tone: 'brass' },
                  { label: 'Withdrawable earnings', value: money.earnings, tone: 'success' },
                  { label: 'Platform fees', value: money.fees, tone: 'refund' },
                  { label: 'Withdrawals in transit', value: money.in_transit, tone: 'danger' },
                ]}
              />
              <p className="t-meta">{coins(money.issued)} coins issued in total.</p>
            </div>
          </div>
        </Panel>

        <Panel id="activity" title="The last 30 days" description="One measure per chart, each on its own scale.">
          <div className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <Trend title="New members" unit="members" tone="info" points={series.map((d) => ({ day: d.day, value: d.signups }))} />
            <Trend title="Projects published" unit="projects" tone="brand" points={series.map((d) => ({ day: d.day, value: d.projects }))} />
            <Trend title="Contracts funded" unit="contracts" tone="success" points={series.map((d) => ({ day: d.day, value: d.funded }))} />
            <Trend title="Platform fees" unit="coins" tone="brass" format={coins} points={series.map((d) => ({ day: d.day, value: d.fees_coins }))} />
          </div>
        </Panel>

        <Panel id="marketplace" title="The marketplace" description="Where everything on the platform currently stands.">
          <div className="grid gap-10 md:grid-cols-3">
            <div className="space-y-3">
              <p className="t-label-caps">Members ({count(members.total)})</p>
              <BarList
                total={members.total || 1}
                items={[
                  { label: 'Finished onboarding', value: members.onboarded, tone: 'success' },
                  { label: 'Hiring', value: members.hiring, tone: 'brand' },
                  { label: 'Looking for work', value: members.working, tone: 'info' },
                  { label: 'Suspended', value: members.suspended, tone: 'danger' },
                ]}
              />
              <p className="t-meta">{count(members.new_7d)} joined this week · {count(members.new_30d)} this month</p>
            </div>

            <div className="space-y-3">
              <p className="t-label-caps">Projects ({count(projects.total)})</p>
              <BarList
                total={projects.total || 1}
                items={[
                  { label: 'Open for proposals', value: projects.open, tone: 'info' },
                  { label: 'Hired', value: projects.in_contract, tone: 'brand' },
                  { label: 'Completed', value: projects.completed, tone: 'success' },
                  { label: 'Draft', value: projects.draft, tone: 'brass' },
                  { label: 'Flagged or removed', value: projects.flagged + projects.removed, tone: 'danger' },
                ]}
              />
              <p className="t-meta">{count(projects.new_7d)} posted this week · {count(overview.proposals.pending)} proposals pending</p>
            </div>

            <div className="space-y-3">
              <p className="t-label-caps">Contracts ({count(contracts.total)})</p>
              <BarList
                total={contracts.total || 1}
                items={[
                  { label: 'Active', value: contracts.active, tone: 'brand' },
                  { label: 'Completed', value: contracts.completed, tone: 'success' },
                  { label: 'Awaiting signatures', value: contracts.pending_signatures, tone: 'brass' },
                  { label: 'Awaiting funding', value: contracts.awaiting_funding, tone: 'info' },
                  { label: 'In dispute', value: contracts.disputed, tone: 'danger' },
                ]}
              />
              <p className="t-meta">{coins(Number(contracts.value))} coins contracted in total</p>
            </div>
          </div>
        </Panel>

        <Panel
          id="trust"
          title="Disputes and arbitration"
          description="Cases in flight, and the people who decide them."
          action={<Button asChild size="sm" variant="ghost"><Link href="/admin/disputes">All cases <ArrowRight /></Link></Button>}
        >
          <StatGrid className="border-t-0 pt-0">
            <Stat label="Live cases" value={count(liveDisputes)} unit="disputes" tone={liveDisputes > 0 ? 'warning' : 'neutral'}
              hint={`${count(disputes.resolved)} resolved all time`} href="/admin/disputes?status=live" />
            <Stat label="Escalated to the team" value={count(disputes.escalated)} unit="disputes"
              tone={disputes.escalated > 0 ? 'danger' : 'neutral'}
              hint={disputes.escalated > 0 ? 'An admin decides these.' : 'None escalated.'} href="/admin/queues#attention" />
            <Stat label="Arbitrators available" value={count(arbitrators.available)} unit="people" tone="brass"
              hint={`${count(arbitrators.approved)} approved · ${count(arbitrators.pending)} applied`} href="/admin/arbitrators" />
            <Stat label="Resolved, not yet settled" value={count(disputes.unsettled)} unit="disputes"
              tone={disputes.unsettled > 0 ? 'warning' : 'neutral'}
              hint={disputes.unsettled > 0 ? 'Decided but the coins have not moved.' : 'Every decision has settled.'} />
          </StatGrid>
          {disputes.unsettled > 0 && (
            <p className="flex items-start gap-1.5 text-sm text-warning-strong">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              A decided dispute whose coins have not moved is worth looking into — settlement normally
              happens in the same transaction as the decision.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}
