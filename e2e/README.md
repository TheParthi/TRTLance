# End-to-end tests

Playwright, using the locally installed Google Chrome (`E2E_CHANNEL=chrome`; set it to `chromium` after `npx playwright install chromium`).

- `public.spec.ts` — landing, navigation (desktop and phone), legacy redirects, auth guards, form validation, 404. Runs against any build, even without a database.
- `escrow-journey.spec.ts` — the complete money lifecycle through the UI on a local chain: sign-up, onboarding, SIWE wallet verification, posting, proposal, hiring, signatures, escrow funding, delivery, approval and release, dispute, on-chain flag, arbitrator decision and arbiter settlement. Wallets are injected (EIP-1193, backed by Hardhat accounts). Needs the Docker-free local stack (`scripts/local-stack`), `npx hardhat node` + `npm run deploy:local`, and `E2E_LOCAL_STACK=1`.
- `journey.spec.ts` — post project → proposal → hire → both sign → awaiting funding. Needs a Supabase-backed environment and two confirmed accounts with verified wallets (`E2E_CLIENT_EMAIL`, `E2E_CLIENT_PASSWORD`, `E2E_FREELANCER_EMAIL`, `E2E_FREELANCER_PASSWORD`). Skipped otherwise.

On real networks the on-chain steps need a wallet extension; beyond the local journey they are also covered by `blockchain/test` (contract) and `supabase/tests/db` (database effects and idempotency), plus `src/lib/chain/verify.test.ts` (receipt verification).

```bash
npm run test:e2e                         # starts `npm run dev` if nothing is running
E2E_BASE_URL=https://staging.example npm run test:e2e
```
