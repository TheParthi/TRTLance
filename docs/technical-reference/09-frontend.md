# Frontend

## Application shell

```
<html>
  <AuthProvider>            session + profile (contexts/auth-context.tsx)
    <WalletProvider>        MetaMask state (contexts/wallet-context.tsx)
      <ConditionalLayout>   chooses the shell for the current route
        <PublicLayout>      Header + page + Footer           (public pages)
        <AuthLayout>        AuthenticatedHeader + page        (signed-in pages)
      <Toaster/>
```

- `ChatProvider` exists but is **never mounted**.
- There are no `loading.tsx`, `error.tsx` or `not-found.tsx` files and no error boundaries.
- Almost every page is a client component that fetches data in `useEffect`; only `/u/[username]`, `/profile`, `/profile/[username]` and `/edit-profile` are server components.

## Navigation

- **Public header** (`components/layout/header.tsx`): logo, three hover mega-menus (Hire Freelancers, Find Work, Solutions — every link is `#`), Log In / Sign Up and Post a Project. It shows Log In / Sign Up even to signed-in users and has no mobile menu.
- **Authenticated header** (`components/layout/authenticated-header.tsx`, 1,123 lines): Dashboard, Jobs, Contracts, Resolution Gigs; "Browse" and "Manage" dropdowns (mostly links to pages that do not exist); search (to a missing `/search` page); wallet widget; **real-time notifications bell**; profile menu with membership, analytics, bid insights, wallet, payments, funds, transactions, financial dashboard, support and logout (most of these modals are hard-coded). A secondary row links Lists, Tasklists, My Projects, Services, Inbox, Feedback, Project Updates, Bookmarks and Disputes.

## Page inventory

<span class="b b-done">Working</span> real data end to end · <span class="b b-partial">Partial</span> real but with gaps · <span class="b b-mock">Mock</span> hard-coded · <span class="b b-missing">Broken</span> does not compile or always fails

| Route | Purpose | Data | Status |
|---|---|---|---|
| `/` | Landing page | Static | <span class="b b-done">Working</span> |
| `/login`, `/signup`, `/auth/callback` | Google and email auth | Supabase Auth | <span class="b b-done">Working</span> |
| `/dashboard` | Browse open projects + SHM wallet card | `/api/jobs` | <span class="b b-done">Working</span> |
| `/dashboard/jobs` | Job marketplace with filters | `/api/jobs` (mock fallback) | <span class="b b-partial">Partial</span> |
| `/post-project` | 9-step posting wizard, signature, on-chain SHM lock | chain + `/api/jobs` | <span class="b b-partial">Partial</span> |
| `/find-jobs` | "Top jobs" listing | `/api/jobs` | <span class="b b-partial">Partial</span> |
| `/job/[jobId]` | Job detail: client sees bids; freelancer sees AI risk report + bid form | jobs, bids, AI APIs | <span class="b b-done">Working</span> |
| `/my-projects` | Posted jobs and my bids | `/api/jobs`, `/api/bids/my-bids` | <span class="b b-done">Working</span> |
| `/contracts`, `/contracts/[id]` | Contract list and workspace (sign, submit, revise, release, chat, review, PDF) | contract APIs | <span class="b b-done">Working</span> |
| `/notifications` | Notification centre | Supabase direct | <span class="b b-done">Working</span> |
| `/profile/wallet`, `/profile/token-store`, `/profile/token-redeem` | Token wallet | `/api/wallet/*` | <span class="b b-partial">Partial</span> (mock payment) |
| `/wallet` | MetaMask wallet, link wallet to account | ethers + Supabase | <span class="b b-partial">Partial</span> |
| `/u/[username]` | Public profile (overview, portfolio, reviews, projects) | Supabase (SSR) | <span class="b b-partial">Partial</span> |
| `/profile/edit` | Edit profile, avatar, education | Supabase + `/api/profile/update` | <span class="b b-missing">Broken</span> |
| `/resolution-gigs` | Arbitrator dashboard: eligibility, slots, online toggle | arbitrator APIs | <span class="b b-partial">Partial</span> |
| `/resolution-gigs/room/[id]` | Arbitrator case room: details, chat, verdict | dispute APIs | <span class="b b-done">Working</span>* |
| `/disputes`, `/disputes/[id]` | Dispute dashboard and detail | Hard-coded | <span class="b b-mock">Mock</span> |
| `/disputes/new` | 6-step dispute wizard | Partly Supabase, mock AI | <span class="b b-missing">Broken</span> |
| `/admin/disputes` | Admin console | Hard-coded, unprotected | <span class="b b-mock">Mock</span> |
| `/projects`, `/projects/[id]`, `/projects/[id]/workspace` | Older project views | Hard-coded | <span class="b b-mock">Mock</span> / <span class="b b-missing">Broken</span> |
| `/project/[jobId]/bids`, `/my-applications`, `/dashboard/projects` | Alternate flows | Missing endpoints | <span class="b b-missing">Broken</span> |
| `/inbox`, `/bookmarks`, `/lists`, `/tasklists`, `/project-updates`, `/services`, `/quotes`, `/groups`, `/solutions`, `/prototyper`, `/payment-demo`, `/profile/payments` | Secondary features | Local state | <span class="b b-mock">Mock</span> |
| `/feedback` | Community feedback wall | Supabase direct | <span class="b b-partial">Partial</span> |

