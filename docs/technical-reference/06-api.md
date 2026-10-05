# API reference

## Conventions

- All routes live under `src/app/api/` as Next.js route handlers; there are **37 handlers in 32 files**.
- Authenticated routes call `supabase.auth.getUser()` (verified server-side) and then read/write **as the user**, so row-level security applies. Only the milestone-release route also uses the service-role client.
- Errors are `{ "error": string }`, usually with the raw PostgREST message. There is no schema validation library in use (zod is installed but unused), no pagination and no rate limiting.
- Three routes wrongly use the **browser** Supabase client on the server (`arbitrator/apply`, `arbitrator/gigs/[gigId]/cancel`, `projects`); they run with no user and do no auth check.
- No API route talks to the blockchain.

## Endpoint summary

| Method | Path | Auth | Purpose | Called from UI |
|---|---|---|---|---|
| GET | `/api/jobs?status&category&created_by` | none | List projects (with client) | dashboard, find-jobs, my-projects |
| POST | `/api/jobs` | user | Create a project (status `open`) | post-project |
| GET | `/api/jobs/[jobId]` | none | One project | job page |
| PATCH | `/api/jobs/[jobId]` | owner | Update — **writes the raw body** | — |
| GET | `/api/jobs/[jobId]/bids` | owner | Bids on a project | job page (client view) |
| POST | `/api/bids` | user, not owner | Place a bid with milestones | job page |
| GET | `/api/bids/my-bids?freelancer_id` | none (RLS) | A freelancer's bids | job page, my-projects |
| POST | `/api/bids/[bidId]/accept` | project owner | Accept bid, debit tokens, create contract | job page |
| GET | `/api/contracts?user_id` | none (RLS) | Contracts where user is a party | contracts list |
| GET | `/api/contracts/[id]` | party | Contract + project + users + submissions | contract page |
| PATCH | `/api/contracts/[id]/sign` | party | Store the caller's drawn signature | contract page |
| GET / POST | `/api/contracts/[id]/messages` | none / user | Contract chat | contract page |
| POST | `/api/contracts/[id]/dispute` | party | Raise a dispute, auto-assign arbitrator | (call commented out) |
| POST | `/api/contracts/[id]/milestones/[i]/submit` | freelancer | Submit proof of work | contract page |
| POST | `/api/contracts/[id]/milestones/[i]/feedback` | client | Request a revision | contract page |
| POST | `/api/contracts/[id]/milestones/[i]/release` | client | Release payment for a milestone | contract page |
| GET / POST | `/api/disputes` | none / user | List / create disputes | — |
| GET | `/api/disputes/[id]` | none (RLS) | Dispute detail with contract milestone | arbitrator room |
| GET / POST | `/api/disputes/[id]/messages` | none / user | Dispute chat | arbitrator room |
| POST | `/api/disputes/[id]/resolve` | assigned arbitrator | Decide RELEASE or REFUND | arbitrator room |
| POST | `/api/arbitrator/apply` | **none** | Create arbitrator profile for any user | — |
| POST | `/api/arbitrator/status` | user | Go online / offline | resolution-gigs |
| GET | `/api/arbitrator/profile` | user | Profile, upcoming gigs, assigned disputes | resolution-gigs |
| POST | `/api/arbitrator/gigs/book` | user, ≥ 3000 tokens | Book a time slot | resolution-gigs |
| POST | `/api/arbitrator/gigs/[gigId]/cancel` | **none** | Cancel any gig + penalty | — |
| POST | `/api/feedback/submit` | party | Detailed two-way feedback | — (dead modal) |
| POST | `/api/reviews` | user | Review + site rating + credits | contract page |
| PUT | `/api/profile/update` | user | Update own profile (whitelisted fields) | profile edit |
| GET / POST | `/api/projects` | **none** | Legacy project list / create (broken) | dashboard/projects |
| GET | `/api/wallet/balance` | user | Token balance and ₹ value | wallet pages |
| POST | `/api/wallet/buy` | user | Buy tokens (**mock payment**) | token store |
| POST | `/api/wallet/redeem` | user | Request payout (stays PENDING) | token redeem |
| GET | `/api/wallet/transactions` | user | Token history | profile wallet |
| POST | `/api/ai/project-risk` | user | AI risk report (cached) | job page |

## Jobs and bids

**`POST /api/jobs`** requires `title`, `description`, `category`, `budget_type`, `experience_level`. It stores `budget_range`, `budget_min` and `budget_max` from `budget_amount`, builds `duration` as "start to end" when dates are given, and forces `client_id` = caller and `status` = `open`. It **ignores** the `blockchain_tx`, `escrow_locked` and `temp_id` fields the posting page sends after locking SHM, so nothing links a project to its on-chain deposit.

**`POST /api/bids`** requires `job_id`, `amount`, `proposal`. It rejects bids on your own job or on non-open jobs, and stores `proposed_budget`, `cover_letter`, the `milestones` array and `estimated_duration` ("N milestones"). Negative amounts are not rejected, and milestone amounts are never checked against the bid total on the server (the UI enforces the sum).

