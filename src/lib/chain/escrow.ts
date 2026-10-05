import { AbiCoder, Interface, keccak256 } from 'ethers';
import abi from './escrow-abi.json';

export const escrowInterface = new Interface(abi);

/** On-chain reference for a TrustLance contract (mirrors app.contract_ref in SQL). */
export function escrowRef(contractId: string): string {
  const hex = contractId.replace(/-/g, '').toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(hex)) throw new Error('Invalid contract id');
  return `0x${hex}${'0'.repeat(32)}`;
}

/** Agreement key used by TrustLanceEscrow: keccak256(abi.encode(client, ref)). */
export function escrowKey(clientAddress: string, ref: string): string {
  return keccak256(AbiCoder.defaultAbiCoder().encode(['address', 'bytes32'], [clientAddress, ref])).toLowerCase();
}

export type EscrowFunction = 'fund' | 'release' | 'refund' | 'raiseDispute' | 'resolveDispute';

export const escrowEvents = {
  fund: 'Funded',
  release: 'Released',
  refund: 'Refunded',
  dispute: 'DisputeRaised',
  resolve: 'DisputeResolved',
} as const;
