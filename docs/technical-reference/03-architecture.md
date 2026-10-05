# System architecture

## Overview

TrustLance is a single **Next.js 15 (App Router)** application. The same codebase serves the pages (React 19 client components) and the backend (API route handlers under `src/app/api`). Persistent state lives in **Supabase**; the browser talks to it both directly (through the public anon key, guarded by row-level security) and through the API routes. Money moves on two separate rails: native **SHM on Shardeum** through the user's MetaMask, and an **off-chain token ledger** in Supabase.

<figure>
<svg viewBox="0 0 760 430" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Helvetica, Arial" font-size="11">
  <defs>
    <marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#4f46e5"/></marker>
    <marker id="g" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#9aa1b2"/></marker>
  </defs>
  <!-- Browser -->
  <rect x="10" y="10" width="230" height="200" rx="10" fill="#f3f2ff" stroke="#4f46e5"/>
  <text x="125" y="32" text-anchor="middle" font-weight="700" fill="#141a2e">Browser</text>
  <rect x="25" y="45" width="200" height="34" rx="6" fill="#fff" stroke="#c7c9f5"/><text x="125" y="66" text-anchor="middle">React pages (47) + shadcn/ui</text>
  <rect x="25" y="86" width="200" height="34" rx="6" fill="#fff" stroke="#c7c9f5"/><text x="125" y="102" text-anchor="middle">AuthContext · WalletContext</text><text x="125" y="114" text-anchor="middle" fill="#6b7389" font-size="9.5">session, profile, MetaMask state</text>
  <rect x="25" y="127" width="200" height="34" rx="6" fill="#fff" stroke="#c7c9f5"/><text x="125" y="148" text-anchor="middle">Supabase JS (anon key, PKCE)</text>
  <rect x="25" y="168" width="200" height="34" rx="6" fill="#fff" stroke="#c7c9f5"/><text x="125" y="189" text-anchor="middle">ethers v6 → MetaMask</text>
  <!-- Next server -->
  <rect x="285" y="10" width="200" height="200" rx="10" fill="#effaf8" stroke="#0e9f9a"/>
  <text x="385" y="32" text-anchor="middle" font-weight="700" fill="#141a2e">Next.js server</text>
  <rect x="300" y="45" width="170" height="34" rx="6" fill="#fff" stroke="#a7dcd9"/><text x="385" y="66" text-anchor="middle">middleware.ts (route guard)</text>
  <rect x="300" y="86" width="170" height="48" rx="6" fill="#fff" stroke="#a7dcd9"/><text x="385" y="105" text-anchor="middle">API routes (37 handlers)</text><text x="385" y="120" text-anchor="middle" fill="#6b7389" font-size="9.5">jobs · bids · contracts · wallet</text>
  <rect x="300" y="141" width="170" height="28" rx="6" fill="#fff" stroke="#a7dcd9"/><text x="385" y="159" text-anchor="middle">/auth/callback (OAuth)</text>
  <rect x="300" y="176" width="170" height="28" rx="6" fill="#fff" stroke="#a7dcd9"/><text x="385" y="194" text-anchor="middle">Genkit flow (risk analysis)</text>
  <!-- Supabase -->
  <rect x="530" y="10" width="220" height="200" rx="10" fill="#fff7ec" stroke="#b45309"/>
  <text x="640" y="32" text-anchor="middle" font-weight="700" fill="#141a2e">Supabase</text>
  <rect x="545" y="45" width="190" height="30" rx="6" fill="#fff" stroke="#f0cf9e"/><text x="640" y="64" text-anchor="middle">Auth (Google OAuth, email)</text>
  <rect x="545" y="82" width="190" height="44" rx="6" fill="#fff" stroke="#f0cf9e"/><text x="640" y="100" text-anchor="middle">PostgreSQL + RLS</text><text x="640" y="114" text-anchor="middle" fill="#6b7389" font-size="9.5">users · projects · contracts · tokens</text>
  <rect x="545" y="133" width="190" height="30" rx="6" fill="#fff" stroke="#f0cf9e"/><text x="640" y="152" text-anchor="middle">Realtime (notifications)</text>
  <rect x="545" y="170" width="190" height="30" rx="6" fill="#fff" stroke="#f0cf9e"/><text x="640" y="189" text-anchor="middle">Storage (avatars bucket)</text>
  <!-- Chains -->
  <rect x="10" y="260" width="230" height="80" rx="10" fill="#fdf1f1" stroke="#b91c1c"/>
  <text x="125" y="282" text-anchor="middle" font-weight="700" fill="#141a2e">Shardeum · chain 8118</text>
  <text x="125" y="302" text-anchor="middle">Escrow (native SHM lock)</text>
  <text x="125" y="318" text-anchor="middle" fill="#6b7389" font-size="9.5">0x2DC6…712F · lockFunds only</text>
  <rect x="285" y="260" width="200" height="80" rx="10" fill="#fff" stroke="#9aa1b2" stroke-dasharray="5 4"/>
  <text x="385" y="282" text-anchor="middle" font-weight="700" fill="#6b7389">Not wired into the app</text>
  <text x="385" y="300" text-anchor="middle" fill="#6b7389">ProjectEscrow on Polygon Amoy</text>
  <text x="385" y="315" text-anchor="middle" fill="#6b7389">LangChain dispute agent</text>
  <text x="385" y="330" text-anchor="middle" fill="#6b7389">TrustToken (TRT) — never deployed</text>
  <rect x="530" y="260" width="220" height="80" rx="10" fill="#f5f7fb" stroke="#4f46e5"/>
  <text x="640" y="282" text-anchor="middle" font-weight="700" fill="#141a2e">Google AI</text>
  <text x="640" y="302" text-anchor="middle">Gemini 2.0 Flash</text>
  <text x="640" y="318" text-anchor="middle" fill="#6b7389" font-size="9.5">GEMINI_API_KEY via Genkit</text>
  <!-- arrows -->
  <line x1="240" y1="100" x2="300" y2="100" stroke="#4f46e5" stroke-width="1.6" marker-end="url(#a)"/>
  <text x="270" y="93" text-anchor="middle" font-size="9" fill="#4f46e5">fetch</text>
  <line x1="470" y1="105" x2="545" y2="105" stroke="#4f46e5" stroke-width="1.6" marker-end="url(#a)"/>
  <text x="508" y="98" text-anchor="middle" font-size="9" fill="#4f46e5">user JWT</text>
  <path d="M225 144 C 380 236, 470 236, 545 160" fill="none" stroke="#4f46e5" stroke-width="1.6" marker-end="url(#a)"/>
  <text x="400" y="232" text-anchor="middle" font-size="9" fill="#4f46e5">direct browser queries (RLS)</text>
  <line x1="125" y1="202" x2="125" y2="260" stroke="#b91c1c" stroke-width="1.6" marker-end="url(#a)"/>
  <text x="132" y="236" font-size="9" fill="#b91c1c">lockFunds (SHM)</text>
  <path d="M470 190 C 520 230, 580 230, 610 260" fill="none" stroke="#4f46e5" stroke-width="1.6" marker-end="url(#a)"/>
  <text x="560" y="224" font-size="9" fill="#4f46e5">prompt</text>
  <!-- legend -->
  <text x="10" y="372" font-weight="700" fill="#141a2e">Two money rails that never meet</text>
  <text x="10" y="390" fill="#2b3248">• On-chain: client's SHM → Escrow contract at project posting (cannot be released to the freelancer).</text>
  <text x="10" y="406" fill="#2b3248">• Off-chain: user_wallets.token_balance debited at hiring, credited at milestone release (1 token = ₹10).</text>
  <text x="10" y="422" fill="#2b3248">• Service-role key is used server-side only, in one route (milestone release) and in maintenance scripts.</text>
