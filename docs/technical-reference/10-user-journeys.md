# End-to-end user journeys

## Journey 1 — Joining TrustLance

1. A visitor lands on `/` and clicks **Post a Project** or **Find Work**; both require sign-in and redirect to `/login`.
2. **Google:** `signInWithOAuth` → Google → `/auth/callback` exchanges the code, creates the `users` row with a generated username and `role: 'freelancer'`, and redirects to `/dashboard`. A trigger creates the token wallet (balance 0).
3. **Email:** `signUp` and a browser-side profile insert (fails if email confirmation is on — see chapter 4).
4. There is no onboarding step. The profile can be viewed at `/u/{username}`; editing (`/profile/edit`) is currently broken by a missing import.
5. **Wallet:** on `/wallet`, Connect MetaMask, then **Link Wallet to Account**, which writes `users.wallet_address` from the browser (no ownership proof). "Switch to Shardeum" adds and selects chain 8118.

## Journey 2 — From project to payment (the core flow)

<figure>
<svg viewBox="0 0 760 560" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Helvetica, Arial" font-size="10">
  <defs><marker id="s" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f46e5"/></marker></defs>
  <g font-weight="700" font-size="11" fill="#fff">
    <rect x="10" y="8" width="140" height="26" rx="5" fill="#4f46e5"/><text x="80" y="25" text-anchor="middle">Client</text>
    <rect x="160" y="8" width="140" height="26" rx="5" fill="#0e9f9a"/><text x="230" y="25" text-anchor="middle">Freelancer</text>
    <rect x="310" y="8" width="150" height="26" rx="5" fill="#141a2e"/><text x="385" y="25" text-anchor="middle">API routes</text>
    <rect x="470" y="8" width="140" height="26" rx="5" fill="#b45309"/><text x="540" y="25" text-anchor="middle">Supabase</text>
    <rect x="620" y="8" width="130" height="26" rx="5" fill="#b91c1c"/><text x="685" y="25" text-anchor="middle">Shardeum / Gemini</text>
  </g>
  <g stroke="#dfe3ec"><line x1="80" y1="34" x2="80" y2="550"/><line x1="230" y1="34" x2="230" y2="550"/><line x1="385" y1="34" x2="385" y2="550"/><line x1="540" y1="34" x2="540" y2="550"/><line x1="685" y1="34" x2="685" y2="550"/></g>
  <g stroke="#4f46e5" stroke-width="1.3" marker-end="url(#s)">
    <line x1="80" y1="60" x2="683" y2="60"/>
    <line x1="80" y1="88" x2="383" y2="88"/><line x1="385" y1="100" x2="538" y2="100"/>
    <line x1="230" y1="135" x2="383" y2="135"/><line x1="385" y1="147" x2="683" y2="147"/><line x1="385" y1="159" x2="538" y2="159"/>
    <line x1="230" y1="190" x2="383" y2="190"/><line x1="385" y1="202" x2="538" y2="202"/>
    <line x1="80" y1="240" x2="383" y2="240"/><line x1="385" y1="252" x2="538" y2="252"/><line x1="385" y1="264" x2="538" y2="264"/>
    <line x1="80" y1="300" x2="383" y2="300"/><line x1="230" y1="312" x2="383" y2="312"/>
    <line x1="230" y1="350" x2="383" y2="350"/><line x1="385" y1="362" x2="538" y2="362"/>
    <line x1="80" y1="398" x2="383" y2="398"/><line x1="385" y1="410" x2="538" y2="410"/>
    <line x1="80" y1="446" x2="383" y2="446"/><line x1="385" y1="458" x2="538" y2="458"/><line x1="385" y1="470" x2="538" y2="470"/>
    <line x1="80" y1="510" x2="383" y2="510"/><line x1="230" y1="522" x2="383" y2="522"/><line x1="385" y1="534" x2="538" y2="534"/>
  </g>
  <g fill="#141a2e">
    <text x="90" y="55">1 · lockFunds(PROJ_x) with budget in SHM via MetaMask</text>
    <text x="90" y="83">2 · POST /api/jobs (wizard + signature)</text><text x="395" y="96">INSERT projects (open)</text>
    <text x="240" y="130">3 · POST /api/ai/project-risk</text><text x="395" y="143">Gemini risk analysis</text><text x="395" y="171" fill="#6b7389">cache ai_project_risk_reports</text>
    <text x="240" y="185">4 · POST /api/bids (+ milestones)</text><text x="395" y="198">INSERT proposals (pending)</text>
    <text x="90" y="235">5 · POST /api/bids/{id}/accept</text><text x="395" y="248">debit client tokens (top-up to 1000)</text><text x="395" y="276" fill="#6b7389">INSERT contracts (active)</text>
    <text x="90" y="295">6 · PATCH /api/contracts/{id}/sign (both)</text><text x="395" y="324" fill="#6b7389">signature PNGs</text>
    <text x="240" y="343">7 · POST …/{i}/submit</text><text x="395" y="358">UPSERT milestone_submissions</text>
    <text x="90" y="393">8a · POST …/feedback (revision)</text><text x="395" y="406">status revision_requested</text>
    <text x="90" y="441">8b · POST …/milestones/{i}/release</text><text x="395" y="454">approve; locked_amount −= x</text><text x="395" y="482" fill="#6b7389">credit freelancer (service role)</text>
    <text x="90" y="505">9 · POST /api/reviews (both)</text><text x="395" y="546" fill="#6b7389">feedback, credits, portfolio</text>
  </g>
