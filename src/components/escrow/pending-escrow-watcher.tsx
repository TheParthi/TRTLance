'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

/**
 * Finds escrow transactions still "pending" on the given contracts and asks the server to verify
 * them, so a closed dialog or tab never leaves a confirmed transaction unrecorded. Refreshes the
 * page when any of them settles.
 */
export function PendingEscrowWatcher({ contractIds }: { contractIds: string[] }) {
  const router = useRouter();
  const key = Array.from(new Set(contractIds)).sort().join(',');

  React.useEffect(() => {
    if (!key) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      const { data } = await getBrowserClient()
        .from('escrow_transactions')
        .select('id')
        .in('contract_id', key.split(','))
        .eq('status', 'pending');
      if (stop) return;
      if (data?.length) {
        const results = await Promise.all(data.map((t) =>
          fetch('/api/escrow/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ txId: t.id }) })
            .then((r) => r.json()).catch(() => null)));
        if (stop) return;
        if (results.some((r) => r && r.status !== 'pending')) router.refresh();
        timer = setTimeout(tick, 5000);
      }
    };
    timer = setTimeout(tick, 1500);
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [key, router]);

  return null;
}
