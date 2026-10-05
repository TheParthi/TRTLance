# Roadmap: from prototype to product

The prototype proves the experience. Turning it into something people can trust with real money means fixing the foundations before adding features. The phases below are ordered so that each one makes the next one safe.

## Phase 0 — Stabilise the codebase (about 1 week)

- Resolve the merge conflicts and the missing-module imports; get `next build` green.
- Turn off `ignoreBuildErrors` / `ignoreDuringBuilds`, add ESLint, fix the type errors that surface.
- **Capture the live database** with `supabase db pull`, then rewrite `backend/supabase/` as one ordered migration history (Supabase CLI), including the six missing tables, columns, RPCs, the `avatars` bucket and realtime publication. Delete `reset.sql` and the duplicate wallet migration.
- Add a seed script that produces a usable demo (two users, a project, a contract with milestones).
- Add CI (GitHub Actions): install, typecheck, lint, build; contract compile and tests.
- Fix the README, setup guide and design docs to describe the real system (chapter 15).

## Phase 1 — Security baseline (1–2 weeks)

- **Users table:** a `public_profiles` view for other users; privileged columns writable only by the server; profile creation in a `SECURITY DEFINER` trigger on `auth.users`.
- **RLS review of every table**, including enabling it on `project_attachments` and `dispute_evidence`, insert policies for notifications via a server function, and narrowing the contracts and proposals update policies.
- **Server-side validation** with zod on every route; whitelisted updates; consistent error responses that do not leak database messages.
- **Authenticate every route**; replace the browser client in server routes; add rate limiting to AI, payment and bidding endpoints.
- **Sign-In-With-Ethereum** for wallet linking: server nonce, signature verification, immutable binding.
- Security headers (CSP, frame-ancestors, HSTS); remove demo credentials.

## Phase 2 — One trustworthy money layer (3–4 weeks)

Today there are five unreconciled value stores. Choose **one** model and remove the rest.

<div class="two-col">
<div class="callout"><span class="callout-title">Option A — On-chain escrow (recommended)</span>
Deploy an upgraded <code>ProjectEscrow</code> on Shardeum: the client funds all milestones at hiring, approval releases each milestone to the freelancer's wallet, disputes freeze funds and the arbiter settles with a percentage split. The database mirrors chain state by indexing contract events (never by trusting the browser). Keeps TrustLance's core promise and its Shardeum relationship. Needs: contract tests, an external audit, a multisig arbiter, gas/UX handling.</div>
<div class="callout"><span class="callout-title">Option B — Off-chain ledger with real payments</span>
Keep platform tokens but make them real: payments through a provider such as Razorpay with verified webhooks, payouts through its payout API, and every balance change in atomic SQL functions with an immutable ledger. Simpler for non-crypto users, but the platform holds the money, which weakens the "trust-first" story and brings payment-regulation obligations.</div>
</div>

Either way:

- One milestone model: `pending → funded → submitted → approved → paid` (plus `disputed`, `refunded`), enforced in SQL or on-chain, idempotent.
- Remove the auto top-up, the mock purchase and every simulated payment path.
- Refunds, cancellations and deadlines (auto-release after a review window).
- A clear fee model, if any, implemented in one place.
- Reconciliation reports that compare ledger, contracts and chain.

## Phase 3 — Disputes that work end to end (2–3 weeks)

- Parties open a dispute from the contract (fixed wizard), attach evidence to Supabase Storage with RLS, and follow it on a real dispute page.
- Arbitrator eligibility based on a server-owned stake or reputation, conflict-of-interest checks, domain matching, response deadlines and escalation.
- The AI agent becomes a Genkit flow that reads the contract, submissions, chat and evidence and produces a **recommendation** shown to the arbitrator.
- Verdicts settle funds through the Phase 2 money layer in one transaction; the contract leaves `disputed`.
- An append-only audit trail for every dispute event; an admin console behind a real admin role.

## Phase 4 — Communication (1–2 weeks)

- Decide between XMTP (wallet-to-wallet, end-to-end encrypted — the original promise) and Supabase Realtime chat with clear privacy wording.
- Real-time contract chat, unify the inbox, delete the mock widget.
- Fix notifications: server-side creation, valid types and links, email for important events.

## Phase 5 — Product polish (2–3 weeks)

- Mobile navigation, keyboard-accessible menus, labelled controls, focus states, contrast; replace `alert()`/`confirm()`.
- Remove or finish secondary pages (bookmarks, lists, services, quotes …); remove all fake statistics and Freelancer.com copy; consistent currency labels and status casing.
- Search and filters on real data with pagination; project attachments; drafts.
- Onboarding: choose client/freelancer intent, complete profile, connect wallet.
- Make the AI risk report trustworthy (chapter 8).

## Phase 6 — Production readiness

- Hosting (Firebase App Hosting or Vercel) with environment secrets, preview deployments and monitoring (error tracking, logs, uptime).
- Automated tests: API integration tests against a local Supabase, contract tests with coverage, end-to-end tests for the core journey.
- Contract audit and mainnet deployment plan with key management (hardware wallet / multisig).
- Terms of service, privacy policy, data retention, and KYC/AML review if real money moves.

## Suggested first sprint

1. Fix the build (Phase 0, items 1–2).
2. Pull and commit the real schema.
3. Lock down `users` and the two unauthenticated routes (H1, H2, H6).
4. Make milestone release idempotent and remove the auto top-up (H4, H5).
5. Correct the README.

After this sprint the codebase is reproducible, safe to demo with real users, and ready for the money-layer decision.
