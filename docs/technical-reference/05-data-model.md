# Database and data model

## Source files and the order they run in

All database code is plain SQL in `backend/supabase/`, applied by hand in the Supabase SQL editor. There is no `supabase/config.toml` and no migration tracking.

| File | What it creates |
|---|---|
| `reset.sql` | Drops 14 base tables and two functions (incomplete — leaves 13 later tables behind) |
| `schema.sql` (416 lines) | 14 base tables, `contracts`, the token wallet tables, indexes, triggers, a wallet backfill |
| `rls_policies.sql` (264 lines) | Row-level security for 13 tables; **lines 228–264 are UTF-16 encoded** and contain the only definition of `contract_messages` |
| `feedback_schema.sql` | Two-way feedback tables, rating trigger, helper functions |
| `apply_signatures_migration.sql` | Signature columns (no-op on a fresh schema) |
| `seed_sample_contracts.sql` | Demo project + contract (broken: uses `auth.uid()`, which is NULL in the editor) |
| `migrations/20240126_add_client_signing.sql` | `contracts.client_signature`, `client_signed_at` |
| `migrations/20240130_create_risk_reports.sql` | `ai_project_risk_reports` |
| `migrations/20240214_add_project_date_range.sql` | `projects.start_date`, `end_date` — **required** by `POST /api/jobs` |
| `migrations/20240214_create_wallet_system.sql` | Exact duplicate of the wallet section of `schema.sql` (cannot run both) |
| `migrations/20240215_add_profile_fields.sql` | `users.hourly_rate`, `company`, `phone` |
| `migrations/20240215_create_feedback.sql` | Generic `feedback` table |
| `migrations/20240215_rich_profile.sql` | Profile columns and `user_education`, `user_certifications`, `portfolio_items`, `credit_transactions` |

<div class="callout risk"><span class="callout-title">The repository cannot recreate the live database</span>The setup guide says to run only <code>schema.sql</code> then <code>rls_policies.sql</code>, which leaves out every migration the code depends on. Worse, <b>six tables</b> used by the code exist in no SQL file at all — <code>milestone_submissions</code>, <code>dispute_messages</code>, <code>arbitrator_gigs</code>, <code>arbitrators</code>, <code>profiles</code>, <code>site_reviews</code> — along with three RPCs (<code>release_escrow_to_freelancer</code>, <code>refund_escrow_to_client</code>, <code>deduct_penalty</code>) and about a dozen columns. Either the live Supabase project contains objects that were never committed, or those features are broken. The first step of any further work is <code>supabase db pull</code> to capture the real schema.</div>

## Entity-relationship overview