\* The arbitrator room works only for disputes created outside the UI.

About **40 links** point to routes that do not exist (for example `/categories/*`, `/browse`, `/search`, `/contests`, `/profile/settings`, `/escrow/{id}`), including the link stored in every "new bid" notification (`/projects/{id}/bids`).

## Design system

- **shadcn/ui** (default style, neutral base, CSS variables, lucide icons). About 20 primitives are used; 12 are installed but unused.
- **Theme tokens** in `src/app/globals.css`: primary indigo `#4F46E5`, foreground `#1F2937`, radius 0.5 rem, a full `.dark` palette. Fonts: Inter (body, headlines) and Source Code Pro (code) via `next/font`.
- **In practice** pages hard-code colours (`bg-white`, `bg-blue-600`, slate headers, purple dispute pages), so the dark-mode toggle (not persisted) affects little.
- Charts use recharts with hard-coded data; PDFs use jsPDF + autotable (agreement, contract, risk report).

## State and data

| Concern | Implementation |
|---|---|
| Auth | `AuthContext`: `isAuthenticated`, `user` (projection of the `users` row), `login`, `signup`, `signInWithGoogle`, `logout`, `linkWallet` |
| Wallet | `WalletContext`: MetaMask connection, chain id, SHM balance (30 s poll), mock projects and unused role helpers |
| Server data | Per-page `useEffect` + `fetch`; no SWR/React Query |
| Real time | Supabase Realtime for notifications (header) and wallet transactions; polling every 5 s / 3 s in the arbitrator pages; contract chat only refreshes on reload |
| Errors | Mixed: `alert()` (11 places), toasts, inline banners and silent `console.error`; several pages fall back to **fake data on error**, hiding real failures |

## Responsiveness and accessibility

- Marketing sections and dashboards use responsive grids, but **there is no mobile navigation** anywhere and the hover-only mega-menus cannot be used on touch screens or with a keyboard.
- One `aria-label` exists in the whole app; dropdowns lack ARIA roles; the profile menu trigger is a non-focusable `div`; many labels are not associated with inputs; the signature pad has no keyboard alternative; critical money confirmations use `confirm()`.
- Radix dialogs, tabs and selects provide focus management where they are used.

## Frontend defects that block a build

1. Unresolved merge-conflict markers in `src/app/projects/[id]/page.tsx:50-54` and `src/app/disputes/new/page.tsx:54-171`.
2. Imports of the non-existent `@/components/ui/use-toast` (real path: `@/hooks/use-toast`) in `profile/edit/page.tsx`, `profile/education-list.tsx` and `feedback/feedback-modal.tsx`.
3. `useSearchParams()` without a `<Suspense>` boundary in `disputes/new`.
4. `TabsContent` rendered outside `Tabs` in `profile/edit`.
5. Rules-of-Hooks violations in `authenticated-header.tsx` and `prototyper/page.tsx`.

`next.config.ts` sets `typescript.ignoreBuildErrors` and `eslint.ignoreDuringBuilds`, which hides type errors but cannot hide these parse and module errors.
