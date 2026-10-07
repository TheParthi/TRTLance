'use client';

import * as React from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { Coins, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { AmountInput } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { completeMockPurchase, confirmRazorpayPayment, startCoinPurchase, type CoinCheckout } from '@/lib/actions/coins';
import { CURRENCY } from '@/lib/env';
import { formatAmount, formatRupees, parseAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

const PACKS = [1000, 5000, 10000, 25000];

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayInstance = { open: () => void; on: (event: string, cb: (r: { error?: { description?: string } }) => void) => void };
declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

/**
 * Buying coins: pick a pack or type an amount, pay with Razorpay (UPI, cards, net banking), and the coins
 * land in the wallet once the payment is verified on the server. Without Razorpay keys the app runs in
 * test mode, where a confirm step stands in for the payment and no real money moves.
 */
export function BuyCoins({ initial, min, max, paisePerCoin, next }: {
  initial: number | null;
  min: number;
  max: number;
  paisePerCoin: number;
  /** Where to send the buyer after a successful purchase (for example back to the contract they are funding). */
  next: string | null;
}) {
  const router = useRouter();
  const [amount, setAmount] = React.useState(initial ? String(Math.max(initial, min)) : '5000');
  const [busy, setBusy] = React.useState(false);
  const [mock, setMock] = React.useState<CoinCheckout | null>(null);
  const coins = parseAmount(amount);
  const valid = coins !== null && coins >= BigInt(min) && coins <= BigInt(max);
  const error = amount && !valid ? `Buy between ${formatAmount(min)} and ${formatAmount(max)} at a time, in whole coins.` : undefined;

  const done = (status: 'paid' | 'processing' | 'failed', count: number) => {
    if (status === 'paid') {
      toast.success(`${formatAmount(count)} added to your wallet.`);
      if (next) router.push(next);
      else router.refresh();
    } else if (status === 'processing') {
      toast.info('Payment received and being confirmed. Your coins appear as soon as the bank confirms it.');
    } else {
      toast.error('The payment did not go through. No coins were added.');
    }
  };

  const buy = async () => {
    if (!valid || coins === null) return;
    setBusy(true);
    const r = await startCoinPurchase(Number(coins));
    if (!r.ok) {
      setBusy(false);
      return toast.error(r.error.message);
    }
    const checkout = r.data;
    if (checkout.provider === 'mock') {
      setBusy(false);
      return setMock(checkout);
    }
    if (!window.Razorpay || !checkout.keyId) {
      setBusy(false);
      return toast.error('The payment window could not load. Check your connection and try again.');
    }
    const rzp = new window.Razorpay({
      key: checkout.keyId,
      order_id: checkout.orderId,
      amount: checkout.amountPaise,
      currency: 'INR',
      name: 'TrustLance',
      description: `${formatAmount(checkout.coins)}`,
      prefill: checkout.prefill,
      theme: { color: '#10525f' },
      handler: async (response: RazorpayResponse) => {
        const c = await confirmRazorpayPayment({
          orderId: response.razorpay_order_id, paymentId: response.razorpay_payment_id, signature: response.razorpay_signature,
        });
        setBusy(false);
        if (!c.ok) return toast.error(c.error.message);
        done(c.data, checkout.coins);
      },
      modal: { ondismiss: () => setBusy(false) },
    });
    rzp.on('payment.failed', (e) => toast.error(e.error?.description ?? 'The payment failed.'));
    rzp.open();
  };

  const confirmMock = async () => {
    if (!mock) return;
    setBusy(true);
    const r = await completeMockPurchase(mock.orderId);
    setBusy(false);
    setMock(null);
    if (!r.ok) return toast.error(r.error.message);
    done(r.data as 'paid' | 'failed', mock.coins);
  };

  return (
    <div className="space-y-5">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Coin packs">
        {PACKS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setAmount(String(p))}
            aria-pressed={coins === BigInt(p)}
            className={cn(
              'rounded-xl border px-4 py-3 text-left transition-colors duration-base ease-ledger hover:border-brand',
              coins === BigInt(p) ? 'border-brand bg-brand-soft' : 'border-line',
            )}
          >
            <span className="t-money block text-lg">{formatAmount(p, { symbol: false })}</span>
            <span className="t-meta">{formatRupees(p * paisePerCoin)}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Or enter an amount" hint={valid && coins !== null ? `You pay ${formatRupees(Number(coins) * paisePerCoin)}` : '1 coin = ₹1'} error={error} className="w-56">
          <AmountInput unit={CURRENCY} value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="numeric" placeholder="5000" />
        </Field>
        <Button onClick={() => void buy()} loading={busy} disabled={!valid}><Coins /> Buy coins</Button>
      </div>

      <Dialog open={mock !== null} onOpenChange={(o) => !o && !busy && setMock(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Test payment</DialogTitle>
            <DialogDescription>
              This deployment has no payment provider connected, so no real money moves. Confirm to add the coins as if the
              payment succeeded.
            </DialogDescription>
          </DialogHeader>
          {mock && (
            <dl className="divide-y border-y text-sm">
              <div className="flex justify-between py-2.5"><dt className="text-ink-muted">Coins</dt><dd>{formatAmount(mock.coins)}</dd></div>
              <div className="flex justify-between py-2.5"><dt className="text-ink-muted">Price</dt><dd>{formatRupees(mock.amountPaise)}</dd></div>
            </dl>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setMock(null)} disabled={busy}>Cancel</Button>
            <Button onClick={() => void confirmMock()} loading={busy}><FlaskConical /> Confirm test payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