<figure>
<svg viewBox="0 0 760 470" xmlns="http://www.w3.org/2000/svg" font-family="Inter, Helvetica, Arial" font-size="10.5">
  <defs><marker id="m" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6b7389"/></marker></defs>
  <g stroke="#6b7389" stroke-width="1.2" fill="none" marker-end="url(#m)">
    <path d="M150 70 L300 70"/><path d="M150 85 L300 180"/><path d="M380 95 L380 150"/>
    <path d="M440 70 L560 70"/><path d="M380 210 L380 260"/><path d="M440 285 L560 285"/>
    <path d="M440 300 L560 350"/><path d="M100 110 L100 260"/><path d="M100 110 L100 380"/>
    <path d="M150 90 L300 270"/><path d="M320 320 L230 400"/><path d="M440 85 L560 165"/>
  </g>
  <g font-weight="600" fill="#141a2e">
    <rect x="30" y="45" width="120" height="65" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="90" y="65" text-anchor="middle">users</text>
    <rect x="300" y="45" width="140" height="50" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="370" y="65" text-anchor="middle">projects</text>
    <rect x="300" y="150" width="140" height="60" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="370" y="170" text-anchor="middle">proposals (bids)</text>
    <rect x="560" y="45" width="170" height="50" rx="8" fill="#fff7ec" stroke="#b45309"/><text x="645" y="65" text-anchor="middle">ai_project_risk_reports</text>
    <rect x="300" y="260" width="140" height="60" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="370" y="280" text-anchor="middle">contracts</text>
    <rect x="560" y="260" width="170" height="45" rx="8" fill="#fdf1f1" stroke="#b91c1c" stroke-dasharray="4 3"/><text x="645" y="280" text-anchor="middle">milestone_submissions</text>
    <rect x="560" y="330" width="170" height="45" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="645" y="350" text-anchor="middle">contract_messages</text>
    <rect x="30" y="260" width="140" height="60" rx="8" fill="#effaf3" stroke="#15803d"/><text x="100" y="280" text-anchor="middle">user_wallets</text>
    <rect x="30" y="380" width="140" height="60" rx="8" fill="#effaf3" stroke="#15803d"/><text x="100" y="400" text-anchor="middle">token_transactions</text>
    <rect x="560" y="150" width="170" height="60" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="645" y="170" text-anchor="middle">disputes</text>
    <rect x="180" y="400" width="150" height="50" rx="8" fill="#f3f2ff" stroke="#4f46e5"/><text x="255" y="420" text-anchor="middle">feedback / reviews</text>
  </g>
  <g fill="#6b7389" font-size="9">
    <text x="90" y="82" text-anchor="middle">id = auth.users.id</text><text x="90" y="96" text-anchor="middle">wallet_address, balance</text>
    <text x="370" y="82" text-anchor="middle">client_id · status · budget</text>
    <text x="370" y="186" text-anchor="middle">UNIQUE(project, freelancer)</text><text x="370" y="199" text-anchor="middle">milestones JSONB</text>
    <text x="645" y="82" text-anchor="middle">(project, user) — no FKs</text>
    <text x="370" y="296" text-anchor="middle">UNIQUE(project_id)</text><text x="370" y="309" text-anchor="middle">milestones JSONB · signatures</text>
    <text x="645" y="295" text-anchor="middle">not in repo SQL</text>
    <text x="645" y="365" text-anchor="middle">sender → auth.users</text>
    <text x="100" y="296" text-anchor="middle">token_balance INT ≥ 0</text><text x="100" y="309" text-anchor="middle">1 per user</text>
    <text x="100" y="416" text-anchor="middle">BUY · SPEND</text><text x="100" y="429" text-anchor="middle">RECEIVE · REDEEM</text>
    <text x="645" y="186" text-anchor="middle">TEXT id "DSP-xxxxxx"</text><text x="645" y="199" text-anchor="middle">no link to contracts</text>
    <text x="255" y="436" text-anchor="middle">reviewer → reviewee</text>
    <text x="225" y="64">1 ─ n</text><text x="390" y="125">1 ─ n</text><text x="390" y="240">1 ─ 0..1</text><text x="470" y="64">1 ─ n</text>
  </g>
</svg>
<figcaption>Figure 5.1 — Core entities. Dashed = used by code but not defined in the repo's SQL.</figcaption>
</figure>

## Table catalogue

### Marketplace core

