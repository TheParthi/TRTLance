/**
 * Minimal EIP-4361 (Sign-In with Ethereum) message used to prove wallet ownership.
 * The server issues the nonce, the wallet signs this text, and the server verifies the signature.
 */
export interface SiweFields {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}

export const SIWE_STATEMENT =
  'Verify this wallet for your TrustLance account. Signing is free and does not move any funds.';

export function buildSiweMessage(f: SiweFields) {
  return [
    `${f.domain} wants you to sign in with your Ethereum account:`,
    f.address,
    '',
    SIWE_STATEMENT,
    '',
    `URI: ${f.uri}`,
    'Version: 1',
    `Chain ID: ${f.chainId}`,
    `Nonce: ${f.nonce}`,
    `Issued At: ${f.issuedAt}`,
  ].join('\n');
}

export function parseSiweMessage(message: string): SiweFields | null {
  const lines = message.split('\n');
  const header = /^(.+) wants you to sign in with your Ethereum account:$/.exec(lines[0] ?? '');
  const address = lines[1] ?? '';
  const get = (key: string) => lines.find((l) => l.startsWith(`${key}: `))?.slice(key.length + 2);
  const chainId = Number(get('Chain ID'));
  const fields = { domain: header?.[1] ?? '', address, uri: get('URI') ?? '', chainId, nonce: get('Nonce') ?? '', issuedAt: get('Issued At') ?? '' };
  if (!header || !/^0x[0-9a-fA-F]{40}$/.test(address) || !fields.uri || !Number.isInteger(chainId) || !fields.nonce || !fields.issuedAt) {
    return null;
  }
  if (lines[3] !== SIWE_STATEMENT) return null;
  return fields;
}