</svg>
<figcaption>Figure 3.1 — Runtime components and data flows as implemented</figcaption>
</figure>

## Technology stack

| Layer | Technology | Version | Notes |
|---|---|---|---|
| Framework | Next.js App Router | 15.5.9 | Dev server on Turbopack, port 9002 |
| UI runtime | React | 19.2 | Almost every page is a client component (`"use client"`) |
| Styling | Tailwind CSS + shadcn/ui (Radix) | 3.4 | Indigo `#4F46E5` primary, Inter + Source Code Pro |
| Icons, charts, PDF | lucide-react, recharts, jsPDF + autotable | — | Charts use hard-coded data |
| Auth & database | Supabase (`@supabase/ssr`, `supabase-js`) | 0.8 / 2.91 | Auth, PostgreSQL with RLS, Realtime, Storage |
| Web3 | ethers v6 + MetaMask (`window.ethereum`) | 6.16 | No wagmi/viem/WalletConnect |
| Smart contracts | Solidity + Hardhat + OpenZeppelin 5 | 0.8.20 / 2.28 | In `backend/` (own `package.json`) |
| AI (live) | Genkit + Google AI plugin | 1.20 | Model `googleai/gemini-2.0-flash` |
| AI (not wired) | LangChain JS (OpenAI / Ollama) | 0.1 | `backend/ai/dispute-agent.js` |
| Hosting (template) | Firebase App Hosting, Firebase Studio (IDX) | — | `apphosting.yaml`, `.idx/dev.nix`; no evidence of deployment |