| Table | Purpose | Key columns | Used? |
|---|---|---|---|
| `users` | Profile mirroring `auth.users` (same id, **no FK**) | `email`, `username` (unique), `role`, `wallet_address` (unique), `balance`, `rating`, `membership_tier`, profile fields (`about`, `skills`, `languages`, `hourly_rate`, …) | <span class="b b-done">Yes</span> |
| `projects` | A job post; becomes the project once someone is hired | `client_id`, `title`, `description`, `category`, `budget_type` fixed/hourly, `budget_min/max`, `experience_level`, `skills[]`, `visibility`, `status`, `hired_freelancer_id`, `client_signature`, `start_date`, `end_date` | <span class="b b-done">Yes</span> |
| `proposals` | A freelancer's bid ("bids" in the API) | `project_id`, `freelancer_id`, `cover_letter`, `proposed_budget`, `milestones` JSONB `[{title, amount, description, duration}]`, `status`; `UNIQUE(project_id, freelancer_id)` | <span class="b b-done">Yes</span> |
| `contracts` | The agreement created when a bid is accepted | `project_id` (unique), `proposal_id`, `client_id`, `freelancer_id`, `total_amount`, `locked_amount`, `released_amount`, `status`, `milestones` JSONB, `client_signature`, `freelancer_signature`, `smart_contract_address` (always `INTERNAL_WALLET`), `feedback_pending` | <span class="b b-done">Yes</span> |
| `milestone_submissions` | Proof of work per milestone index — **no SQL in repo** | `contract_id`, `milestone_index` (needs unique pair), `proof_of_work_url`, `description`, `status` pending/approved/revision_requested, `feedback` | <span class="b b-done">Yes</span> |
| `contract_messages` | Chat on a contract | `contract_id`, `sender_id` (→ `auth.users`), `message` | <span class="b b-done">Yes</span> |
| `milestones`, `project_attachments`, `services`, `bookmarks`, `messages` | Defined for a richer model | — | <span class="b b-mock">Unused</span> |

### Money

| Table | Purpose | Key columns | Used? |
|---|---|---|---|
| `user_wallets` | Platform token balance, one per user | `user_id` (unique), `token_balance INT CHECK ≥ 0` | <span class="b b-done">Yes</span> |
| `token_transactions` | Token ledger | `type` BUY/SPEND/RECEIVE/REDEEM, `tokens`, `amount_inr`, `status` PENDING/SUCCESS/FAILED, `payment_ref`, `description` | <span class="b b-done">Yes</span> |
| `transactions` | Legacy ₹ ledger behind `users.balance` | `type` credit/debit, `category`, `status`, `payment_method` | <span class="b b-partial">Release only</span> |
| `credit_transactions` | Reputation credits | `amount`, `reason` | <span class="b b-partial">Reviews</span> |
| `blockchain_escrows` | Intended link between a project and its on-chain escrow (defaults MATIC / mumbai) | `contract_address`, `tx_hash`, wallets, `status` | <span class="b b-mock">Never written</span> |

### Disputes and arbitration

| Table | Purpose | Used? |
|---|---|---|
| `disputes` | Dispute record; TEXT id `DSP-` + 6 digits; status OPEN/AWAITING_EVIDENCE/UNDER_REVIEW/RESOLVED/ESCALATED; outcome FREELANCER/CLIENT/PARTIAL. Code also uses `arbitrator_id`, `assigned_arbitrator_id`, `milestone_index`, `domain` — none exist in SQL | <span class="b b-partial">Partial</span> |
| `dispute_messages` (no SQL), `dispute_evidence` (no RLS) | Case chat and evidence | Chat used by the arbitrator room |
| `arbitrator_gigs`, `arbitrators` (no SQL) | Bookable arbitrator time slots and profiles | Gigs used by `/resolution-gigs` |
| `ai_dispute_recommendations` | Output of the LangChain agent | <span class="b b-mock">Unused</span> |

### Reputation, profile and AI

| Table | Purpose | Used? |
|---|---|---|
| `feedback` | Generic review (reviewer → reviewee, 1–5) — the one actually used | <span class="b b-done">Yes</span> |
| `freelancer_feedback`, `client_feedback`, `platform_feedback` | Detailed two-way feedback with a rating trigger | <span class="b b-mock">No UI caller</span> |
| `site_reviews` (no SQL) | Platform rating captured with each review | Written, errors ignored |
| `user_education`, `user_certifications`, `portfolio_items` | Rich profile sections | <span class="b b-done">Yes</span> |
| `notifications` | In-app notifications, realtime-subscribed | <span class="b b-done">Yes</span> |
| `ai_project_risk_reports` | Cached Gemini risk report per (project, freelancer); no FKs, no unique key | <span class="b b-done">Yes</span> |

## Row-level security

All policies apply to both anonymous and authenticated requests (no `TO` clause), and the service role bypasses them.

