import 'server-only';

export type PaymentProvider = 'mock' | 'razorpay';

/**
 * Which provider takes coin payments. `mock` simulates a successful payment without real money, for
 * local development and demos; it is refused in production unless ALLOW_MOCK_PAYMENTS=true.
 */
export function paymentProvider(): PaymentProvider {
  if (process.env.PAYMENTS_PROVIDER === 'razorpay') return 'razorpay';
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
    throw new Error('Set PAYMENTS_PROVIDER=razorpay (or ALLOW_MOCK_PAYMENTS=true for a demo deployment)');
  }
  return 'mock';
}
