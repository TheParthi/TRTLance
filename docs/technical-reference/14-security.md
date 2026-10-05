# Security review

Ratings: <span class="b b-high">High</span> direct loss of funds or privilege, or unauthenticated state change · <span class="b b-med">Medium</span> integrity or data exposure with real impact · <span class="b b-low">Low</span> hardening.

The review is based on the code and the SQL in the repository. Where the live database may differ (chapter 5), the finding states both cases. No secrets were found in the git history; `.env*` files are ignored.

## High

| ID | Finding | Where | Fix |
|---|---|---|---|
| H1 | **Users can rewrite their own privileged columns** — balance, rating, total reviews, credits, role, membership tier, `tokens` (arbitrator gate), `arbitrator_status`, username and wallet address — directly through Supabase with the public anon key | `rls_policies.sql:13-19` | Column-level grants or a separate server-owned table; create profiles in a trigger |
| H2 | **Every user's row is public**, including email, phone, PayPal email, wallet and balance (`SELECT USING (true)`); `src/scripts/list-users-anon.ts` demonstrates it | `rls_policies.sql:9-11` | Expose a `public_profiles` view with safe columns |
| H3 | **Escrowed SHM is custodial with no release path**; only the deployer key can withdraw everything, and the same key is configured for mainnets | `Escrow.sol:45-48`, `hardhat.config.js` | Per-milestone escrow contract with release/refund; multisig owner |
| H4 | **Free value creation** — token purchase needs no payment and has no upper bound; bid acceptance tops the client up to 1,000 tokens | `wallet/buy/route.ts:37-71`, `bids/[bidId]/accept/route.ts:57-73` | Payment-provider webhook; remove the top-up |
| H5 | **Release can be replayed and the amount is controlled by the parties** — no submission/duplicate/dispute checks; milestone amounts editable via the contracts policy; negative bids increase the client's balance | `release/route.ts`, `bids/route.ts:20`, `rls_policies.sql:187-192` | Milestone state machine in SQL with conditional updates; validate amounts at bid time |
| H6 | **Unauthenticated state-changing routes** — anyone can cancel any arbitrator gig (with penalty) or create an arbitrator profile for anyone | `arbitrator/gigs/[gigId]/cancel`, `arbitrator/apply` | `getUser()` + ownership; server client |
| H7 | **Double-spend races** in redeem, buy and accept (read-modify-write) | `wallet/redeem`, `wallet/buy`, `bids/accept` | Atomic SQL functions with row locks and idempotency keys |

## Medium

| ID | Finding | Fix |
|---|---|---|
| M1 | Disputes can be opened on any project; dispute and contract chats and dispute details have no participant check in code; dispute ids are predictable (`DSP-` + 6 digits) | Party checks; UUID ids; verified RLS |
| M2 | Dispute amount comes from the request body; resolution marks RESOLVED before funds move and ignores RPC errors; disputes do not freeze release | Derive amounts server-side; single transactional RPC; block release while disputed |
| M3 | Arbitrator assignment can be gamed — anyone can go online, and the `judge_bot` fallback username can be claimed | Eligibility checks; reserved usernames; conflict-of-interest rules |
| M4 | Reviews can be written for anyone on any project; credits and portfolio items can be farmed | Require a completed contract between the two parties; unique constraints |
| M5 | `PATCH /api/jobs/[jobId]` writes the raw request body (mass assignment) | Field whitelist; legal status transitions only |
| M6 | Bid acceptance debits money before checking for an existing contract and never rolls back | Transactional RPC |
| M7 | AI risk reports can be forged for other users; failures produce fake reports; prompt injection | Server-only inserts; unique key; no persisted fallback |
| M8 | Wallet linking has no proof of ownership (signature discarded; demo address fallback) | Sign-In-With-Ethereum nonce verified on the server |
| M9 | On-chain lock is not linked to the project and is never verified | Record and verify the transaction server-side |
| M10 | Known demo credentials (`arbitrator@demo.com` / `password123`) and login placeholders hinting at demo accounts | Remove from production; rotate |
| M11 | `project_attachments` and `dispute_evidence` have **no RLS** — readable and writable with the anon key | Enable RLS with party policies |

## Low

| ID | Finding |
|---|---|
| L1 | Raw database error messages returned to clients; the OAuth callback logs the full URL including the one-time code |
| L2 | No security headers (CSP, frame-ancestors, HSTS); auth cookies readable by JavaScript (by design of `@supabase/ssr`), so any XSS becomes session theft |
| L3 | PostgREST filter strings built by interpolation (`.or(...)`) in three routes |
| L4 | No server-side input validation library in use; unbounded strings (signatures, messages, reviews) |
| L5 | No pagination or rate limiting (AI, buy, bid endpoints) |
| L6 | Many authenticated pages are protected only in the browser; `/admin/*` not at all |
| L7 | Contracts can be re-signed at any time |
| L8 | Google OAuth requests offline access and forces the consent screen on every login |
| L9 | `ignoreBuildErrors` hides type errors in production builds |
| L10 | Redemption requests store bank account / UPI ids in plain-text descriptions |

## Priority order for remediation

1. **Before anything else touches real money:** H3, H4, H5, H7 — rebuild the money layer (chapter 16, phase 2).
2. **Before onboarding real users:** H1, H2, H6, M11 — lock down the `users` table and unauthenticated routes.
3. **Before launching disputes:** M1, M2, M3 — dispute integrity.
4. Then the remaining medium and low items.
