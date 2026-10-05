# Product context

## The problem TrustLance addresses

Freelance work runs on trust that neither party can verify. The README (`README.md:8-17`) names five recurring failures of traditional freelance platforms:

- **Payment trust** — freelancers start work without knowing the money exists.
- **Delayed or denied payments** — clients hold back payment after delivery.
- **Opaque dispute handling** — the platform decides behind closed doors.
- **Fake or unverifiable identities** — anyone can create accounts.
- **Platform-controlled messaging** — the platform can read and moderate everything.

"Both clients and freelancers operate with uncertainty." TrustLance's answer is a **workflow-first** marketplace in which each of these risks is removed by design rather than by reputation.

## Users and roles

| Role | What they do | Where it lives in the code |
|---|---|---|
| **Client** | Posts projects, defines the budget, hires a freelancer, signs the agreement, approves milestones and releases payment, raises disputes | Per record: `projects.client_id`, `contracts.client_id` |
| **Freelancer** | Finds projects, checks the AI risk report, bids with milestones, signs, submits proof of work, gets paid | Per record: `proposals.freelancer_id`, `contracts.freelancer_id` |
| **Arbitrator** | Any user with ≥ 3,000 tokens can book time slots, go online, be assigned disputes and decide them (release or refund) | `/resolution-gigs`, `users.tokens`, `users.arbitrator_status`, `arbitrator_gigs` |
| **Admin** | Intended to monitor disputes and override decisions | Only a mock page (`/admin/disputes`); no admin role exists |

Roles are **contextual, not global**: every account is created as `freelancer`, and a person is a "client" on the projects they posted and a "freelancer" on the contracts they were hired for. The global `users.role` column is displayed but never used for authorisation.

## Value proposition — the four trust-first principles

The README promises four mechanisms. The table shows how far each one is actually built.

| Principle | Promise | What the code does | Status |
|---|---|---|---|
| **Escrow before work** | Funds are locked before work begins and released per approved milestone | Budget is locked on-chain at posting (Shardeum `Escrow.lockFunds`), but that contract cannot release or refund. Hiring separately debits off-chain tokens; milestone release credits off-chain tokens. | <span class="b b-partial">Partial</span> |
| **Verified identity** | Google sign-in plus a one-time, irreversible wallet link | Google OAuth works (email/password also exists). Wallet linking is enforced only in browser code, ownership is never proven, and the database lets users change the address. | <span class="b b-partial">Partial</span> |
| **Private messaging** | End-to-end encrypted wallet-to-wallet chat via XMTP, only after hiring | No XMTP at all. Contract chat is plain text in Supabase (`contract_messages`); the inbox and floating chat are hard-coded. | <span class="b b-missing">Missing</span> |
| **Auditable disputes** | Clear, recorded dispute process with AI analysis and expert review | A `disputes` table, arbitrator assignment, a dispute chat and a resolve endpoint exist, but no UI creates disputes, resolution moves no money and the AI/expert screens are mock data. | <span class="b b-mock">Mostly mock</span> |

## Features built beyond the README

The code contains several product areas the README does not mention — and in two cases explicitly rules out:

- **Platform token economy** — 1 token = ₹10; buy, redeem, balance and transaction history (`/profile/wallet`, `/api/wallet/*`).
- **AI project risk analysis** — a Gemini report shown to freelancers before they bid, downloadable as PDF.
- **Digital signatures and agreement PDFs** — drawn signatures on the project and contract, PDF export with jsPDF.
- **Reviews, ratings and "trust credits"** — two-way feedback, portfolio items created automatically from client reviews, +30 credits per completed project. (The README lists ratings as out of scope.)
- **Rich public profiles** — `/u/[username]` with education, certifications, portfolio, reviews and earnings.
- **Arbitrator marketplace ("Resolution Gigs")** — a token-gated role with bookable time slots.

## Positioning

No document in the repo names competitors, but the design positions TrustLance against custodial marketplaces such as Upwork and Fiverr. Those platforms hold client money in their own accounts, run in-house mediation and rely on reputation scores. TrustLance proposes a **smart-contract escrow**, a **wallet-bound identity** and a **transparent dispute trail** instead, with the backend README pitching on-chain fees of about $0.10 per project against PayPal's 2.9%.

<div class="callout warn"><span class="callout-title">Brand consistency</span>The shipped UI copy still borrows heavily from Freelancer.com: the homepage and page metadata say "World's largest freelance marketplace" and "Save up to 90%", the header search box reads "Search Freelancer.com" (<code>src/components/layout/authenticated-header.tsx:342</code>), and the footer claims "60,000,000+" users. These should be replaced with TrustLance's own positioning before any public launch.</div>

## Scope as documented

The README draws an intentional scope boundary (`README.md:119-145`):

- **In scope:** job posting, proposals, milestone escrow, wallet identity, encrypted messaging, disputes, demo/testnet deployment.
- **Out of scope:** ratings and reviews, advanced AI moderation, mainnet deployment, social features.

In practice, ratings and reviews were built, the app is configured against chain 8118 which the config itself labels "Shardeum Mainnet", and encrypted messaging was not built. Chapter 15 lists every documentation gap.
