# Blockchain, tokens and payments

## Smart contracts

All contracts are Solidity `^0.8.20`, compiled by Hardhat with the optimizer at 200 runs. Only `backend/contracts/` is compiled; `blockchain/contracts/` holds older copies (`Escrow.sol` is byte-identical; its `TrustToken.sol` is a cut-down fixed-supply variant). There are **no contract tests** — `npm test` points at a `test/` folder that does not exist.

### ProjectEscrow — the full design (`backend/contracts/ProjectEscrow.sol`, 311 lines)

Milestone escrow in the chain's native coin with admin arbitration. Uses OpenZeppelin `ReentrancyGuard` and `Ownable`.

| Function | Who | What it does |
|---|---|---|
| `createEscrow(projectId, freelancer, amounts[])` payable | client | Requires `msg.value` = sum of milestones; stores the escrow as FUNDED |
| `approveMilestone(projectId, index)` | client | Marks the milestone approved and **pays the freelancer immediately**; COMPLETED when all are paid |
| `raiseDispute(projectId)` | either party | Freezes approvals (status DISPUTED) |
| `resolveDispute(projectId, outcome, pct)` | platform admin | FREELANCER → remaining to freelancer; CLIENT → refund; PARTIAL → `pct`% to freelancer, rest to client |
| `getEscrow`, `getMilestones`, `updatePlatformAdmin`, `version` | — | Views and admin rotation |

Reentrancy handling is sound (value-moving functions are `nonReentrant`). Weaknesses: project ids are caller-chosen and can be squatted, arbitration is a single admin key, there is no cancel/deadline/auto-release, and no platform fee.

<div class="callout"><span class="callout-title">This is the contract the product needs</span><code>ProjectEscrow</code> already encodes the TrustLance promise — per-milestone locking, payment on approval, disputes that freeze funds and a percentage split decided by an arbiter — and its <code>resolveDispute</code> signature matches the output of the LangChain dispute agent. It is deployed on Polygon Amoy but <b>no frontend code references it</b>.</div>

### Escrow — what the app actually uses (`backend/contracts/Escrow.sol`, 54 lines)

A native-SHM deposit box for Shardeum.

- `lockFunds(string projectId)` payable — records `{ amount, client, active }`, emits `FundsLocked`.
- `emergencyWithdraw()` onlyOwner — sends the **entire contract balance to the owner**.
- `getBalance()` view.

There is **no release, no refund, no freelancer address and no dispute logic**; `FundsReleased` is declared but never emitted, and projects never become inactive.

### TrustToken (TRT)

A hand-written ERC-20 ("TrustLance Token", 1,000,000 minted to the deployer, owner-only uncapped `mint`). Its only deployment attempt, on Shardeum, failed with "provided fee < minimum global fee" (`backend/deploy_success.txt` — the file name is misleading). The frontend's TRT address is `0x000…000` ("DUMMY - TRT removed"), and the ABI in `src/lib/contracts/token-contract.ts` (`lockTokens`, `releaseTokens`, …) matches **no contract in the repo**.

## Networks and deployments

| Network | Chain id | Configured in Hardhat | Deployed contract | Address |
|---|---|---|---|---|
| Polygon Amoy (testnet) | 80002 | ✔ (`POLYGON_AMOY_RPC`) | ProjectEscrow, 23 Jan 2026 | `0x2DC618147ee8360CD83d5ed3368525B920F2712F` |
| Shardeum (labelled "Mainnet") | 8118 | ✔ (RPC hard-coded) | Escrow, 14 Feb 2026 | `0x2DC618147ee8360CD83d5ed3368525B920F2712F` |
| Sepolia | 11155111 | ✔ | none | — |
| Polygon mainnet | 137 | ✔ | none | — |

The two deployments share one address because both were the deployer's first transaction (`0xD62C…2A79`, nonce 0) on their chain — only the chain id tells them apart. The frontend uses hard-coded values in `src/lib/config.ts`: chain `8118`, escrow `0x2DC6…712F`. The `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS` / `NEXT_PUBLIC_CHAIN_ID` variables printed by the deploy script are never read. Explorer links point to the legacy Sphinx testnet explorer, and some UI labels say "Shardeum Sphinx" while the config says mainnet.

Deployment scripts: `scripts/deploy.js` deploys ProjectEscrow (`npm run deploy:amoy|polygon|local`); `scripts/deploy_shardeum.js` deploys Escrow and has **no npm script**.

