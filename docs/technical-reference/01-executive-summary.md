# Executive summary

TrustLance is a freelance marketplace built around one idea: neither side of a freelance job should have to *trust* the other side or the platform. Clients lock the budget before work starts, freelancers are paid milestone by milestone when work is approved, identities are tied to a crypto wallet, and disagreements go to an arbitrator through a recorded process.

The codebase is a **Next.js 15 web application** with a **Supabase (PostgreSQL)** backend, **Solidity smart contracts** on **Shardeum** and Polygon Amoy, and **Gemini-based AI** for project risk analysis. It was built in two intense sprints — 24–27 January 2026 and 14–15 February 2026 — by Ponmadhan (PonmadhanD) and Parthiban Gunasekaran (TheParthi), and won the GDG KSR Web3 Hackathon run with Shardeum.

<div class="facts">
<div class="fact"><b>47</b><span>pages (Next.js App Router)</span></div>
<div class="fact"><b>37</b><span>API handlers in 32 route files</span></div>
<div class="fact"><b>31,350</b><span>lines of TypeScript / TSX</span></div>
<div class="fact"><b>3</b><span>Solidity contracts (426 lines)</span></div>
<div class="fact"><b>27 + 6</b><span>database tables defined + used-but-undefined</span></div>
<div class="fact"><b>13</b><span>SQL files (1,316 lines)</span></div>
<div class="fact"><b>35</b><span>commits, 2 authors</span></div>
<div class="fact"><b>1</b><span>live AI feature (Gemini 2.0 Flash)</span></div>
</div>

## Where the product stands

TrustLance is a **working hackathon prototype**, not a production system. A narrow path through the product works end to end against real services; most of the surrounding screens are designed but not yet connected.

**What works today (the "spine"):**

- Sign-in with Google or email/password (Supabase Auth), automatic profile creation.
- A client posts a project through a 9-step wizard, signs an agreement on screen and **locks the budget on-chain in SHM** on Shardeum (chain 8118).
- A freelancer opens the job, gets an **AI risk report** (Gemini 2.0 Flash) and submits a bid with milestones.
- The client accepts a bid, which creates a **contract** and debits the client's platform-token balance.
- Inside the contract: both parties sign, the freelancer submits proof of work, the client requests revisions or **releases a milestone**, the freelancer is credited, and both leave reviews.
- Platform token wallet (buy, redeem, history), notifications with realtime updates, public profiles, and an arbitrator dashboard with time-slot booking and a dispute room.

**What is not finished:**

- **The on-chain escrow and the platform ledger are disconnected.** SHM locked when a project is posted can only be withdrawn by the contract owner; freelancers are paid in off-chain database tokens instead. The full milestone escrow contract (`ProjectEscrow`) exists and is deployed on Polygon Amoy but the app never calls it.
- **Disputes are mostly a designed UI on mock data.** No screen creates a real dispute; the arbitrator room works only for disputes inserted by other means, and resolving one moves no money.
- **Encrypted XMTP messaging, PayPal escrow and real token purchases do not exist** — they are described in the README but not implemented.
- **The repository cannot be rebuilt as-is:** two pages contain unresolved merge-conflict markers, three files import a module that does not exist, and the database SQL in the repo is missing six tables and about a dozen columns that the code uses.

## The ten most important findings

| # | Finding | Impact | Chapter |
|---|---|---|---|
| 1 | Escrowed SHM has no release or refund path; only the deployer can withdraw it | Client funds stranded / custodial | 7 |
| 2 | Milestone release can be repeated and amounts are editable by either party | Unlimited balance inflation | 7, 14 |
| 3 | Buying tokens needs no payment; accepting a bid auto-tops the client up to 1,000 tokens | Free value creation | 7, 14 |
| 4 | Every user can read every other user's row (email, phone, balance) and edit their own balance, rating and role | Privacy breach, self-promotion | 5, 14 |
| 5 | Six tables and ~12 columns used by the code are not in the repo's SQL | Database cannot be recreated | 5 |
| 6 | Merge-conflict markers and a missing module break `next build` | Cannot deploy | 15 |
| 7 | Wallet ownership is never verified (the signature is discarded) | Anyone can claim any address | 4 |
| 8 | AI risk analysis stores a fabricated "LOW risk" report whenever the model call fails | Misleading users | 8 |
| 9 | Dispute screens, admin console and "AI verdicts" are hard-coded mock data | Core trust feature not functional | 9, 10 |
| 10 | README claims (Sepolia, TRT token, XMTP, PayPal, Google-only login) do not match the code | Misleading documentation | 15 |

## How to use this document

- **Chapters 2–3** explain what TrustLance is for and how it is put together.
- **Chapters 4–9** are the technical reference: authentication, database, API, blockchain, AI and frontend, each describing exactly what the code does today.
- **Chapter 10** walks through every end-to-end user journey step by step.
- **Chapters 11–12** cover configuration, running the project and its history.
- **Chapters 13–15** are the honest status: a feature matrix, the security review and known issues.
- **Chapter 16** is a phased roadmap for turning the prototype into a product.

<div class="callout"><span class="callout-title">Conventions</span>File references are written as <code>path:line</code> relative to the repository root. Status badges: <span class="b b-done">Working</span> real logic against real services · <span class="b b-partial">Partial</span> works with gaps · <span class="b b-mock">Mock</span> hard-coded or simulated · <span class="b b-missing">Missing</span> described but not built or broken.</div>
