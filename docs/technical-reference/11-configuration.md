# Configuration, environments and running locally

## Environment variables

Copy `.env.example` to `.env.local` in the repository root. The Next.js app and Hardhat (run from `backend/`, which loads `../.env.local`) both read it. Exceptions: `npm run genkit:dev` loads `.env`, and the LangChain agent loads nothing.

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | app, middleware, scripts, agent | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | app | Public anon key (safe to expose; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | release route, scripts, agent | **Secret** — bypasses RLS; server only |
| `GEMINI_API_KEY` | Genkit Google AI plugin | Risk analysis (also accepts `GOOGLE_API_KEY`) |
| `AI_PROVIDER`, `OPENAI_API_KEY`, `OLLAMA_BASE_URL`, `MODEL_NAME` | dispute agent | Unused at runtime (agent not wired) |
| `DEPLOYER_PRIVATE_KEY` | Hardhat (all networks) | **Secret** — deployer wallet key |
| `PLATFORM_ADMIN_ADDRESS` | `deploy.js` | ProjectEscrow arbiter address |
| `POLYGON_AMOY_RPC`, `POLYGON_RPC`, `SEPOLIA_RPC` | Hardhat | RPC overrides |
| `POLYGONSCAN_API_KEY` | Hardhat verify | Contract verification on Polygon |
| `ANALYZE` | `next.config.ts` | Enables the bundle analyser |

Not configurable (hard-coded in `src/lib/config.ts`): chain id `8118`, escrow address `0x2DC6…712F`, TRT address `0x0`. The Shardeum RPC (`https://api.shardeum.org`) is hard-coded in `hardhat.config.js` and the wallet context.

## Scripts and ports

| Command | Where | What |
|---|---|---|
| `npm run dev` | root | Next.js dev server with Turbopack on **port 9002** |
| `npm run build` / `start` | root | Production build (POSIX env syntax) / serve on port 3000 |
| `npm run typecheck` | root | `tsc --noEmit` |
| `npm run genkit:dev` | root | Genkit developer UI (registers only the unused recommendations flow) |
| `npm run lint` | root | `next lint` — no ESLint config or package exists |
| `npm run compile` | backend | Compile contracts |
| `npm run deploy:amoy` / `deploy:polygon` / `deploy:local` | backend | Deploy **ProjectEscrow** |
| `npx hardhat run scripts/deploy_shardeum.js --network shardeum` | backend | Deploy the **Escrow** the app uses (no npm script) |
| `npx tsx src/scripts/<name>.ts` | root | Demo-user and diagnostic scripts (service role) |

## Build configuration

- `next.config.ts`: `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds` (template defaults — should be turned off), remote images from placehold.co, unsplash and picsum, `compress`, `poweredByHeader: false`, optimised imports for Radix and lucide, optional webpack bundle analyser.
- `tsconfig.json`: strict mode, `@/* → src/*`, bundler resolution.
- Tailwind 3 with `tailwindcss-animate`; PostCSS without autoprefixer.
- **Hosting templates:** `apphosting.yaml` (Firebase App Hosting, one instance, no environment configured) and `.idx/dev.nix` (Firebase Studio: Node 20, Firebase emulators that the app does not use). Nothing shows the app was ever deployed there.

## Setting up a working local environment

The documented setup (`SETUP_STEPS.md`) is incomplete. A setup that matches what the code needs:

1. **Install:** Node 20+, then `npm install` in the root and in `backend/`.
2. **Supabase project:** create one and fill `.env.local` from `.env.example`.
3. **Database** — run in this order in the SQL editor:
   - `schema.sql`
   - `rls_policies.sql` (re-save the UTF-16 tail as UTF-8 first, or paste the `contract_messages` block separately)
   - `feedback_schema.sql`
   - migrations `20240126`, `20240130`, `20240214_add_project_date_range`, `20240215_*` (skip `20240214_create_wallet_system` — it duplicates `schema.sql`)
   - then create the six missing tables, the missing columns (`users.tokens`, `users.arbitrator_status`, `disputes.arbitrator_id`, `milestone_index`, `domain`) and the escrow RPCs — or, better, pull them from the live project with `supabase db pull`.
4. **Storage:** create a public `avatars` bucket with an upload policy for signed-in users.
5. **Realtime:** add `notifications` (and `transactions`) to the `supabase_realtime` publication.
6. **Auth:** enable Google OAuth with redirect `http://localhost:9002/auth/callback`; disable email confirmation or move profile creation into a database trigger.
7. **AI:** set `GEMINI_API_KEY`.
8. **Blockchain:** install MetaMask, add Shardeum (the app offers "Switch to Shardeum"), fund the wallet with SHM. To use your own escrow, deploy with `deploy_shardeum.js` and update `src/lib/config.ts`.
9. **Fix the build blockers** listed in chapter 15, then `npm run dev` and open `http://localhost:9002`.

## Dependency notes

- **Used:** Next 15.5, React 19, Supabase SSR + JS, ethers 6, Genkit + Google AI, jsPDF + autotable, recharts, react-signature-canvas, Radix primitives, date-fns, Tailwind.
- **Installed but unused:** `@genkit-ai/next`, `@hookform/resolvers`, `react-hook-form`, `zod` (direct), `firebase`, `@supabase/auth-helpers-nextjs` (deprecated), `patch-package`, `react-day-picker`, `embla-carousel-react`, and several Radix packages behind unused shadcn wrappers.
- **Missing:** `eslint` and `eslint-config-next` for `npm run lint`.
- **Backend:** Hardhat 2.28, OpenZeppelin 5.4, hardhat-toolbox 4, dotenv; LangChain packages and `openai` only for the unused agent.
