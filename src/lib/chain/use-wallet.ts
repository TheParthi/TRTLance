'use client';

import * as React from 'react';
import { BrowserProvider, Contract as EthersContract, toBeHex, type Eip1193Provider } from 'ethers';
import { publicEnv } from '@/lib/env';
import abi from './escrow-abi.json';

declare global {
  interface Window {
    ethereum?: Eip1193Provider & {
      on?: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

export type WalletStatus = 'checking' | 'unavailable' | 'disconnected' | 'connecting' | 'connected';

export interface WalletState {
  status: WalletStatus;
  account: string | null;
  chainId: number | null;
  wrongNetwork: boolean;
  error: string | null;
}

/** Turns wallet/provider errors into sentences people can act on. */
export function walletErrorMessage(error: unknown): string {
  const e = error as { code?: number | string; shortMessage?: string; message?: string; info?: { error?: { code?: number } } };
  const code = e?.code ?? e?.info?.error?.code;
  if (code === 4001 || code === 'ACTION_REJECTED') return 'You rejected the request in your wallet. Nothing was sent.';
  if (code === -32002) return 'Your wallet already has a pending request. Open it to continue.';
  if (code === 'INSUFFICIENT_FUNDS') return `Your wallet does not have enough ${publicEnv.chain.symbol} for this amount plus network fees.`;
  if (code === 4902) return 'Your wallet does not know this network yet.';
  const msg = e?.shortMessage ?? e?.message ?? '';
  if (/insufficient funds/i.test(msg)) return `Your wallet does not have enough ${publicEnv.chain.symbol} for this amount plus network fees.`;
  if (/execution reverted/i.test(msg)) return 'The escrow contract refused this transaction. Nothing was sent.';
  return 'The wallet request failed. Nothing was sent. Try again.';
}

export function useWallet() {
  const [state, setState] = React.useState<WalletState>({ status: 'checking', account: null, chainId: null, wrongNetwork: false, error: null });
  const target = publicEnv.chain.id;

  const sync = React.useCallback(async () => {
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
    if (!eth) {
      setState({ status: 'unavailable', account: null, chainId: null, wrongNetwork: false, error: null });
      return;
    }
    const [accounts, chainHex] = await Promise.all([
      eth.request({ method: 'eth_accounts' }) as Promise<string[]>,
      eth.request({ method: 'eth_chainId' }) as Promise<string>,
    ]);
    const chainId = Number.parseInt(chainHex, 16);
    const account = accounts[0]?.toLowerCase() ?? null;
    setState((s) => ({
      ...s,
      status: account ? 'connected' : 'disconnected',
      account,
      chainId,
      wrongNetwork: Boolean(account && target && chainId !== target),
    }));
  }, [target]);

  React.useEffect(() => {
    void sync().catch(() => setState((s) => ({ ...s, status: 'disconnected' })));
    const eth = typeof window !== 'undefined' ? window.ethereum : undefined;
    if (!eth?.on) return;
    const handler = () => void sync();
    eth.on('accountsChanged', handler);
    eth.on('chainChanged', handler);
    eth.on('disconnect', handler);
    return () => {
      eth.removeListener?.('accountsChanged', handler);
      eth.removeListener?.('chainChanged', handler);
      eth.removeListener?.('disconnect', handler);
    };
  }, [sync]);

  const connect = React.useCallback(async () => {
    const eth = window.ethereum;
    if (!eth) return;
    setState((s) => ({ ...s, status: 'connecting', error: null }));
    try {
      await eth.request({ method: 'eth_requestAccounts' });
      await sync();
    } catch (error) {
      setState((s) => ({ ...s, status: 'disconnected', error: walletErrorMessage(error) }));
    }
  }, [sync]);

  const switchNetwork = React.useCallback(async () => {
    const eth = window.ethereum;
    if (!eth || !target) return;
    const chainId = toBeHex(target);
    try {
      await eth.request({ method: 'wallet_switchEthereumChain', params: [{ chainId }] });
    } catch (error) {
      if ((error as { code?: number }).code === 4902 && publicEnv.chain.rpcUrl) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId,
            chainName: publicEnv.chain.name || `Chain ${target}`,
            nativeCurrency: { name: publicEnv.chain.symbol, symbol: publicEnv.chain.symbol, decimals: 18 },
            rpcUrls: [publicEnv.chain.rpcUrl],
            blockExplorerUrls: publicEnv.chain.explorerUrl ? [publicEnv.chain.explorerUrl] : undefined,
          }],
        });
      } else {
        setState((s) => ({ ...s, error: walletErrorMessage(error) }));
        throw error;
      }
    }
    await sync();
  }, [sync, target]);

  return { ...state, connect, switchNetwork, refresh: sync };
}

/** Signer for the connected wallet. */
export async function getSigner() {
  if (!window.ethereum) throw new Error('No wallet available');
  const provider = new BrowserProvider(window.ethereum, 'any');
  return provider.getSigner();
}

/** Sends a call to the escrow contract and resolves as soon as it is broadcast (with its hash). */
export async function sendEscrowCall(fn: string, args: unknown[], value?: bigint): Promise<string> {
  const signer = await getSigner();
  const escrow = new EthersContract(publicEnv.chain.escrowAddress, abi, signer);
  const tx = await escrow.getFunction(fn)(...args, value !== undefined ? { value } : {});
  return (tx.hash as string).toLowerCase();
}

export async function getNativeBalance(address: string): Promise<bigint | null> {
  if (!window.ethereum) return null;
  const provider = new BrowserProvider(window.ethereum, 'any');
  try {
    return await provider.getBalance(address);
  } catch {
    return null;
  }
}
