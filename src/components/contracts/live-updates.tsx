'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

/** Keeps the contract page current: refreshes when the contract or its milestones change. */
export function ContractLiveUpdates({ contractId }: { contractId: string }) {
  const router = useRouter();

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
      .subscribe();
    return () => {
      clearTimeout(t);
      void supabase.removeChannel(channel);
    };
  }, [contractId, router]);

  return null;
}
