import { describe, expect, it } from 'vitest';
import { getAddress } from 'ethers';
import { toWei } from '@/lib/money';
import { escrowInterface, escrowKey, escrowRef } from './escrow';
import { interpretReceipt, type ReceiptLike, type VerifyContext } from './verify';

const ESCROW = '0x5fbdb2315678afecb367f032d93f642f64180aa3';
const CLIENT = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const FREELANCER = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';
const CONTRACT_ID = '8f14e45f-ceea-467a-9575-1e3b1d8b2d11';
const REF = escrowRef(CONTRACT_ID);
const KEY = escrowKey(getAddress(CLIENT), REF);

const milestones = [
  { id: 'm1', position: 1, amount: '100' },
  { id: 'm2', position: 2, amount: '200.5' },
];

function ctx(kind: VerifyContext['tx']['kind'], extra: Partial<VerifyContext['contract']> = {}, milestoneId: string | null = null): VerifyContext {
  return {
    tx: { id: 'tx1', kind, milestone_id: milestoneId },
    contract: { id: CONTRACT_ID, client_wallet: CLIENT, freelancer_wallet: FREELANCER, escrow_key: KEY, total_amount: '300.5', ...extra },
    milestones,
    escrowAddress: ESCROW,
    requiredConfirmations: 2,
  };
}

function receipt(event: string, args: unknown[], over: Partial<ReceiptLike> = {}): ReceiptLike {
  const log = escrowInterface.encodeEventLog(event, args);
  return { status: 1, to: ESCROW, from: CLIENT, blockNumber: 10, confirmations: 3, logs: [{ address: ESCROW, ...log }], ...over };
}

const fundArgs = (amounts = [toWei('100'), toWei('200.5')], client = CLIENT, freelancer = FREELANCER) =>
  [KEY, REF, client, freelancer, amounts.reduce((a, b) => a + b, 0n), amounts];

describe('interpretReceipt', () => {
  it('waits for mining and confirmations', () => {
    expect(interpretReceipt(null, ctx('fund')).action).toBe('wait');
    expect(interpretReceipt(receipt('Funded', fundArgs(), { confirmations: 1 }), ctx('fund')).action).toBe('wait');
  });

  it('fails reverted or misdirected transactions', () => {
    expect(interpretReceipt(receipt('Funded', fundArgs(), { status: 0 }), ctx('fund'))).toMatchObject({ action: 'fail' });
    expect(interpretReceipt(receipt('Funded', fundArgs(), { to: CLIENT }), ctx('fund'))).toMatchObject({ action: 'fail' });
  });

  it('applies a deposit that matches the signed contract exactly', () => {
    const d = interpretReceipt(receipt('Funded', fundArgs()), ctx('fund'));
    expect(d).toEqual({
      action: 'apply',
      rpc: 'apply_escrow_funding',
      args: { p_tx_id: 'tx1', p_block: 10, p_from: CLIENT, p_amount: '300.5', p_escrow_address: ESCROW, p_escrow_key: KEY },
    });
  });

  it('rejects deposits with wrong amounts, order or parties', () => {
    expect(interpretReceipt(receipt('Funded', fundArgs([toWei('200.5'), toWei('100')])), ctx('fund'))).toMatchObject({ action: 'fail' });
    expect(interpretReceipt(receipt('Funded', fundArgs(undefined, CLIENT, CLIENT.replace('8', '9'))), ctx('fund'))).toMatchObject({ action: 'fail' });
    expect(interpretReceipt(receipt('Funded', fundArgs()), ctx('fund', { total_amount: '300' }))).toMatchObject({ action: 'fail' });
  });

  it('maps a release to the right milestone position and amount', () => {
    const d = interpretReceipt(receipt('Released', [KEY, 1n, FREELANCER, toWei('200.5')]), ctx('release', {}, 'm2'));
    expect(d).toMatchObject({ action: 'apply', rpc: 'apply_escrow_release', args: { p_position: 2, p_amount: '200.5' } });
  });

  it('refuses a release for another agreement, milestone or recipient', () => {
    const otherKey = escrowKey(getAddress(FREELANCER), REF);
    expect(interpretReceipt(receipt('Released', [otherKey, 0n, FREELANCER, toWei('100')]), ctx('release'))).toMatchObject({ action: 'fail' });
    expect(interpretReceipt(receipt('Released', [KEY, 0n, FREELANCER, toWei('100')]), ctx('release', {}, 'm2'))).toMatchObject({ action: 'fail' });
    expect(interpretReceipt(receipt('Released', [KEY, 0n, CLIENT, toWei('100')]), ctx('release'))).toMatchObject({ action: 'fail' });
  });

  it('reads dispute settlement amounts from the event', () => {
    const d = interpretReceipt(receipt('DisputeResolved', [KEY, 0n, 40, toWei('40'), toWei('60')]), ctx('resolve'));
    expect(d).toMatchObject({ rpc: 'apply_escrow_resolution', args: { p_position: 1, p_freelancer_amount: '40', p_client_amount: '60' } });
  });

  it('fails when the expected event is missing', () => {
    expect(interpretReceipt(receipt('Refunded', [KEY, 0n, CLIENT, toWei('100')]), ctx('release'))).toMatchObject({ action: 'fail' });
  });
});