**`POST /api/bids/[bidId]/accept`** — the "funding" step:

1. Verify the caller owns the project and the project is `open`.
2. Read the client's `user_wallets.token_balance`. **If it is lower than the bid, set it to 1000** (a demo "auto top-up").
3. Deduct the bid amount and record a `SPEND` token transaction.
4. Mark this proposal `accepted` and all others `rejected`; try to set the project `in_progress` (fails silently — wrong column name).
5. Only now check whether a contract already exists (after money has moved).
6. Insert the contract with `total_amount = locked_amount = bid`, the bid's milestones and `smart_contract_address = 'INTERNAL_WALLET'`.
7. Notify the freelancer (fails: invalid notification type and RLS).

Returns `201 { success, contractId }`.

## Contracts and milestones

- **Sign** stores the caller's drawn-signature PNG data URL in `client_signature` or `freelancer_signature`. Re-signing overwrites; signatures are not required by any other route.
- **Messages** are plain text in `contract_messages`; the GET has no party check in code (RLS only).
- **Submit** (freelancer) upserts `milestone_submissions` as `pending` — this can turn an approved milestone back to pending.
- **Feedback** (client) sets `revision_requested` with the client's comment.
- **Release** (client):
  1. Amount = `contract.milestones[i].amount` (from the freelancer's bid).
  2. Mark the submission `approved`; decrease `contracts.locked_amount` (can go negative).
  3. Credit the freelancer's `user_wallets` **using the client's session** (blocked by RLS in the repo schema).
  4. With the service role: insert a `RECEIVE` token transaction, a completed `transactions` credit (which raises `users.balance` via trigger) and two notifications.
  5. **No checks** that a submission exists, that the milestone was not already released, that the contract is not disputed, or that enough is locked.

## Disputes and arbitration

- **Raise (contract route)** builds a dispute with id `DSP-` + last six digits of `Date.now()`, assigns the first user whose `arbitrator_status` is online (falling back to the user named `judge_bot`), and sets the contract to `disputed`. It writes `status: 'pd'` and three columns that are not in the schema, and the UI call is commented out.
- **Raise (`POST /api/disputes`)** assigns an arbitrator who has a *booked* gig covering the current time; no code ever books a gig, and no UI calls this route.
- **Resolve** requires `disputes.arbitrator_id = caller`, sets `RESOLVED` with outcome FREELANCER (for `RELEASE`) or CLIENT, then calls `release_escrow_to_freelancer` / `refund_escrow_to_client` RPCs that are not defined, ignoring the error.
- **Arbitrator booking** checks `users.tokens ≥ 3000` and overlap with your own gigs, then inserts an `available` gig. Start/end ordering, future times and the one-hour advance rule are not validated.

## Wallet

| Route | Behaviour |
|---|---|
| `GET /balance` | `{ tokenBalance, inrValue: tokens × 10 }` |
| `POST /buy` | Packages `pack_10` / `pack_50` / `pack_100` (₹100/500/1000) or a custom amount with **no upper bound**; inserts `BUY / SUCCESS` with `payment_ref: MOCK_PAY_<ts>` and adds to the balance. No payment provider is called. |
| `POST /redeem` | Checks the balance, inserts `REDEEM / PENDING` with the bank account or UPI id in the description, and deducts immediately. Nothing ever processes the request. |
| `GET /transactions` | The caller's token history, newest first |

All balance changes are read-then-write in application code, so concurrent requests can double-spend.

## Reviews, feedback and profile

- **`POST /api/reviews`** inserts a `feedback` row and a `site_reviews` row. If the caller owns the project it also creates a `portfolio_items` entry for the reviewee and adds +30 `total_credits` and +1 `projects_completed`. It does not check that either person was part of the project.
- **`POST /api/feedback/submit`** implements the richer two-way model (`freelancer_feedback` / `client_feedback` / `platform_feedback`), once per contract per side — but no mounted component calls it.
- **`PUT /api/profile/update`** whitelists name, profession, about (≤ 1000 chars), skills, languages, location, hourly rate, company and phone.

## Business rules: where they are enforced

| Rule | Server | Browser only |
|---|---|---|
| Only the owner sees bids and accepts one | ✔ | |
| Cannot bid on your own job; job must be open | ✔ | |
| One bid per freelancer per project | ✔ (unique constraint) | |
| Milestone amounts sum to the bid | | ✔ |
| Both parties sign before work or release | | ✔ (blocking overlay) |
| Release only after a pending submission; never twice | | ✔ |
| Disputes freeze payment | — nowhere | |
| Wallet linked once, permanently, with proof | | ✔ (no proof anywhere) |
| Arbitrator must hold 3000 tokens to go online | | ✔ (booking checks it) |
| Arbitrator booking ≥ 1 hour ahead, max 3 specialisations | — nowhere | |
| Post-project form validation (lengths, dates, budget) | partly | ✔ |
