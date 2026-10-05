-- TrustLance v2 — contracts, milestones, submissions, escrow transactions and the contract audit trail.
--
-- Milestone lifecycle (enforced by the functions in the workflow migration):
--   pending → funded → submitted → approved → paid
--   submitted → revision_requested → submitted
--   funded | submitted | revision_requested | approved → disputed → paid | refunded | settled
--   funded → refunded            (freelancer voluntarily returns the funds on-chain)

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id),
  proposal_id uuid not null unique references public.proposals (id),
  client_id uuid not null references public.profiles (id),
  freelancer_id uuid not null references public.profiles (id),
  title text not null,
  scope text not null,
  deliverables text[] not null default '{}',
  currency text not null default 'SHM' check (currency = 'SHM'),
  total_amount numeric(38, 18) not null check (total_amount > 0),
  status text not null default 'pending_signatures'
    check (status in ('pending_signatures', 'awaiting_funding', 'active', 'disputed', 'completed', 'cancelled')),
  -- Exact terms both parties sign; terms_hash = sha256 of the canonical JSON.
  terms jsonb not null,
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  client_signed_at timestamptz,
  client_signature_name text check (char_length(client_signature_name) between 2 and 100),
  client_wallet text check (client_wallet ~ '^0x[0-9a-f]{40}$'),
  freelancer_signed_at timestamptz,
  freelancer_signature_name text check (char_length(freelancer_signature_name) between 2 and 100),
  freelancer_wallet text check (freelancer_wallet ~ '^0x[0-9a-f]{40}$'),
  -- Escrow location, recorded when the funding transaction is verified.
  chain_id int,
  escrow_address text check (escrow_address ~ '^0x[0-9a-f]{40}$'),
  escrow_key text check (escrow_key ~ '^0x[0-9a-f]{64}$'),
  funded_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint contracts_distinct_parties check (client_id <> freelancer_id)
);
create trigger contracts_touch before update on public.contracts
  for each row execute function app.touch_updated_at();
-- A project has at most one live contract; a contract cancelled before funding frees the project.
create unique index contracts_one_live_per_project on public.contracts (project_id) where status <> 'cancelled';
create index contracts_client_idx on public.contracts (client_id, created_at desc);
create index contracts_freelancer_idx on public.contracts (freelancer_id, created_at desc);

-- The on-chain reference for a contract: its UUID as 32 bytes (16 bytes of UUID, right-padded).
create or replace function app.contract_ref(p_contract uuid)
returns text
language sql
immutable
as $$
  select '0x' || replace(p_contract::text, '-', '') || repeat('0', 32)
$$;

create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  position int not null check (position between 1 and 20),
  title text not null,
  description text not null default '',
  amount numeric(38, 18) not null check (amount > 0),
  due_in_days int not null check (due_in_days between 1 and 730),
  due_date date,
  status text not null default 'pending'
    check (status in ('pending', 'funded', 'submitted', 'revision_requested', 'approved', 'paid',
                      'disputed', 'refunded', 'settled')),
  status_before_dispute text,
  revision_count int not null default 0,
  submitted_at timestamptz,
  approved_at timestamptz,
  paid_at timestamptz,
  freelancer_payout numeric(38, 18),
  client_refund numeric(38, 18),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, position)
);
create trigger milestones_touch before update on public.milestones
  for each row execute function app.touch_updated_at();

create table public.milestone_submissions (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.milestones (id) on delete cascade,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  version int not null check (version >= 1),
  note text not null check (char_length(note) between 10 and 5000),
  links text[] not null default '{}' check (cardinality(links) <= 10),
  submitted_by uuid not null references public.profiles (id),
  review_status text not null default 'pending' check (review_status in ('pending', 'revision_requested', 'approved')),
  review_comment text check (char_length(review_comment) <= 5000),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (milestone_id, version)
);
create index milestone_submissions_contract_idx on public.milestone_submissions (contract_id, created_at desc);

create table public.contract_files (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  submission_id uuid references public.milestone_submissions (id) on delete set null,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null unique check (char_length(storage_path) <= 400),
  file_name text not null check (char_length(file_name) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 52428800),
  mime_type text not null check (char_length(mime_type) <= 120),
  created_at timestamptz not null default now()
);
create index contract_files_contract_idx on public.contract_files (contract_id);

-- Every on-chain transaction the app knows about, from the moment a wallet broadcasts it.
create table public.escrow_transactions (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id) on delete cascade,
  milestone_id uuid references public.milestones (id) on delete cascade,
  kind text not null check (kind in ('fund', 'release', 'refund', 'dispute', 'resolve')),
  chain_id int not null,
  tx_hash text not null check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  from_address text check (from_address ~ '^0x[0-9a-f]{40}$'),
  amount numeric(38, 18),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  block_number bigint,
  failure_reason text,
  reported_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (chain_id, tx_hash)
);
create index escrow_transactions_contract_idx on public.escrow_transactions (contract_id, created_at desc);

-- Append-only activity log for a contract.
create table public.contract_events (
  id bigint generated always as identity primary key,
  contract_id uuid not null references public.contracts (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index contract_events_contract_idx on public.contract_events (contract_id, id);
create trigger contract_events_immutable before update or delete on public.contract_events
  for each row execute function app.forbid_mutation();

create or replace function app.log_contract_event(p_contract uuid, p_type text, p_data jsonb default '{}'::jsonb,
                                                  p_actor uuid default auth.uid())
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.contract_events (contract_id, actor_id, type, data) values (p_contract, p_actor, p_type, p_data)
$$;

create or replace function app.is_contract_party(p_contract uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.contracts c
                  where c.id = p_contract and (c.client_id = p_uid or c.freelancer_id = p_uid))
$$;

-- Redefined in the disputes migration to include the assigned arbitrator.
create or replace function app.can_view_contract(p_contract uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_contract_party(p_contract) or app.is_admin()
$$;

-- ---------------------------------------------------------------------------
-- Privileges and RLS — all writes go through workflow functions.
-- ---------------------------------------------------------------------------
revoke all on public.contracts, public.milestones, public.milestone_submissions, public.contract_files,
              public.escrow_transactions, public.contract_events
  from anon, authenticated;
grant select on public.contracts, public.milestones, public.milestone_submissions, public.contract_files,
                public.escrow_transactions, public.contract_events
  to authenticated;

alter table public.contracts enable row level security;
alter table public.milestones enable row level security;
alter table public.milestone_submissions enable row level security;
alter table public.contract_files enable row level security;
alter table public.escrow_transactions enable row level security;
alter table public.contract_events enable row level security;

create policy contracts_read on public.contracts for select to authenticated using (app.can_view_contract(id));
create policy milestones_read on public.milestones for select to authenticated using (app.can_view_contract(contract_id));
create policy submissions_read on public.milestone_submissions for select to authenticated using (app.can_view_contract(contract_id));
create policy contract_files_read on public.contract_files for select to authenticated using (app.can_view_contract(contract_id));
create policy escrow_tx_read on public.escrow_transactions for select to authenticated using (app.can_view_contract(contract_id));
create policy contract_events_read on public.contract_events for select to authenticated using (app.can_view_contract(contract_id));

revoke execute on function app.log_contract_event(uuid, text, jsonb, uuid) from public;
grant execute on function app.is_contract_party(uuid, uuid), app.can_view_contract(uuid), app.contract_ref(uuid)
  to authenticated, service_role;