## The platform token

"Tokens" are **integers in Supabase**, not an on-chain asset: `user_wallets.token_balance`, with every movement recorded in `token_transactions`. The conversion is fixed in code at **1 token = ₹10**.

| Operation | Route | Real money? |
|---|---|---|
| Buy | `POST /api/wallet/buy` | No — mock payment, credited instantly |
| Spend (hire) | `POST /api/bids/[id]/accept` | No — debit; auto top-up to 1000 if short |
| Receive (milestone) | `POST /api/contracts/[id]/milestones/[i]/release` | No — credit |
| Redeem | `POST /api/wallet/redeem` | No — request stays PENDING; no payout rail |

## End-to-end money flow

<figure>
<svg viewBox="0 0 760 300" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Helvetica, Arial" font-size="10.5">
  <defs><marker id="r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b91c1c"/></marker><marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#15803d"/></marker></defs>
  <text x="10" y="20" font-weight="700" fill="#b91c1c">On-chain (SHM, Shardeum 8118)</text>
  <rect x="10" y="32" width="150" height="50" rx="8" fill="#fff" stroke="#b91c1c"/><text x="85" y="54" text-anchor="middle" font-weight="600">Client MetaMask</text><text x="85" y="70" text-anchor="middle" fill="#6b7389" font-size="9">posts project</text>
  <rect x="230" y="32" width="170" height="50" rx="8" fill="#fdf1f1" stroke="#b91c1c"/><text x="315" y="54" text-anchor="middle" font-weight="600">Escrow contract</text><text x="315" y="70" text-anchor="middle" fill="#6b7389" font-size="9">lockFunds(PROJ_xxxxx)</text>
  <rect x="470" y="32" width="150" height="50" rx="8" fill="#fff" stroke="#b91c1c"/><text x="545" y="54" text-anchor="middle" font-weight="600">Deployer wallet</text><text x="545" y="70" text-anchor="middle" fill="#6b7389" font-size="9">emergencyWithdraw()</text>
  <line x1="160" y1="57" x2="228" y2="57" stroke="#b91c1c" stroke-width="1.6" marker-end="url(#r)"/>
  <line x1="400" y1="57" x2="468" y2="57" stroke="#b91c1c" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#r)"/>
  <text x="640" y="52" fill="#b91c1c" font-size="9.5">never reaches the</text><text x="640" y="65" fill="#b91c1c" font-size="9.5">freelancer; tx hash</text><text x="640" y="78" fill="#b91c1c" font-size="9.5">discarded by /api/jobs</text>
  <line x1="10" y1="110" x2="750" y2="110" stroke="#dfe3ec" stroke-dasharray="6 4"/>
  <text x="10" y="135" font-weight="700" fill="#15803d">Off-chain (platform tokens in Supabase, 1 token = ₹10)</text>
  <rect x="10" y="150" width="140" height="56" rx="8" fill="#fff" stroke="#15803d"/><text x="80" y="172" text-anchor="middle" font-weight="600">Token store</text><text x="80" y="188" text-anchor="middle" fill="#6b7389" font-size="9">BUY (mock payment)</text>
  <rect x="190" y="150" width="150" height="56" rx="8" fill="#effaf3" stroke="#15803d"/><text x="265" y="172" text-anchor="middle" font-weight="600">Client token balance</text><text x="265" y="188" text-anchor="middle" fill="#6b7389" font-size="9">user_wallets</text>
  <rect x="380" y="150" width="150" height="56" rx="8" fill="#fff" stroke="#15803d"/><text x="455" y="172" text-anchor="middle" font-weight="600">Contract</text><text x="455" y="188" text-anchor="middle" fill="#6b7389" font-size="9">locked_amount (a number)</text>
  <rect x="570" y="150" width="170" height="56" rx="8" fill="#effaf3" stroke="#15803d"/><text x="655" y="172" text-anchor="middle" font-weight="600">Freelancer balance</text><text x="655" y="188" text-anchor="middle" fill="#6b7389" font-size="9">RECEIVE + users.balance</text>
  <line x1="150" y1="178" x2="188" y2="178" stroke="#15803d" stroke-width="1.6" marker-end="url(#b)"/>
  <line x1="340" y1="178" x2="378" y2="178" stroke="#15803d" stroke-width="1.6" marker-end="url(#b)"/>
  <text x="359" y="170" text-anchor="middle" font-size="9" fill="#15803d">accept</text>
  <line x1="530" y1="178" x2="568" y2="178" stroke="#15803d" stroke-width="1.6" marker-end="url(#b)"/>
  <text x="549" y="170" text-anchor="middle" font-size="9" fill="#15803d">release</text>
  <rect x="570" y="232" width="170" height="44" rx="8" fill="#fff" stroke="#15803d"/><text x="655" y="252" text-anchor="middle" font-weight="600">Redeem request</text><text x="655" y="266" text-anchor="middle" fill="#6b7389" font-size="9">PENDING forever</text>
  <line x1="655" y1="206" x2="655" y2="230" stroke="#15803d" stroke-width="1.6" marker-end="url(#b)"/>
  <text x="10" y="240" fill="#2b3248">The client effectively pays twice: SHM at posting and tokens at hiring.</text>
  <text x="10" y="256" fill="#2b3248">Only the token rail ever reaches the freelancer, and no rail reaches a bank.</text>
