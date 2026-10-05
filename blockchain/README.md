# TrustLance escrow contract

`contracts/TrustLanceEscrow.sol` — non-custodial milestone escrow in the chain's native coin (SHM on Shardeum).

| Function | Caller | Effect |
|---|---|---|
| `fund(ref, freelancer, amounts[])` payable | client | Deposits every milestone; `msg.value` must equal the sum. Agreement key = `keccak256(abi.encode(client, ref))`. |
| `release(key, i)` | client | Pays a funded milestone to the freelancer. |
| `refund(key, i)` | freelancer | Returns a funded milestone to the client. |
| `raiseDispute(key, i)` | either party | Freezes a funded milestone. |
| `resolveDispute(key, i, pct)` | arbiter | Settles a *disputed* milestone: `pct`% to the freelancer (rounded down), the rest to the client. |
| `setArbiter(addr)` | owner | Rotates the arbiter (use a multisig). Ownership cannot be renounced. |

There is no owner withdrawal and plain transfers are rejected. `ref` is the TrustLance contract UUID as 32 bytes (`src/lib/chain/escrow.ts`).

```bash
npm install
npx hardhat test                                  # 12 tests incl. reentrancy
npx hardhat node                                  # local chain 31337
npm run deploy:local
ESCROW_ARBITER_ADDRESS=0x… npm run deploy:shardeum-testnet
npm run export-abi                                # updates ../src/lib/chain/escrow-abi.json
```

Use separate deployer keys per network (`TESTNET_DEPLOYER_PRIVATE_KEY`, `MAINNET_DEPLOYER_PRIVATE_KEY`). Check the Shardeum testnet chain id and RPC before deploying (`SHARDEUM_TESTNET_CHAIN_ID`, `SHARDEUM_TESTNET_RPC`). Get an independent audit before mainnet use.

`deployments/legacy/` keeps the v1 prototype deployments (Escrow on Shardeum 8118, ProjectEscrow on Polygon Amoy) for reference; the v2 app does not use them.
