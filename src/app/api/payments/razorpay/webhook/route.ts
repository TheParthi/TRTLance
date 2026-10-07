import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyWebhookSignature } from '@/lib/payments/razorpay';

export const runtime = 'nodejs';

type PaymentEntity = { id: string; order_id: string | null; amount: number; status: string; error_description?: string | null };

/**
 * Razorpay webhook (subscribe to payment.captured, order.paid and payment.failed). Credits coins for
 * captured payments even if the buyer closed the tab. Completing a purchase is idempotent, so the
 * webhook and the browser callback can both report the same payment.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  if (!verifyWebhookSignature(raw, signature)) return NextResponse.json({ error: 'invalid signature' }, { status: 400 });

  const event = JSON.parse(raw) as { event: string; payload: { payment?: { entity: PaymentEntity } } };
  const payment = event.payload.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, ignored: event.event });
  const admin = createAdminClient();

  if ((event.event === 'payment.captured' || event.event === 'order.paid') && payment.status === 'captured') {
    const { error } = await admin.rpc('complete_coin_purchase', {
      p_order_id: payment.order_id, p_payment_id: payment.id, p_amount_paise: payment.amount,
    });
    // An order we never created (another integration on the same account) is not an error for Razorpay.
    if (error && !error.message.startsWith('TL:not_found')) {
      console.error('[razorpay webhook]', error);
      return NextResponse.json({ error: 'not processed' }, { status: 500 });
    }
  } else if (event.event === 'payment.failed') {
    await admin.rpc('fail_coin_purchase', { p_order_id: payment.order_id, p_reason: payment.error_description ?? 'Payment failed.' });
  }
  return NextResponse.json({ ok: true });
}
