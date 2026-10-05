# Known issues

## Build blockers

| # | Issue | Location | Fix |
|---|---|---|---|
| 1 | Unresolved merge-conflict markers (`<<<<<<< Updated upstream` … `>>>>>>> Stashed changes`) | `src/app/disputes/new/page.tsx:54-171`, `src/app/projects/[id]/page.tsx:50-54` | Resolve the conflicts |
| 2 | Import of non-existent `@/components/ui/use-toast` | `profile/edit/page.tsx:14`, `profile/education-list.tsx:9`, `feedback/feedback-modal.tsx:13` | Import from `@/hooks/use-toast` |
| 3 | `useSearchParams()` without `<Suspense>` | `disputes/new/page.tsx:96` | Wrap in Suspense |
| 4 | `TabsContent` outside `Tabs`; `<Textarea>` inside a button | `profile/edit/page.tsx:175-383` | Restructure the tabs |
| 5 | Rules-of-Hooks violations | `authenticated-header.tsx:133-135`, `prototyper/page.tsx:37` | Move early returns after hooks |
| 6 | `openChat` and `router` undefined; `useChat` without provider | `projects/[id]/page.tsx` | Fix or remove the page |
| 7 | `rls_policies.sql` partly UTF-16 encoded | lines 228–264 | Re-save as UTF-8 |

## Functional bugs

- **Accepting a bid** writes `projects.freelancer_id` (the column is `hired_freelancer_id`), so the project never becomes `in_progress` and the hired freelancer is never recorded.
- **Contracts never become `completed`**, so the "completed" filter is always empty and feedback timing is unenforced.
- **Two inconsistent dispute pipelines**: the contract route writes `assigned_arbitrator_id` and status `'pd'` (invalid), while resolve and the arbitrator profile read `arbitrator_id` and `UNDER_REVIEW`.
- **Gig status vocabulary** differs between routes (`available`, `booked`, `CANCELLED`) and the TypeScript type.
- **UI calls endpoints that do not exist**: `GET /api/bids?freelancer_id=` (405) and `GET /api/bids/{jobId}` (404).
- **Status casing**: the database stores lowercase (`open`, `accepted`), the UI compares uppercase (`'OPEN'`, `'ACCEPTED'`, `'ACTIVE'`) — open jobs show "no longer accepting", accepted bids never show escrow links.
- **Category keys** saved by post-project (`development`, `design` …) never match the filters on `/dashboard/jobs` ("Web Development" …).
- **Currency labels** mix SHM, $, ₹, TKN and INR for the same amounts; the agreement divides by 10 and calls it SHM.
- **Cross-user notifications** created with the user's session fail RLS everywhere except milestone release.
- **`token_balance` is an integer** while milestone amounts are decimals.
- **Contract chat** shows the other party's messages only after a reload.
- **Risk report PDF** downloads automatically on every "Apply" click.
- **Public header** shows Log In / Sign Up to signed-in users; `/u/{username}` renders two headers and can cause a hydration mismatch.
- About **40 links** lead to routes that do not exist.

## Documentation that contradicts the code

| Document | Claim | Reality |
|---|---|---|
| README | Ethereum Sepolia testnet | Shardeum chain 8118 (labelled mainnet) |
| README | TRT ERC-20 token | Never deployed; tokens are database integers |
| README | XMTP end-to-end encrypted messaging | Not implemented |
| README | Google authentication only | Email/password also implemented |
| README | One-time irreversible wallet binding | Browser-only check |
| README | Payments released automatically; disputes pause release | Manual release; disputes don't pause it |
| README | PayPal sandbox escrow | Simulated |
| README | Ratings and reviews out of scope; mainnet out of scope | Both present |
| README | Admin resolves disputes | No admin functionality |
| README | Demo-ready; database schema completed | Build broken; schema incomplete |
| `DISPUTE_RESOLUTION_SYSTEM.md` | AI analysis, three-expert voting, appeals, audit trail, automatic payout, encrypted evidence | Mock screens; single arbitrator; no payout; no audit log |
| `SETUP_STEPS.md` | Run `schema.sql` + `rls_policies.sql`; app on port 3000; deploy to Amoy | Migrations required; port 9002; app uses Shardeum Escrow |
| `GET_PRIVATE_KEY.md` | Testnet-only key | Same key configured for mainnets |
| `docs/blueprint.md` | WalletConnect, real-time chat, AI recommendations, primary colour `#2563EB` | None of these; primary is `#4F46E5` |
| `backend/README.md` | Only ProjectEscrow; "all tables have RLS"; demo data | Escrow + TrustToken exist; two tables lack RLS; demo data removed |

## Housekeeping

- Remove dead files: `disputes/page_old.tsx`, the unused feedback modal, expert voting panel, payment demo, orphan routes.
- Remove unused dependencies (chapter 11).
- Remove Freelancer.com copy and fake statistics from the landing page, footer and metadata.
- Replace `alert()` / `confirm()` with the toast and dialog components.
- Keep one copy of each contract (`backend/contracts` is canonical).