</svg>
<figcaption>Figure 10.1 — Project lifecycle across actors and services</figcaption>
</figure>

| # | Actor | Screen | What happens | Gaps |
|---|---|---|---|---|
| 1 | Client | `/post-project` steps 1–7 | Title (≥ 10 chars), description (≥ 30), category, subcategory, budget type and amount (SHM), start/end dates, experience level, up to 10 skills, location and visibility | File attachments are collected but never uploaded |
| 2 | Client | Step 8 | Reads the agreement and draws a signature | Step 8 is not validated — a project can be posted unsigned |
| 3 | Client | Step 9 "Post Project" | MetaMask must be on chain 8118; `Escrow.lockFunds("PROJ_xxxxx", { value: budget })`; then `POST /api/jobs` | The lock is not linked to the project; if the API fails the SHM is stranded |
| 4 | Freelancer | `/dashboard` or `/dashboard/jobs` → `/job/{id}` | Browses open projects | `/find-jobs` links to a broken page |
| 5 | Freelancer | "Apply to this Job" | AI risk report in a modal (PDF auto-downloads); "Proceed Anyway" | Fallback reports are fabricated |
| 6 | Freelancer | Bid form | Amount, duration, milestones whose amounts must sum to the bid; `POST /api/bids`; client notified | Notification link is a 404 |
| 7 | Client | `/my-projects` → `/job/{id}` | Sees all bids with an Accept button | Accepted bids still show "Accept" |
| 8 | Client | "Accept Bid" (no confirmation) | Tokens debited (auto top-up), contract created, redirect to `/contracts/{id}` | Project stays `open`; double click charges twice |
| 9 | Both | `/contracts/{id}` | A blocking "Signature Required" overlay until each party signs the contract | Client signs twice (project and contract); overlay cannot be dismissed |
| 10 | Freelancer | Milestone card | Proof-of-work URL + description → Submit | — |
| 11 | Client | Milestone card | "Request revision" with comments, or "Approve & Release" in a confirmation dialog | Release is repeatable server-side; contract never becomes `completed` |
| 12 | Both | After the last release | Feedback modal opens: rate the counterpart and the platform; client's review creates a portfolio item and +30 credits for the freelancer | — |
| 13 | Both | "Download agreement" | jsPDF agreement with both signatures | Uses the project signature, not the contract one |
| — | Both | Contract chat | Plain-text messages | Counterpart's messages appear only after a reload |

## Journey 3 — Disputes

**As designed** (`DISPUTE_RESOLUTION_SYSTEM.md`): a party opens a dispute in a six-step wizard with evidence; an AI analyses the contract and communications; three anonymous domain experts vote; an admin can override; funds are paid out or refunded automatically with a full audit trail.

**As built:**

1. "Raise Dispute" on the contract page goes to `/disputes/new` (the direct API call is commented out).
2. `/disputes/new` does not compile (merge conflict). Its "AI analysis" is random, evidence upload is cosmetic and **Submit only navigates to `/disputes`** — no dispute is saved.
3. `/disputes` and `/disputes/[id]` show two hard-coded sample disputes; their actions only log to the console.
4. **The real part — arbitration:** a user with ≥ 3,000 tokens books 1-hour slots on `/resolution-gigs` (next 7 days, 09:00–21:00), goes online from five minutes before a slot, and is polled every 5 s for assigned disputes. In the room (`/resolution-gigs/room/{id}`) they read the case, chat with 3-second polling and choose **Release** (freelancer) or **Refund** (client).
5. Resolution marks the dispute RESOLVED but the payout RPCs do not exist, so **no balance changes**; the contract stays `disputed`, and release still works during a dispute.
6. The parties have no screen to follow a real dispute, and `/admin/disputes` is a public mock.

## Journey 4 — Wallet and tokens

1. **Buy** on `/profile/token-store`: 10 / 50 / 100 tokens for ₹100 / 500 / 1000, or a custom amount; choose UPI, card or net banking (a label only). Tokens are credited instantly by a mock payment.
2. **Balance and history** on `/profile/wallet` (real `token_transactions`). This page is not linked from the main navigation; the header's "Wallet" goes to the MetaMask page `/wallet`.
3. **Redeem** on `/profile/token-redeem` with bank or UPI details: the balance is debited and a PENDING request is recorded that nothing ever pays out.
4. **MetaMask wallet** (`/wallet`): shows the SHM balance; its "Pending / Earnings / Spent" cards are computed from the balance with fixed multipliers, and the transactions list never matches.
5. **PayPal** (`/profile/payments`) is simulated.

## Journey 5 — Messaging

- **Contract chat** — the only real messaging: plain text in `contract_messages`, available after hiring, refreshed on load.
- **Dispute chat** — real, arbitrator-facing, polled every 3 s.
- **Inbox and floating chat widget** — hard-coded conversations; the widget is never rendered.
- **XMTP end-to-end encryption** — not present.

## Journey 6 — Reputation

Reviews written after a contract appear on `/u/{username}` (rating, text, reviewer) and on the community wall `/feedback`. Client reviews add an automatic portfolio item and 30 "trust credits" to the freelancer. Because every account is created as `freelancer`, the "client reviews" tab on `/feedback` is effectively always empty, and the profile shows a hard-coded 98 % success rate.
