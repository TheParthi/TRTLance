'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Keeps the contract page current: re-verifies pending escrow transactions (so a closed tab never
 * leaves a deposit unrecorded) and refreshes when the contract, its milestones or transactions change.
 */
export function ContractLiveUpdates({ contractId, pendingTxIds }: { contractId: string; pendingTxIds: string[] }) {
  const router = useRouter();
  const key = pendingTxIds.join(',');

  React.useEffect(() => {
    if (!key) return;
    let stop = false;
    const tick = async () => {
      const results = await Promise.all(key.split(',').map((txId) =>
        fetch('/api/escrow/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txId }) })
          .then((r) => r.json()).catch(() => null)));
      if (stop) return;
      if (results.some((r) => r && r.status !== 'pending')) router.refresh();
      else timer = setTimeout(tick, 6000);
    };
    let timer = setTimeout(tick, 1500);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [key, router]);

  React.useEffect(() => {
    const supabase = getBrowserClient();
    let t: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(t);
      t = setTimeout(() => router.refresh(), 400);
    };
    const channel = supabase
      .channel(`contract:${contractId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts', filter: `id=eq.${contractId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `contract_id=eq.${contractId}` }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'escrow_transactions', filter: `contract_id=eq.${contractId}` }, refresh)
      .subscribe();
    return () => {
      clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [contractId, router]);

  return null;
}
