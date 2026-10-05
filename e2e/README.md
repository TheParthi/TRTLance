# End-to-end tests

Playwright, using the locally installed Google Chrome (`E2E_CHANNEL=chrome`; set it to `chromium` after `npx playwright install chromium`).

- `public.spec.ts` — landing, navigation (desktop and phone), legacy redirects, auth guards, form validation, 404. Runs against any build, even without a database.
- `journey.spec.ts` — post project → proposal → hire → both sign → awaiting funding. Needs a Supabase-backed environment and two confirmed accounts with verified wallets (`E2E_CLIENT_EMAIL`, `E2E_CLIENT_PASSWORD`, `E2E_FREELANCER_EMAIL`, `E2E_FREELANCER_PASSWORD`). Skipped otherwise.

On-chain steps (fund, release, refund, dispute settlement) need a wallet extension; they are covered by `blockchain/test` (contract) and `supabase/tests/db` (database effects and idempotency), plus `src/lib/chain/verify.test.ts` (receipt verification).

```bash
npm run test:e2e                         # starts `npm run dev` if nothing is running
E2E_BASE_URL=https://staging.example npm run test:e2e
```
