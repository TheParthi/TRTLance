# End-to-end tests

Playwright, using the locally installed Google Chrome (`E2E_CHANNEL=chrome`; set it to `chromium` after `npx playwright install chromium`).

- `public.spec.ts` — landing, navigation (desktop and phone), legacy redirects, auth guards, form validation, 404. Runs against any build, even without a database.
- `escrow-journey.spec.ts` — the complete coin lifecycle through the UI with test payments: sign-up, onboarding, buying coins, posting with custom milestone amounts, proposal, hiring, signatures, locking coins in escrow, delivery, approve-and-pay (fee + 7-working-day hold), bank account verification, withdrawal paid by an admin, dispute and arbitrator decision. Needs the Docker-free local stack (`scripts/local-stack`), the app running against it with `PAYMENTS_PROVIDER` unset, and `E2E_LOCAL_STACK=1`.
- `admin.spec.ts` — the platform console. The guard tests (a visitor is sent to sign in, the console is never advertised) run against any configured environment. The rest need `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` for an account in `platform_admins` — the password is the step-up check at the gate, so it has to be the real one — and `E2E_MEMBER_EMAIL`/`E2E_MEMBER_PASSWORD` for a non-admin, to prove that `/admin` is a 404 for them. Skipped otherwise.
- `journey.spec.ts` — post project → proposal → hire → both sign → awaiting funding. Needs a Supabase-backed environment and two confirmed accounts (`E2E_CLIENT_EMAIL`, `E2E_CLIENT_PASSWORD`, `E2E_FREELANCER_EMAIL`, `E2E_FREELANCER_PASSWORD`). Skipped otherwise.

Money rules (fees, holds, auto-release, withdrawals, ledger balance) are also covered by `supabase/tests/db`.

```bash
npm run test:e2e                         # starts `npm run dev` if nothing is running
E2E_BASE_URL=https://staging.example npm run test:e2e
```
