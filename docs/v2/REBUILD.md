# TrustLance v2 — rebuild notes

Written for the TrustLance team. It records what changed from the v1 prototype (documented in `docs/technical-reference/`) and why.

## Decisions

| Topic | v1 | v2 |
|---|---|---|
| Money | Five unreconciled stores: SHM deposit box, DB tokens, `users.balance`, PayPal mock, TRT | **One model: on-chain milestone escrow** (`TrustLanceEscrow.sol`). The DB mirrors verified chain events only. No platform balance, no token purchase, no auto top-up. |
| Funding moment | SHM locked at posting, unlinked to the project | Full contract funded after both parties sign, from the client’s verified wallet; verified on-chain before work starts |
| Wallet ownership | Browser write, signature discarded | Sign-In with Ethereum: server nonce, server-verified signature, permanent binding |
| Signatures | Drawn PNG, re-signable | Typed-name signature bound to the SHA-256 of the exact terms, once per party |
| Disputes | Mock UI; arbitrator room for externally inserted rows; no payout | Party wizard → conflict-checked arbitrator → evidence/chat → decision → on-chain settlement; append-only audit trail; admin escalation |
| Arbitrator eligibility | ≥ 3,000 self-editable tokens | Server-computed reputation criteria + admin approval |
| AI | Fabricated fallback reports, forgeable cache | Server-only writes, cached per project version, untrusted input wrapped as data, honest failures, labelled advisory |
| Messaging | Contract chat (reload to see replies) + mock inbox | One inbox per client–freelancer–project pair, realtime, files, read receipts; dispute chat separate |
| Database | Hand-run SQL, 6 tables missing, permissive RLS | `supabase/migrations` as the single history; RLS on every table; state changes only through `SECURITY DEFINER` functions; tests |
| Messaging privacy | “XMTP end-to-end encrypted” (not implemented) | Stated plainly: stored by TrustLance, visible to the parties (and an assigned arbitrator) |

## Route map

| v1 route | v2 | Action |
|---|---|---|
| `/` | `/` | Rebuilt (no Freelancer.com copy, no fake statistics) |
| `/login`, `/signup`, `/auth/callback` | same + `/forgot-password`, `/reset-password`, `/auth/confirm`, `/auth/signout` | Rebuilt |
| — | `/onboarding` | New |
| `/dashboard` | `/dashboard` | Rebuilt (action-required first) |
| `/dashboard/jobs`, `/find-jobs` | `/work` | Merged, 301 redirect |
| `/job/[id]` | `/projects/[id]` | Rebuilt, redirect |
| `/project/[id]/bids` | `/projects/[id]/proposals` | Rebuilt, redirect |
| — | `/projects/[id]/apply`, `/projects/[id]/edit`, `/projects/new` | New (proposal composer, posting wizard with autosave) |
| `/post-project` | `/projects/new` | Rebuilt, redirect |
| `/my-projects`, `/my-applications`, `/dashboard/projects` | `/projects` | Merged, redirect |
| `/contracts`, `/contracts/[id]` | same | Rebuilt (workspace) |
| `/inbox` | `/messages`, `/messages/[id]` | Rebuilt, redirect |
| `/notifications` | same | Rebuilt |
| `/disputes`, `/disputes/[id]`, `/disputes/new` | same | Rebuilt (real data) |
| `/resolution-gigs`, `/resolution-gigs/room/[id]` | `/arbitration`, `/arbitration/cases/[id]` | Rebuilt, redirect |
| `/admin/disputes` | `/admin` (+ `/admin/disputes/[id]` → case room) | Rebuilt, protected |
| `/wallet`, `/profile/wallet` | `/wallet` | Merged |
| `/profile/token-store`, `/profile/token-redeem`, `/profile/payments(/paypal)`, `/payment-demo` | — | Removed (mock money) |
| `/profile`, `/profile/edit`, `/edit-profile` | `/settings/*` | Merged, redirect |
| `/profile/[username]`, `/u/[username]` | `/u/[username]` | Rebuilt |
| — | `/search` | New (projects + people) |
| `/feedback` | reviews on profiles and contracts | Removed |
| `/bookmarks`, `/lists`, `/tasklists`, `/services`, `/quotes`, `/groups`, `/project-updates`, `/solutions`, `/prototyper`, `/projects`, `/projects/[id]/workspace` | — | Removed (mock or duplicate workflows) |

