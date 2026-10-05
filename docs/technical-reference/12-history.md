# Project history

## Timeline

| Phase | Dates | What happened |
|---|---|---|
| 0 · Bootstrap | before 24 Jan 2026 | Project created in **Firebase Studio** from the Next.js + Genkit template (package name `nextn`, `.idx/`, `apphosting.yaml`, `docs/blueprint.md`). `ProjectEscrow` deployed to **Polygon Amoy** on 23 Jan. Facebook login removed. |
| 1 · MVP sprint | 24–27 Jan 2026 | Mostly Ponmadhan: Google OAuth, Supabase schema and RLS, jobs, bids, contracts, milestones, signatures, disputes and the arbitrator "Resolution Gigs" system, wallet integration, dashboard modals, notifications, client feedback, middleware, README narrative. Work ran through the night of 26 Jan. |
| Pause | 27 Jan – 14 Feb | No commits. |
| 2 · Features + pivot | 14 Feb 2026 | Parthiban: platform token wallet (buy/redeem/history) and **AI risk analysis**, homepage redesign. Merge from `PonmadhanD/TrustLance`. Ponmadhan: **switch to Shardeum** (chain 8118). Parthiban: star-rating feedback, lock-tokens modal, Next.js performance config, Gemini 2.0 Flash. |
| 3 · Hackathon finish | 15 Feb 2026, 03:00–05:17 IST | Rich profiles, mega-menu, reviews API (Parthiban). **Native SHM escrow** on Shardeum and TRT removed after its deploy failed (Ponmadhan). Final upload and cosmetic web edits. Consistent with a submission deadline for the GDG KSR Web3 Hackathon (Shardeum), which the project won. |
| 4 · Clean-up | 5 Oct 2026 | Repository moved to `TheParthi/TRTLance`; 30,400 committed `node_modules` files and build output removed, broken submodule pointer removed, backend scripts fixed, `.env.example` and README structure added. |

## Contributors

| Person | Commits | Main contributions |
|---|---|---|
| **Ponmadhan** (PonmadhanD) | 17 | Core architecture; auth; Supabase schema and RLS; jobs, bids, contracts, milestones and signing; disputes and arbitrator system; LangChain dispute agent; wallet/MetaMask; ProjectEscrow; Shardeum migration and native-SHM Escrow; README |
| **Parthiban Gunasekaran** (TheParthi) | 18 | AI project risk analysis (Genkit/Gemini); platform token wallet; homepage, header and mega-menu; star-rating feedback; rich profiles and reviews API; performance config; repository clean-up |

35 commits in total (33 regular, 2 merges) on a single `main` branch. Line counts are dominated by the Firebase Studio scaffold in the first commit.

## Pivots

| Area | Evolution | Why it matters |
|---|---|---|
| Blockchain network | Amoy (ProjectEscrow, 23 Jan) → Sepolia (config, 25 Jan) → **Shardeum 8118** (14–15 Feb) | The README still says Sepolia; the full escrow lives on Amoy, the app uses a minimal lock on Shardeum |
| Token | TRT ERC-20 → off-chain platform tokens → TRT removed after a failed Shardeum deploy ("provided fee < minimum global fee") | "TRT" in the UI and README refers to nothing on-chain |
| Escrow design | Milestone escrow with disputes → lock-only native SHM deposit | Release and refund were lost in the pivot |
| Disputes | AI + three-expert panel + admin (design doc) → single arbitrator booked through gigs | Design doc and code describe different systems |
| AI model | Gemini 2.5 Flash → 1.5 Flash → 2.0 Flash | Model id is pinned in code |
| Auth | Facebook removed; Google added; email/password kept | README says Google only |
| Repository | `PonmadhanD/TrustLance` → `TheParthi/TRTLance` | Origin of the broken `TRLance` submodule pointer |
