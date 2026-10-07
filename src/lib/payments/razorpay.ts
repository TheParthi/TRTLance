import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Razorpay (https://razorpay.com/docs/api/) — orders, payment lookup and signature checks.
 * Coins are credited only for payments Razorpay reports as captured, and only for the exact order amount.
 */
const API = 'https://api.razorpay.com/v1';

function credentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set');
  return { keyId, keySecret };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { keyId, keySecret } = credentials();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      'content-type': 'application/json',
      ...init.headers,
    },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Razorpay ${path} failed (${res.status}): ${JSON.stringify(body?.error ?? body)}`);
  return body as T;
}

export async function createOrder(input: { amountPaise: number; receipt: string; notes: Record<string, string> }) {
  return call<{ id: string; amount: number; currency: string; status: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify({ amount: input.amountPaise, currency: 'INR', receipt: input.receipt.slice(0, 40), notes: input.notes }),
  });
}

export async function fetchPayment(paymentId: string) {
  return call<{ id: string; order_id: string; amount: number; currency: string; status: string }>(`/payments/${encodeURIComponent(paymentId)}`);
}

function safeEqualHex(expected: string, given: string) {
  const a = Buffer.from(expected, 'hex');
  const b = Buffer.from(given, 'hex');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

/** The signature Checkout returns: HMAC-SHA256 of "order_id|payment_id" with the key secret. */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string) {
  const expected = createHmac('sha256', credentials().keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return /^[0-9a-f]+$/i.test(signature) && safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC-SHA256 of the raw request body with the webhook secret. */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error('RAZORPAY_WEBHOOK_SECRET must be set');
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return /^[0-9a-f]+$/i.test(signature) && safeEqualHex(expected, signature);
}