## Security findings (v1 → v2)

| ID | Resolution | Test |
|---|---|---|
| H1 privileged self-edits | Public data in `profiles` with column grants; reputation in server-owned `profile_stats` | `security.test.ts` H1 |
| H2 public private data | No email/phone/wallet in public tables; `profile_private`, `wallets` owner-only | `security.test.ts` H2 |
| H3 custodial escrow | Non-custodial contract, no owner withdrawal, arbiter limited to disputed milestones | `TrustLanceEscrow.test.js` |
| H4 free value | No tokens, no buy, no top-up | — (code removed) |
| H5 replayable release | Milestone state machine in SQL; release recorded only from a verified event, once per tx and per milestone | `journey.test.ts` milestones |
| H6 unauthenticated routes | Every route authenticates; arbitrator actions require assignment | `disputes.test.ts` |
| H7 races | Row locks in every money/hiring function; unique keys; idempotency keys | `journey.test.ts` concurrent accepts |
| M1–M3 dispute integrity | Party checks, UUID ids, conflict-of-interest checks, reserved usernames, amounts from the milestone | `disputes.test.ts` |
| M4 review farming | One review per completed contract per side | `journey.test.ts` |
| M5 mass assignment | Draft-only column grants; publish via validated function | `journey.test.ts` projects |
| M6 debit before check | No debit; accept is transactional and idempotent | `journey.test.ts` hiring |
| M7 AI forgery | Service-only inserts, unique per project version, no fallbacks | `security.test.ts` AI |
| M8 wallet proof | SIWE | `security.test.ts` wallet, `escrow.test.ts` |
| M9 unverified lock | Receipt verification (`src/lib/chain/verify.ts`) | `verify.test.ts` |
| M10 demo credentials | Removed | — |
| M11 attachments/evidence RLS | RLS + storage policies by path | `security.test.ts` M11 |
| L2 headers | CSP, frame-ancestors, HSTS, nosniff, referrer policy in `next.config.ts` | — |
| L4/L5 validation, rate limits | zod in actions/routes; DB-backed rate limits | `security.test.ts` rate limits |

## Verification (5 October 2026)

| Check | Result |
|---|---|
| `npm run typecheck`, `npm run lint`, `npm run build` | Clean (type and lint checks are no longer skipped) |
| Unit tests (money, receipt verification, SIWE, next-action, errors) | 25 passing |
| Database tests on Postgres 16 (RLS, workflows, idempotency, races, disputes) | 32 passing |
| Contract tests (Hardhat) | 12 passing |
| Playwright public suite, desktop + phone | 14 passing |
| Playwright escrow journey on the production build, local chain, injected wallets | Passing: the freelancer’s on-chain balance ends exactly 24 SHM higher (20 released + 40% of a 10 SHM disputed milestone) |
| Console/hydration errors across 27 pages | None (local stack has no Realtime, so its websocket errors are excluded) |

Not verified: Supabase Storage uploads and Realtime (not in the local stack), Google sign-in, email delivery, Gemini output (no API key — the honest "not available" path was checked), a real Shardeum network.

## Known limitations

- The live v1 database was not available, so v2 starts from a fresh schema. Migrating v1 data needs `supabase db pull` and a one-off script.
- No timeout auto-release: if a client never reviews, the freelancer opens a dispute.
- Arbitration fees and a platform fee are not implemented (shown as 0).
- Email notifications are not sent; notifications are in-app (realtime).
- The escrow contract needs an independent audit and a multisig arbiter before handling real value.