</svg>
<figcaption>Figure 7.1 — The two money rails as implemented</figcaption>
</figure>

| Step | Code | Nature |
|---|---|---|
| 1. Client buys tokens | token store → `/api/wallet/buy` | DB only, mock payment |
| 2. Client posts project and "locks escrow" | `post-project/page.tsx:453-514` → `Escrow.lockFunds` | **Real SHM** to a contract only the owner can empty; not recorded in the DB |
| 3. Client accepts a bid | `/api/bids/[id]/accept` | DB only; tokens debited, contract created |
| 4. Both sign | `/api/contracts/[id]/sign` | DB only; drawn image, not cryptographic |
| 5. Freelancer submits work | `.../submit` | DB only |
| 6. Client releases a milestone | `.../release` | DB only; repeatable |
| 7. Freelancer cashes out | `/api/wallet/redeem` | PENDING request; no payout |
| Refunds | — | Not implemented anywhere |
| Disputes | `/api/disputes/[id]/resolve` | Calls undefined RPCs; moves nothing |
| Platform fee | — | None (UI copy mentions 10–15%) |

## Wallet integration

- **Provider:** `WalletProvider` (`src/contexts/wallet-context.tsx`) wraps the app; it uses ethers v6 `BrowserProvider` over `window.ethereum`.
- **Connect:** `eth_requestAccounts`, then `personal_sign` of a random message (discarded), then a mock local "user" ("John Doe") stored in `localStorage`. Without MetaMask it pretends to connect a hard-coded demo address.
- **Network:** "Switch to Shardeum" calls `wallet_switchEthereumChain` to `0x1fb6` (8118) and adds the chain if missing. Posting a project only alerts on the wrong chain.
- **Balance:** native balance of whatever chain is active, labelled SHM, polled every 30 s. "Locked in escrow" is hard-coded to `0.0`.
- **Gaps:** no `accountsChanged` handler (the UI can show a stale account), a stale `chainChanged` closure, and the `/wallet` page queries transactions with the mock user id so it never finds any.

## Payments that are simulated

| Feature | Reality |
|---|---|
| PayPal connect (`/profile/payments/paypal`) | A 2-second `setTimeout`, then "success"; the status page still shows "Not connected" |
| `PaymentManager` (`src/lib/payments/payment-manager.ts`) | `console.log` stubs; the ERC-20 path targets token address `0x0` and has an invalid ABI fragment |
| Fund management, transaction history, financial dashboard modals | Hard-coded data and `alert()` |
| Stripe | Listed as a payment method type; no provider |

## Security of funds — summary

1. Client SHM is custodied by a single developer key with no release path.
2. Value can be created for free (mock buy, auto top-up).
3. Release is repeatable and its amount can be edited by either party under RLS.
4. Balance updates are non-atomic read-modify-write.
5. A failed `/api/jobs` call after a successful lock strands the deposit; retrying locks again.
6. The same deployer key is configured for testnets **and** mainnets (Polygon 137, Shardeum 8118), although the setup guide calls it a testnet-only key.

Chapter 14 rates each issue and chapter 16 describes the fix: move to `ProjectEscrow`-style per-milestone escrow (or a single, properly reconciled off-chain ledger) and remove every simulated path before real money is involved.
