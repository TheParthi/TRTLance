# Implementation status

<span class="b b-done">Working</span> real logic against real services · <span class="b b-partial">Partial</span> works with significant gaps · <span class="b b-mock">Mock</span> hard-coded or simulated · <span class="b b-missing">Missing</span> not built, or broken

## Accounts and identity

| Capability | Status | Notes |
|---|---|---|
| Google sign-in | <span class="b b-done">Working</span> | PKCE, profile created in callback |
| Email/password sign-in | <span class="b b-partial">Partial</span> | Profile insert fails with email confirmation |
| Password reset | <span class="b b-missing">Missing</span> | Link points to `#` |
| Profile view (`/u/{username}`) | <span class="b b-partial">Partial</span> | Some hard-coded stats |
| Profile editing | <span class="b b-missing">Broken</span> | Missing import, invalid tab nesting |
| Wallet connect | <span class="b b-partial">Partial</span> | No account-change handling; demo fallback |
| Wallet linking with proof of ownership | <span class="b b-missing">Missing</span> | Signature discarded; not permanent server-side |
| Roles (client / freelancer / arbitrator / admin) | <span class="b b-partial">Partial</span> | Per-record checks work; no admin |

## Marketplace

| Capability | Status | Notes |
|---|---|---|
| Post a project (wizard, signature) | <span class="b b-done">Working</span> | Attachments and drafts not implemented |
| Browse / search / filter projects | <span class="b b-partial">Partial</span> | Lists work; search and most filters inert |
| AI risk report | <span class="b b-partial">Partial</span> | Real model; fabricated fallback |
| Bid with milestones | <span class="b b-done">Working</span> | Server does not validate amounts |
| Review bids and accept | <span class="b b-done">Working</span> | Not atomic; project status not updated |
| Contract signing | <span class="b b-done">Working</span> | Drawn image, not cryptographic, not enforced |
| Milestone submit / revision / release | <span class="b b-done">Working</span> | Release repeatable; no completion state |
| Contract chat | <span class="b b-partial">Partial</span> | No realtime; plaintext |
| Reviews and trust credits | <span class="b b-done">Working</span> | No party checks; farmable |
| Notifications (bell + page) | <span class="b b-partial">Partial</span> | Most cross-user notifications fail RLS |
| Bookmarks, lists, tasklists, services, quotes, groups | <span class="b b-mock">Mock</span> | Local state only |

## Money

| Capability | Status | Notes |
|---|---|---|
| On-chain budget lock (Shardeum) | <span class="b b-partial">Partial</span> | Real transfer, no release/refund, not linked to the project |
| Milestone escrow contract (`ProjectEscrow`) | <span class="b b-mock">Not wired</span> | Deployed on Amoy only |
| TRT token | <span class="b b-missing">Missing</span> | Never deployed |
| Token wallet balance and history | <span class="b b-done">Working</span> | — |
| Buy tokens | <span class="b b-mock">Mock</span> | No payment provider |
| Redeem tokens | <span class="b b-mock">Mock</span> | No payout |
| PayPal, Stripe | <span class="b b-mock">Mock</span> | Simulated / absent |
| Refunds | <span class="b b-missing">Missing</span> | — |
| Platform fees | <span class="b b-missing">Missing</span> | Only in UI copy |

## Disputes

| Capability | Status | Notes |
|---|---|---|
| Open a dispute from the UI | <span class="b b-missing">Missing</span> | Wizard broken; submit does not save |
| Dispute dashboard / detail for parties | <span class="b b-mock">Mock</span> | Two hard-coded cases |
| Arbitrator eligibility, slots, online status | <span class="b b-partial">Partial</span> | Gate is self-editable |
| Arbitrator case room and chat | <span class="b b-done">Working</span> | Only for disputes created outside the UI |
| Verdict moves funds | <span class="b b-missing">Missing</span> | RPCs undefined |
| AI dispute analysis | <span class="b b-mock">Mock</span> | Agent exists but unused |
| Expert panel voting, appeals | <span class="b b-missing">Missing</span> | Component never used |
| Admin console | <span class="b b-mock">Mock</span> | Public, hard-coded |

## Platform

| Capability | Status | Notes |
|---|---|---|
| Encrypted messaging (XMTP) | <span class="b b-missing">Missing</span> | — |
| Production build | <span class="b b-missing">Broken</span> | Merge conflicts, missing module |
| Reproducible database | <span class="b b-missing">Missing</span> | Six tables not in SQL |
| Automated tests | <span class="b b-missing">Missing</span> | None (app or contracts) |
| CI/CD, deployment | <span class="b b-missing">Missing</span> | Templates only |
| Mobile navigation, accessibility | <span class="b b-missing">Missing</span> | — |