## Repository structure

```
TRTLance/
├── src/
│   ├── app/                    47 pages + 32 API route files (App Router)
│   │   ├── api/                jobs, bids, contracts, milestones, disputes,
│   │   │                       arbitrator, feedback, reviews, profile,
│   │   │                       projects, wallet, ai
│   │   ├── auth/callback/      Google OAuth code exchange + profile creation
│   │   └── …                   dashboard, post-project, job, contracts, wallet…
│   ├── components/             80 components (36 shadcn/ui primitives)
│   ├── contexts/               auth-context, wallet-context, chat-context (unused)
│   ├── ai/                     Genkit setup and two flows
│   ├── hooks/                  use-toast, mock dispute/workspace hooks
│   ├── lib/                    supabase clients, config, contracts, payments, roles
│   ├── scripts/                demo-user and diagnostic scripts (service role)
│   └── middleware.ts           server-side route protection
├── backend/
│   ├── contracts/              Escrow.sol, ProjectEscrow.sol, TrustToken.sol
│   ├── scripts/                Hardhat deploy scripts (Amoy, Shardeum)
│   ├── deployments/            recorded contract addresses
│   ├── ai/dispute-agent.js     LangChain dispute recommender (unused)
│   └── supabase/               schema, RLS, migrations, seed SQL
├── blockchain/contracts/       older copies of Escrow and TrustToken
├── docs/                       blueprint + this technical reference
└── README.md, SETUP_STEPS.md, DISPUTE_RESOLUTION_SYSTEM.md, GET_PRIVATE_KEY.md
```

## How a request flows

1. **Page load.** `src/middleware.ts` runs on every request (including `/api/*`), refreshes the Supabase session cookie and redirects unauthenticated users away from nine protected prefixes. `ConditionalLayout` repeats the check in the browser for a longer list of prefixes and chooses the public or authenticated shell.
2. **Data fetching.** Pages fetch in `useEffect` on mount — there is no caching layer. About half the data comes from `/api/*` routes; the rest comes from direct browser queries to Supabase (`users`, `notifications`, `feedback`, `user_education`, `transactions`, storage).
3. **API routes.** Each handler creates a server Supabase client from the request cookies, calls `supabase.auth.getUser()` to verify the JWT, checks ownership where implemented, and reads or writes as the user — so **row-level security applies**. One route (milestone release) additionally uses the service-role client to write ledger rows that RLS would block.
4. **Blockchain.** Only one on-chain write happens anywhere: `Escrow.lockFunds` when a project is posted, sent from the user's MetaMask. No API route touches the chain.
5. **AI.** `POST /api/ai/project-risk` runs a Genkit flow in-process, which calls Gemini and caches the result in `ai_project_risk_reports`.

## Value stores

The same idea of "money" is held in five places that are not reconciled with each other:

| Store | Unit | Written by | Purpose |
|---|---|---|---|
| MetaMask balance on chain 8118 | SHM | the user | Shown in headers and wallet pages |
| `Escrow` contract balance | SHM | `lockFunds` at project posting | Budget lock; withdrawable only by the owner |
| `user_wallets.token_balance` + `token_transactions` | tokens (₹10 each) | buy, redeem, bid accept, milestone release | The working platform ledger |
| `users.balance` + `transactions` | ₹ | DB trigger on `transactions` (fed by milestone release) | Legacy fiat ledger |
| `users.total_credits` + `credit_transactions`, `users.tokens` | credits / tokens | reviews; manual | Reputation credits; arbitrator eligibility |

Chapter 7 traces how value moves between them, and chapter 16 proposes collapsing them into a single ledger.
