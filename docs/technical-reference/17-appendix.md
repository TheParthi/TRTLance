# Appendix

## Glossary

| Term | Meaning in TrustLance |
|---|---|
| Project / job | A row in `projects`; "job" in API paths and UI, "project" in the database |
| Bid / proposal | A row in `proposals`; "bid" in the API |
| Contract | Created when a bid is accepted; holds milestones, signatures and locked amount |
| Milestone | An entry in `contracts.milestones` (JSON array), addressed by index; its work is tracked in `milestone_submissions` |
| Token / TKN | Platform credit stored in `user_wallets.token_balance`; 1 token = ₹10 |
| TRT | TrustToken, an ERC-20 that was planned but never deployed |
| SHM | Shardeum's native coin, used for the on-chain budget lock |
| Escrow (on-chain) | `Escrow.sol` on Shardeum chain 8118 (`lockFunds`) |
| ProjectEscrow | Full milestone escrow contract, deployed on Polygon Amoy, not used by the app |
| Arbitrator / Resolution Gigs | Users with ≥ 3,000 tokens who book slots and decide disputes |
| Trust credits | `users.total_credits`, +30 per client review |
| RLS | Supabase row-level security policies |
| Service role | Supabase secret key that bypasses RLS (server only) |

## Key files

| Area | File |
|---|---|
| App shell and providers | `src/app/layout.tsx`, `src/components/layout/conditional-layout.tsx` |
| Route protection | `src/middleware.ts` |
| Auth and profile creation | `src/contexts/auth-context.tsx`, `src/app/auth/callback/route.ts` |
| Supabase clients | `src/lib/supabase.ts`, `src/lib/supabase/{client,server,admin}.ts` |
| Wallet | `src/contexts/wallet-context.tsx`, `src/components/wallet/*`, `src/lib/config.ts` |
| Project posting and on-chain lock | `src/app/post-project/page.tsx` |
| Job detail, AI report, bidding, accept | `src/app/job/[jobId]/page.tsx`, `src/components/RiskAnalysisModal.tsx` |
| Contract workspace | `src/app/contracts/[contractId]/page.tsx` |
| Bid acceptance (funding) | `src/app/api/bids/[bidId]/accept/route.ts` |
| Milestone release (payment) | `src/app/api/contracts/[contractId]/milestones/[index]/release/route.ts` |
| Token wallet | `src/app/api/wallet/*`, `src/app/profile/{wallet,token-store,token-redeem}` |
| Arbitration | `src/app/resolution-gigs/**`, `src/app/api/arbitrator/**`, `src/app/api/disputes/**`, `src/lib/arbitrator.ts` |
| AI | `src/ai/genkit.ts`, `src/ai/flows/*`, `src/app/api/ai/project-risk/route.ts`, `backend/ai/dispute-agent.js` |
| Smart contracts | `backend/contracts/{Escrow,ProjectEscrow,TrustToken}.sol`, `backend/hardhat.config.js`, `backend/scripts/*`, `backend/deployments/*` |
| Database | `backend/supabase/schema.sql`, `rls_policies.sql`, `feedback_schema.sql`, `migrations/*` |

## Frontend → API map

| API | Called from |
|---|---|
| `GET /api/jobs` | dashboard, dashboard/jobs, find-jobs, my-projects |
| `POST /api/jobs` | post-project |
| `GET /api/jobs/[id]`, `GET /api/jobs/[id]/bids` | job detail |
| `POST /api/bids`, `GET /api/bids/my-bids`, `POST /api/bids/[id]/accept` | job detail, my-projects |
| `GET /api/contracts` | contracts list |
| Contract detail, sign, messages, submit, feedback, release | contract workspace |
| `POST /api/reviews` | contract workspace (feedback modal) |
| `POST /api/ai/project-risk` | job detail |
| `PUT /api/profile/update` | profile edit |
| `/api/wallet/*` | profile wallet, token store, token redeem |
| `/api/arbitrator/profile`, `…/status`, `…/gigs/book` | resolution-gigs |
| `GET /api/disputes/[id]`, messages, resolve | arbitrator room |
| Never called | `GET/POST /api/disputes`, `/api/arbitrator/apply`, `/api/arbitrator/gigs/[id]/cancel`, `PATCH /api/jobs/[id]`, `POST /api/projects`, `/api/feedback/submit` |

## Contract addresses

| Contract | Network | Address | Deployer / owner |
|---|---|---|---|
| ProjectEscrow | Polygon Amoy (80002) | `0x2DC618147ee8360CD83d5ed3368525B920F2712F` | `0xD62Cd999B20A643469a40C1a9B27be1E9F6D2A79` |
| Escrow | Shardeum (8118) | `0x2DC618147ee8360CD83d5ed3368525B920F2712F` | same |

On-chain state was not verified for this document; the addresses come from `backend/deployments/*.json`.

## About this document

- Written for the TrustLance team as the baseline for further development, from a full read of the repository at commit `5d9c2268` (5 October 2026).
- Source: `docs/technical-reference/*.md` (one file per chapter), `style.css`, `meta.json`. Rebuild the PDF with `node build.mjs` (instructions at the top of that file).
- When the code changes, update the matching chapter and the status matrix, bump the version in `meta.json` and rebuild.
