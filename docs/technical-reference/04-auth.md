# Authentication, sessions and roles

## Sign-in methods

| Method | Implementation | Status |
|---|---|---|
| Google OAuth | `supabase.auth.signInWithOAuth({ provider: 'google', redirectTo: origin + '/auth/callback' })` with the PKCE flow (`src/contexts/auth-context.tsx:234-255`, `src/lib/supabase.ts:12`) | <span class="b b-done">Working</span> |
| Email + password | `signUp` / `signInWithPassword` (`auth-context.tsx:155-232`) — contradicts the README's "Google only" | <span class="b b-partial">Partial</span> |
| Wallet login (SIWE) | Not implemented. MetaMask `personal_sign` is requested on connect but the signature is discarded (`wallet-context.tsx:113-120`) | <span class="b b-missing">Missing</span> |
| Password reset, magic link | "Forgot password?" links to `#` (`login-form.tsx:132`) | <span class="b b-missing">Missing</span> |

The login field is labelled "Email or Username", but only email works; "Remember me" and the Terms checkbox do nothing. Facebook login was removed before the first commit.

## Google sign-in flow

1. The browser starts the PKCE flow; the code verifier is stored in a cookie by the Supabase SSR browser client.
2. Google returns to Supabase, which redirects to `GET /auth/callback?code=…`.
3. `src/app/auth/callback/route.ts` exchanges the code for a session (`exchangeCodeForSession`) and writes the session cookies.
4. It looks up the `users` row. If none exists it **generates a username** from the email local part (lower-cased, non-alphanumerics replaced with `_`, then `name`, `name_2`, `name_3`… until free) and inserts `{ id, email, name, username, role: 'freelancer', avatar_url, membership_tier: 'free', balance: 0, currency: 'INR' }`. Insert errors are logged and ignored.
5. It always redirects to `/dashboard`. In the browser, `onAuthStateChange('SIGNED_IN')` loads the profile into `AuthContext`.
6. A database trigger (`handle_new_user_wallet`) creates the user's `user_wallets` row with a balance of 0.

## Email sign-up flow and its failure mode

`signup()` calls `supabase.auth.signUp`, generates a username in the browser and **inserts the `users` row from the browser** (`auth-context.tsx:205-216`), relying on the RLS rule `auth.uid() = id`.

<div class="callout warn"><span class="callout-title">Profile row can be missing</span>If Supabase email confirmation is enabled, <code>signUp</code> returns no session, so the browser insert is rejected and the account has no profile. The user can still log in later, but <code>login()</code> never creates a profile, and because the confirmation link does not go to <code>/auth/callback</code>, nothing else will either. Middleware then sees a session while <code>AuthContext</code> sees no user, which can bounce the user between <code>/login</code> and <code>/dashboard</code>. Fix: create profiles in a <code>SECURITY DEFINER</code> trigger on <code>auth.users</code>.</div>

## Sessions

- **Browser:** `AuthProvider` reads the session with `getSession()` on mount and subscribes to `onAuthStateChange`. `autoRefreshToken` keeps the access token fresh and rewrites the cookies.
- **Server:** every authenticated API route calls `supabase.auth.getUser()`, which validates the JWT with Supabase Auth — the correct pattern; `getSession()` is never trusted server-side.
- **Middleware** (`src/middleware.ts`) refreshes expired tokens on every request using the standard `@supabase/ssr` cookie pattern. Its matcher includes `/api/*`, so each API call costs two Auth round trips.
- **Logout:** `supabase.auth.signOut()` and a redirect to `/login`.

## Route protection

| Layer | Protects | Mechanism |
|---|---|---|
| Server middleware | `/dashboard`, `/profile/*`, `/wallet`, `/contracts`, `/inbox`, `/settings`, `/lists`, `/tasklists`, `/post-project` | Redirect to `/login`; logged-in users are redirected away from `/login` and `/signup` |
| Client `ConditionalLayout` | A 44-prefix list (many of them routes that don't exist) | Spinner, then `router.replace('/login')` |
| Unprotected server-side | `/admin/*`, `/disputes/*`, `/resolution-gigs/*`, `/job/*`, `/my-projects`, `/notifications`, `/feedback`, `/u/*`, `/payment-demo` … | Client guard only, or none — `/admin/disputes` is reachable by anyone |
| API routes | Each handler checks for itself | Several have no check at all (see chapter 6) |

## Authorisation model

TrustLance authorises **per record**, not per role:

- A project's owner is `projects.client_id`. Only the owner can view its bids, accept a bid or edit it.
- A contract's parties are `contracts.client_id` and `contracts.freelancer_id`. Only parties can view or sign it; only the freelancer can submit milestones; only the client can request revisions or release payment.
- A dispute's decision-maker is `disputes.arbitrator_id`.
- `src/lib/roles.ts` provides client-side helpers (`getUserRoleInJob`, `canApplyToJob`) used to choose which view a page shows.

The global `users.role` column (`client | freelancer | both`) is always `freelancer` at creation and is **never checked** by any API route.

### Arbitrator

There is no single arbitrator flag. Eligibility is `users.tokens ≥ 3000` (checked only when booking a slot), availability is `users.arbitrator_status` (any user can set themselves online), and authority over a specific dispute is `disputes.arbitrator_id`. Constants in `src/lib/arbitrator.ts` (30 tokens per project, ₹10 cancellation penalty, 1-hour booking advance, 3 specialisations) are mostly not enforced. Both `users.tokens` and `users.arbitrator_status` are missing from the repo's SQL.

### Admin

There is no admin role, claim, table or API. "Admin" power exists only as the Supabase service-role key on the server.

## Wallet linking

`linkWallet` (`auth-context.tsx:264-310`) runs entirely in the browser:

1. Lower-case the address.
2. Refuse if another user already has it ("already linked to @username" — this also reveals the other account's username).
3. Refuse if the current user already linked a different wallet ("binding is permanent").
4. `UPDATE users SET wallet_address = …` directly from the browser.

| Promise | Reality |
|---|---|
| One wallet per account, permanent | Enforced only by browser code; RLS lets a user rewrite or clear `wallet_address` at any time |
| Wallet proves identity | Ownership is never verified — the signed message is thrown away |
| Real wallet | Without MetaMask, a hard-coded demo address `0x742d35Cc…` is "connected" and can be linked permanently |
| Wallet used for payments | The linked address is never used by any money flow |

The database's only server-side protection is `UNIQUE(wallet_address)`, which is case-sensitive.