| Table | Read | Write | Problem |
|---|---|---|---|
| `users` | **Everyone, including anonymous** | Own row, **any column** | Emails, phones and balances are public; users can set their own `balance`, `rating`, `role`, `tokens` |
| `projects` | Public or own | Owner only | A hired freelancer cannot see a private project |
| `proposals` | Freelancer or project owner | Freelancer inserts (any status); owner updates any column | A bid can be inserted already "accepted" |
| `contracts` | Parties | **Either party inserts or updates any column** | Milestone amounts can be rewritten before release |
| `user_wallets`, `token_transactions` | Own | **No write policy** | Wallet routes cannot work under the repo's RLS |
| `notifications` | Own | **No insert policy** | Cross-user notifications fail silently |
| `disputes` | Raiser or parties | Insert by anyone as raiser; **no update** | Arbitrators cannot resolve |
| `feedback` | Everyone | Reviewer = self | Anyone can review anyone |
| `ai_project_risk_reports` | Own | **Anyone (`WITH CHECK (true)`)** | Reports can be forged for other users |
| `project_attachments`, `dispute_evidence` | — | — | **RLS not enabled at all** |

## Functions, triggers, storage and realtime

| Object | Behaviour | Issue |
|---|---|---|
| `update_updated_at()` | Sets `updated_at` on update for most tables | — |
| `update_user_balance()` on `transactions` | Adds/subtracts `amount` to `users.balance` when a row is `completed` | Re-applies on every update of a completed row |
| `handle_new_user_wallet()` on `public.users` insert | Creates the user's wallet (SECURITY DEFINER) | No `search_path`; misleading trigger name |
| `update_freelancer_rating()` | Recomputes rating from `freelancer_feedback` | Silent no-op under RLS (updates another user's row) |
| `has_submitted_feedback`, `get_freelancer_rating`, `get_client_rating` | Helper RPCs | Never called |
| Storage bucket `avatars` | Avatar uploads from the profile editor | Bucket and policies not in SQL |
| Realtime | `notifications` inserts (header bell); `transactions` (wallet page) | Publication not in SQL |

## State machines

| Entity | Statuses | Transitions the code performs |
|---|---|---|
| Project | draft, open, in_progress, completed, cancelled | `open` on posting. Bid accept tries to set `in_progress` but writes a non-existent column, so **projects stay `open`**. Nothing sets completed or cancelled. |
| Proposal | pending, accepted, rejected, withdrawn | `pending` on bid; `accepted` / `rejected` on accept. Withdraw not implemented. |
| Contract | active, completed, disputed, cancelled, paused | `active` on accept. `disputed` only from an uncalled route. **Never `completed`.** |
| Milestone submission | pending, revision_requested, approved | Submit → pending; feedback → revision_requested; release → approved — with no guard against releasing twice. |
| Dispute | OPEN … RESOLVED | Creation routes are uncalled or fail; resolve sets RESOLVED and calls undefined RPCs. |
| Token transaction | PENDING, SUCCESS, FAILED | BUY/SPEND/RECEIVE are SUCCESS immediately; REDEEM stays PENDING forever. |

## Data-model issues to fix first

1. **Capture the live schema** (`supabase db pull`) and commit it as ordered migrations.
2. **Collapse duplicated models:** three milestone representations, two review systems, `users` vs `profiles`, five value stores, two wallet DDL copies.
3. **Lock down `users`:** expose a `public_profiles` view; make balance, rating, role, tokens and wallet columns writable only by the server.
4. **Move money into SQL:** atomic `SECURITY DEFINER` functions with row locks for buy, redeem, accept, release and dispute resolution.
5. **Add missing constraints and indexes:** FK `users.id → auth.users`, unique `(contract_id, milestone_index)`, unique risk-report key, `disputes.contract_id`, and indexes on `contracts(client_id)`, `contracts(freelancer_id)` and the timeline queries.
6. **Normalise naming:** one casing for status enums, `hired_freelancer_id` vs `freelancer_id`, job vs project vs bid vs proposal.
