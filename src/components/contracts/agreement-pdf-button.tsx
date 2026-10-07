'use client';

import * as React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { COIN_NAME } from '@/lib/env';
import { formatDateTime } from '@/lib/format';
import { feePercent, formatAmount } from '@/lib/money';
import { contractStatus } from '@/lib/status';
import type { Contract, EscrowEntry, Milestone } from '@/lib/types';

/** Generates the signed agreement as a PDF from the contract record itself (never stale data). */
export function AgreementPdfButton({ contract, milestones, escrow }: { contract: Contract; milestones: Milestone[]; escrow: EscrowEntry[] }) {
  const [busy, setBusy] = React.useState(false);
  const download = async () => {
    setBusy(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const M = 48;
      let y = M;
      const ensure = (h: number) => {
        if (y + h > H - M) {
          doc.addPage();
          y = M;
        }
      };
      const text = (s: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; gap?: number } = {}) => {
        doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
        doc.setFontSize(opts.size ?? 10);
        doc.setTextColor(...(opts.color ?? [21, 27, 39]));
        const lines = doc.splitTextToSize(s, W - 2 * M) as string[];
        for (const line of lines) {
          ensure((opts.size ?? 10) * 1.4);
          doc.text(line, M, y);
          y += (opts.size ?? 10) * 1.4;
        }
        y += opts.gap ?? 4;
      };
      const t = contract.terms;

      doc.setFillColor(16, 82, 95);
      doc.rect(0, 0, W, 6, 'F');
      text('TrustLance', { size: 11, bold: true, color: [16, 82, 95] });
      text('Freelance service agreement', { size: 20, bold: true, gap: 2 });
      text(`Contract ${contract.id} · status: ${contractStatus[contract.status].label}`, { size: 9, color: [90, 98, 110], gap: 14 });

      text('Parties', { size: 12, bold: true });
      text(`Client: ${t.client.name} (@${t.client.username})`);
      text(`Freelancer: ${t.freelancer.name} (@${t.freelancer.username})`, { gap: 12 });

      text('Project', { size: 12, bold: true });
      text(t.project.title, { bold: true });
      text(t.scope, { gap: 8 });
      if (t.deliverables.length) {
        text('Deliverables', { bold: true });
        t.deliverables.forEach((d, i) => text(`${i + 1}. ${d}`, { gap: 1 }));
        y += 8;
      }

      text('Payment', { size: 12, bold: true });
      text(`Total: ${formatAmount(t.total_amount)} (${COIN_NAME}, 1 coin = ₹1, held in TrustLance escrow). Platform fee: ${t.platform_fee_pct ? `${t.platform_fee_pct}%` : feePercent(contract.fee_bps)} of each payment to the freelancer. Duration: ${t.duration_days} days.`, { gap: 6 });
      t.milestones.forEach((m) => {
        const live = milestones.find((x) => x.position === m.position);
        text(`${m.position}. ${m.title} — ${formatAmount(m.amount)} — due ${live?.due_date ?? `${m.due_in_days} days after funding`} — ${live ? live.status.replace('_', ' ') : 'pending'}`, { gap: 1 });
        if (m.description) text(`   ${m.description}`, { size: 9, color: [90, 98, 110], gap: 2 });
      });
      y += 6;
      text(t.payment_terms, { size: 9, color: [60, 66, 78], gap: 12 });

      text('Signatures', { size: 12, bold: true });
      text(contract.client_signed_at ? `Client: signed by "${contract.client_signature_name}" on ${formatDateTime(contract.client_signed_at)}` : 'Client: not signed');
      text(contract.freelancer_signed_at ? `Freelancer: signed by "${contract.freelancer_signature_name}" on ${formatDateTime(contract.freelancer_signed_at)}` : 'Freelancer: not signed');
      text(`Terms fingerprint (SHA-256): ${contract.terms_hash}`, { size: 8, color: [90, 98, 110], gap: 12 });

      if (escrow.length) {
        text('Escrow movements', { size: 12, bold: true });
        escrow.forEach((x) => text(`${formatDateTime(x.created_at)} · ${x.memo} · ${formatAmount(x.amount)} · in escrow after: ${formatAmount(x.balance_after)}`, { size: 8, gap: 1 }));
        y += 8;
      }
      text(`Generated ${formatDateTime(new Date())} from the TrustLance contract record. Signatures are typed-name electronic signatures bound to the terms fingerprint above.`, { size: 8, color: [120, 126, 136] });
      doc.save(`trustlance-agreement-${contract.id.slice(0, 8)}.pdf`);
    } catch (error) {
      console.error(error);
      toast.error('The PDF could not be generated.');
    } finally {
      setBusy(false);
    }
  };
  return <Button variant="secondary" onClick={download} loading={busy}>{!busy && <Download />} Download agreement (PDF)</Button>;
}
