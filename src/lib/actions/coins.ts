'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { attempt, fail, type ActionResult } from '@/lib/errors';
import { paymentProvider, type PaymentProvider } from '@/lib/payments/provider';
import { createOrder, fetchPayment, verifyCheckoutSignature } from '@/lib/payments/razorpay';

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw { message: 'TL:not_authenticated', details: 'Sign in to continue.' };
  return { supabase, user: data.user };
}

function refreshWallet() {
  revalidatePath('/wallet');
  revalidatePath('/', 'layout');
}

export interface CoinCheckout {
  provider: PaymentProvider;
  orderId: string;
  coins: number;
  amountPaise: number;
  keyId: string | null;
  prefill: { name: string; email: string };
}

/** Creates a purchase and the payment provider's order. Coins are credited only after payment. */
export async function startCoinPurchase(coins: number): Promise<ActionResult<CoinCheckout>> {
  if (!Number.isInteger(coins) || coins <= 0) return fail('validation', 'Enter a whole number of coins.');
  return attempt(async () => {
    const { supabase, user } = await session();
    const provider = paymentProvider();
    const admin = createAdminClient();
    const { data: purchase, error } = await admin.rpc('create_coin_purchase', { p_user: user.id, p_coins: coins, p_provider: provider });
    if (error) throw error;
    const { id, amount_paise: amountPaise } = purchase as { id: string; amount_paise: number };

    const orderId = provider === 'razorpay'
      ? (await createOrder({ amountPaise, receipt: `coins_${id}`, notes: { purchase_id: id, user_id: user.id, coins: String(coins) } })).id
      : `mock_${randomUUID()}`;
    const attached = await admin.rpc('attach_coin_purchase_order', { p_purchase_id: id, p_order_id: orderId });
    if (attached.error) throw attached.error;

    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
    return {
      provider,
      orderId,
      coins,
      amountPaise,
      keyId: provider === 'razorpay' ? process.env.RAZORPAY_KEY_ID ?? null : null,
      prefill: { name: profile?.display_name ?? '', email: user.email ?? '' },
    };
  });
}

async function ownPurchase(orderId: string, userId: string) {
  const { data, error } = await createAdminClient()
    .from('coin_purchases').select('user_id, provider, amount_paise, status').eq('provider_order_id', orderId).maybeSingle();
  if (error) throw error;
  if (!data || data.user_id !== userId) throw { message: 'TL:not_found', details: 'Purchase not found.' };
  return data as { user_id: string; provider: PaymentProvider; amount_paise: number; status: string };
}

/** Test payments only: completes a mock order as if the provider had confirmed it. */
export async function completeMockPurchase(orderId: string): Promise<ActionResult<string>> {
  return attempt(async () => {
    const { user } = await session();
    if (paymentProvider() !== 'mock') throw { message: 'TL:forbidden', details: 'Test payments are turned off.' };
    const purchase = await ownPurchase(orderId, user.id);
    if (purchase.provider !== 'mock') throw { message: 'TL:forbidden', details: 'This is not a test payment.' };
    const { data, error } = await createAdminClient().rpc('complete_coin_purchase', {
      p_order_id: orderId, p_payment_id: `mock_pay_${randomUUID()}`, p_amount_paise: purchase.amount_paise,
    });
    if (error) throw error;
    refreshWallet();
    return data as string;
  });
}

/**
 * Called with the response Razorpay Checkout hands the browser. The signature proves it came from
 * Razorpay; the payment is then looked up so only captured money for the exact amount is credited.
 * The webhook does the same independently, so a closed tab never loses a payment.
 */
export async function confirmRazorpayPayment(input: { orderId: string; paymentId: string; signature: string }): Promise<ActionResult<'paid' | 'processing' | 'failed'>> {
  return attempt(async () => {
    const { user } = await session();
    await ownPurchase(input.orderId, user.id);
    if (!verifyCheckoutSignature(input.orderId, input.paymentId, input.signature)) {
      throw { message: 'TL:payment_invalid', details: 'We could not verify this payment. If money left your account, contact support.' };
    }
    const payment = await fetchPayment(input.paymentId);
    if (payment.order_id !== input.orderId) throw { message: 'TL:payment_invalid', details: 'This payment belongs to another order.' };
    if (payment.status !== 'captured') return payment.status === 'failed' ? 'failed' : 'processing';
    const { data, error } = await createAdminClient().rpc('complete_coin_purchase', {
      p_order_id: input.orderId, p_payment_id: payment.id, p_amount_paise: payment.amount,
    });
    if (error) throw error;
    refreshWallet();
    return data as 'paid' | 'failed';
  });
}

export async function savePayoutAccount(input: { holder: string; accountNumber: string; ifsc: string; pan: string }): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('save_payout_account', {
      p_holder: input.holder, p_account_number: input.accountNumber, p_ifsc: input.ifsc, p_pan: input.pan,
    });
    if (error) throw error;
    refreshWallet();
    return null;
  });
}

export async function requestWithdrawal(coins: number, idempotencyKey: string): Promise<ActionResult<string>> {
  if (!Number.isInteger(coins) || coins <= 0) return fail('validation', 'Enter a whole number of coins.');
  return attempt(async () => {
    const { supabase } = await session();
    const { data, error } = await supabase.rpc('request_withdrawal', { p_coins: coins, p_idempotency_key: idempotencyKey });
    if (error) throw error;
    refreshWallet();
    return data as string;
  });
}

export async function cancelWithdrawal(withdrawalId: string): Promise<ActionResult<null>> {
  return attempt(async () => {
    const { supabase } = await session();
    const { error } = await supabase.rpc('cancel_withdrawal', { p_withdrawal_id: withdrawalId });
    if (error) throw error;
    refreshWallet();
    return null;
  });
}

// ---------------------------------------------------------------------------
// Platform admins
// ---------------------------------------------------------------------------
async function adminRpc(name: string, args: Record<string, unknown>) {
  const { supabase } = await session();
  const { error } = await supabase.rpc(name, args);
  if (error) throw error;
  revalidatePath('/admin');
  return null;
}

export async function reviewPayoutAccount(userId: string, approve: boolean, note: string): Promise<ActionResult<null>> {
  return attempt(() => adminRpc('admin_review_payout_account', { p_user: userId, p_approve: approve, p_note: note || null }));
}

export async function completeWithdrawal(withdrawalId: string, reference: string): Promise<ActionResult<null>> {
  return attempt(() => adminRpc('admin_complete_withdrawal', { p_withdrawal_id: withdrawalId, p_reference: reference }));
}

export async function failWithdrawal(withdrawalId: string, reason: string): Promise<ActionResult<null>> {
  return attempt(() => adminRpc('admin_fail_withdrawal', { p_withdrawal_id: withdrawalId, p_reason: reason }));
}
