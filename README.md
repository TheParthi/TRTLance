# TrustLance

A freelance marketplace where every contract is funded in escrow before work begins, and every milestone is paid the moment it is approved.

- **Clients** post projects, compare proposals, sign a contract and deposit the full amount into a non-custodial escrow smart contract. They approve each milestone, which releases it on-chain to the freelancer.
- **Freelancers** see verified facts about each client and an AI risk review of the brief, propose their own milestones, and start only when escrow is funded.
- **Disputes** freeze a milestone. An independent, conflict-checked arbitrator decides (AI may summarise the case, never decide) and the escrow contract settles the split.

This is **v2**, a ground-up rebuild of the hackathon prototype. The v1 analysis lives in `docs/technical-reference/`.

## Repository layout

```
src/                 Next.js 15 app (App Router, React 19, Tailwind 3)
  app/(marketing)    landing page
  app/(auth)         sign in, sign up, password reset
  app/(app)          product: dashboard, work, projects, contracts, messages, disputes, arbitration, wallet, settings, admin
  app/api            escrow verification, wallet (SIWE) verification, AI routes
  components/        ui primitives, shell, domain components
  lib/               data access, server actions, chain helpers, money/format/status logic
  ai/                Genkit flows (project risk review, dispute recommendation)
supabase/
  migrations/        the single, ordered database history (schema, RLS, workflow functions, storage, realtime)
  tests/             local Postgres test harness and database tests
blockchain/          Hardhat project: TrustLanceEscrow.sol, tests, deploy script
docs/                technical reference (v1) and v2 notes
```

## How money works

One money model: **on-chain escrow** (`blockchain/contracts/TrustLanceEscrow.sol`).

1. Both parties sign the contract terms (typed-name signature bound to a SHA-256 of the terms) with a wallet they proved they own (Sign-In with Ethereum).
2. The client calls `fund(ref, freelancer, amounts[])` with the full total. The server verifies the receipt (contract address, event, wallet, amounts, confirmations) before the contract becomes active.
3. `release(key, i)` (client) pays a milestone to the freelancer; `refund(key, i)` (freelancer) returns it to the client.
4. `raiseDispute(key, i)` (either party) freezes a milestone; only then can the arbiter call `resolveDispute(key, i, pct)`.
5. Nobody, including the contract owner, can withdraw escrowed funds otherwise.

The database mirrors the chain through idempotent, service-only functions (`apply_escrow_*`). Nothing is marked paid until the transaction is confirmed and verified.

## Running locally

Requirements: Node 20+, a Supabase project (or compatible stack), a browser wallet for escrow flows.

```bash
npm install
cp .env.example .env.local      # fill in Supabase keys; escrow and AI are optional
npm run dev                     # http://localhost:9002
```

Apply the database:

```bash
npx supabase db push --db-url "postgresql://postgres:<url-encoded password>@db.<ref>.supabase.co:5432/postgres"
npx supabase migration list --db-url "…"   # local and remote history should match
```

The hosted project for v2 is `trustlance-v2` (ref `ynhrhztquocljondkdws`). It is separate from the v1 prototype's database.

## The platform console

`/admin` is the platform team's console: the action queues (disputes to assign, withdrawals to pay,
bank accounts to verify, arbitrator applications), members, projects, contracts, disputes, the coin
ledger with its reconciliation check, platform settings and the audit trail.

Two things make it different from the rest of the app:

- **Row-level security gives admins no blanket read access.** Every screen is backed by a
  `security definer` function in `supabase/migrations/20261007000100_admin.sql` that checks
  `app.is_admin()` first and returns only what that screen needs. Every change goes through a
  function there and writes a row to `admin_audit_log`, which is append-only — a trigger refuses any
  update or delete, including from the database owner.
- **Being an admin is not enough to open it.** `/admin/gate` asks for the admin's password again and
  sets a short-lived signed cookie (`src/lib/admin/seal.ts`): 30 minutes of use, at most 8 hours
  before it has to be given again. Anyone who is not an admin gets a 404, so the console's existence
  is not discoverable. Set `ADMIN_SESSION_SECRET` in production.

### Two origins

One deployment serves both the site and the console; the middleware decides what each origin may
serve (`src/lib/origins.ts`). Set `NEXT_PUBLIC_ADMIN_URL` and the console moves to its own address:
anything else asked for there is sent to the site, and `/admin` on the site is sent across. In
production that means a separate hostname, which also gives the console its own cookie scope, so a
cross-site scripting bug on the public site cannot reach the console's seal. Leave the variable empty
and the console stays at `/admin` on the site itself.

```bash
npm run dev          # the site       http://localhost:9002
npm run dev:admin    # the console    http://localhost:9001
```

Two dev servers, because each origin needs its own port; `dev:admin` builds into `.next-admin` so the
two do not overwrite each other. Note that two ports on localhost still share a cookie jar — cookies
ignore the port — so the separation is a convenience in development and real only in production.

A member can be suspended from their account page. Suspension is enforced in `app.require_user()`,
which every write RPC already calls, so a suspended member keeps read access to their own account
but cannot post, propose, sign, fund, release or withdraw anywhere in the product.

Then in Supabase: enable Google sign-in (redirect `…/auth/callback`), set the email templates' confirm/recovery links to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…`, and add admins with `insert into platform_admins (user_id) values ('<uuid>');`.

Escrow (optional): deploy the contract and set the `NEXT_PUBLIC_CHAIN_*` / `NEXT_PUBLIC_ESCROW_ADDRESS` variables.

```bash
cd blockchain && npm install
npx hardhat test
ESCROW_ARBITER_ADDRESS=0x… npm run deploy:shardeum-testnet
npm run export-abi              # copies the ABI into src/lib/chain/escrow-abi.json
```

Without escrow variables the app runs, and every money action says plainly that escrow is not configured.

### Fully local, without Docker

`scripts/local-stack/` runs Postgres (Homebrew), Supabase Auth (built with Go) and PostgREST behind a small gateway, so the whole app works offline against a local Hardhat chain. Storage and Realtime are not included (uploads fail clearly; pages refresh on focus). See `scripts/local-stack/README.md`.

```bash
node scripts/local-stack/setup.mjs && node scripts/local-stack/start.mjs   # terminal 1
cd blockchain && npx hardhat node                                         # terminal 2
cd blockchain && npm run deploy:local                                     # once per chain start
npm run dev                                                               # terminal 3
```

## Checks

```bash
npm run typecheck
npm run lint
npm test                 # unit tests + database tests (needs local Postgres; see below)
npm run build
cd blockchain && npx hardhat test
```

Database tests run against plain Postgres with a small Supabase shim (`supabase/tests/shim.sql`): set `TEST_DATABASE_URL` (default `postgres://localhost:5432/trustlance_test`). They cover RLS, every workflow function, idempotency, concurrency and the dispute lifecycle.

End-to-end tests (`npm run test:e2e`, Playwright) need a running app connected to a Supabase project with test credentials; see `e2e/README.md`.

## Team

Parthiban Gunasekaran (TheParthi) · Ponmadhan (PonmadhanD)
