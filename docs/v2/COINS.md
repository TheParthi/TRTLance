# TrustLance Coins

TrustLance runs payments in **TrustLance Coins**: 1 coin = ₹1, whole numbers only. They replace on-chain escrow (SHM on Shardeum), which the app no longer uses. The `blockchain/` folder is kept for reference only.

## How money moves

| Step | Who | What happens | Ledger movement |
|---|---|---|---|
| Buy coins | Client | Pays through Razorpay (UPI, cards, net banking). Coins are credited only after the server verifies a captured payment for the exact order amount. | gateway → wallet |
| Post a project | Client | Needs at least the budget in their wallet. Nothing is locked yet. | none |
| Fund the contract | Client | After both sign, the full total is locked in that contract's escrow. | wallet → escrow |
| Release a milestone | Client (approve, or pay early) | The client-set milestone amount leaves escrow. The platform fee (`contracts.fee_bps`, 10% by default, fixed when the contract is created) is taken from the freelancer's share. | escrow → platform_fees + pending |
| Auto-release | System | A submitted milestone with no client response for `auto_release_days` (7) pays out automatically. | as above |
| Hold | System | The freelancer's share is held for `hold_working_days` (7) working days (Mon–Fri, minus `public.holidays`). | pending → earnings |
| Refund | Freelancer | Returns an unpaid milestone to the client. | escrow → wallet |
| Dispute | Arbitrator / admin | The milestone is frozen; the decision settles immediately. | escrow → fees + pending + client wallet |
| Withdraw | Freelancer | Needs a verified bank account and PAN. An admin pays it out by bank transfer and records the UTR. | earnings → payouts_in_transit → gateway |

Purchased coins can only be spent, not withdrawn; only earnings go to a bank account.

## Safety properties (enforced in the database)

- **Double-entry ledger** (`coin_accounts`, `coin_transactions`, `coin_entries`): every movement debits one account and credits another, so all entries sum to zero. Entries and transactions are append-only (a trigger rejects edits and deletes).
- **No overdraft**: user and escrow accounts can't go below zero. Accounts are locked in id order, which avoids deadlocks.
- **Users never write money tables.** All movements go through `SECURITY DEFINER` functions that check the caller's role and the contract and milestone state. Purchase completion and the scheduled job are callable only by the service role.
- **Idempotent**: completing a payment, funding, releasing and withdrawing are safe to repeat (a webhook and the browser callback can both report the same payment).
- **Bank details**: the full account number and PAN can't be read back through the API, not even by their owner. Admins see them only through `admin_*_queue()`. Admins can't verify their own account or pay out their own withdrawal.

Tests: `supabase/tests/db/coins.test.ts` (ledger balance, fees, hold, working days, auto-release, withdrawals, privacy) plus the journey, dispute and security suites. `e2e/escrow-journey.spec.ts` runs the whole flow through the UI with test payments.

## Running it

| Setting | Purpose |
|---|---|
| `PAYMENTS_PROVIDER` | `razorpay` for real payments. Leave it empty locally for **test payments**: a confirm step instead of a real charge. Test payments are refused in production unless `ALLOW_MOCK_PAYMENTS=true`. |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` | Razorpay API keys. Use test-mode keys first. |
| `RAZORPAY_WEBHOOK_SECRET` | Webhook `https://<site>/api/payments/razorpay/webhook`, subscribed to `payment.captured`, `order.paid` and `payment.failed`. |
| `CRON_SECRET` | Call `GET /api/cron/coin-jobs` with `Authorization: Bearer <CRON_SECRET>` every 15–60 minutes (for example with Cloud Scheduler). Holds also clear whenever a member opens their wallet. |

Change fees and limits in `public.platform_settings` (`fee_bps`, `hold_working_days`, `auto_release_days`, `min_milestone_coins`, `min_purchase_coins`, `max_purchase_coins`, `min_withdrawal_coins`). Add public holidays to `public.holidays`.

## Before going live

- **Regulation**: coins that can be cashed out count as stored value. The real money must sit with a licensed payment aggregator or escrow provider (for example Razorpay Route or Cashfree Easy Split, or a bank-backed escrow agent), not in TrustLance's own bank account. Confirm the structure, GST on the platform fee and TDS (section 194-O) with a CA or lawyer.
- **Reconciliation**: check every day that the `gateway` account balance matches the money the provider holds.
- **Payouts**: withdrawals are paid by hand from the admin page today. They can be automated with RazorpayX Payouts later.
