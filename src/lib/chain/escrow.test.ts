import { describe, expect, it } from 'vitest';
import { Wallet, verifyMessage } from 'ethers';
import { escrowKey, escrowRef } from './escrow';
import { buildSiweMessage, parseSiweMessage } from './siwe';

describe('escrow references', () => {
  it('matches the SQL contract_ref format (uuid bytes, right-padded to 32 bytes)', () => {
    expect(escrowRef('8f14e45f-ceea-467a-9575-1e3b1d8b2d11')).toBe(`0x8f14e45fceea467a95751e3b1d8b2d11${'0'.repeat(32)}`);
    expect(() => escrowRef('nope')).toThrow();
  });

  it('derives a key that depends on the client', () => {
    const ref = escrowRef('8f14e45f-ceea-467a-9575-1e3b1d8b2d11');
    const a = escrowKey('0x1111111111111111111111111111111111111111', ref);
    const b = escrowKey('0x2222222222222222222222222222222222222222', ref);
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    expect(a).not.toBe(b);
  });
});

describe('SIWE messages', () => {
  it('round-trips and verifies a real signature', async () => {
    const wallet = Wallet.createRandom();
    const message = buildSiweMessage({
      domain: 'trustlance.app', address: wallet.address, uri: 'https://trustlance.app', chainId: 8118,
      nonce: 'a1b2c3d4e5f6a7b8', issuedAt: '2026-10-05T10:00:00.000Z',
    });
    const parsed = parseSiweMessage(message);
    expect(parsed?.nonce).toBe('a1b2c3d4e5f6a7b8');
    const signature = await wallet.signMessage(message);
    expect(verifyMessage(message, signature)).toBe(wallet.address);
  });

  it('rejects tampered statements', () => {
    const message = buildSiweMessage({
      domain: 'x', address: Wallet.createRandom().address, uri: 'https://x', chainId: 1, nonce: 'n'.repeat(16), issuedAt: 'now',
    }).replace('does not move any funds', 'moves all your funds');
    expect(parseSiweMessage(message)).toBeNull();
  });
});
