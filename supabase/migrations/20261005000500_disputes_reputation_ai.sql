-- TrustLance v2 — disputes and arbitration, reputation, profile sections and AI outputs.

-- ---------------------------------------------------------------------------
-- Arbitrators
-- ---------------------------------------------------------------------------
create table public.arbitrators (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  specializations text[] not null default '{}' check (cardinality(specializations) between 1 and 3),
  statement text not null check (char_length(statement) between 50 and 2000),
  capacity int not null default 3 check (capacity between 1 and 10),
  is_available boolean not null default false,
  applied_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id),
  review_note text,
  updated_at timestamptz not null default now()
);
create trigger arbitrators_touch before update on public.arbitrators
  for each row execute function app.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Disputes (one active dispute per milestone)
-- ---------------------------------------------------------------------------
create table public.disputes (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  contract_id uuid not null references public.contracts (id),
  milestone_id uuid not null references public.milestones (id),
  raised_by uuid not null references public.profiles (id),
  respondent_id uuid not null references public.profiles (id),
  reason text not null check (reason in ('quality', 'scope', 'deadline', 'non_responsive', 'non_payment', 'other')),
  description text not null check (char_length(description) between 50 and 5000),
  requested_outcome text not null check (requested_outcome in ('release', 'refund', 'partial')),
  requested_freelancer_pct int check (requested_freelancer_pct between 0 and 100),
  amount numeric(38, 18) not null check (amount > 0),
  status text not null default 'open'
    check (status in ('open', 'awaiting_evidence', 'under_review', 'resolved', 'escalated')),
  arbitrator_id uuid references public.profiles (id),
  assigned_at timestamptz,
  evidence_due_at timestamptz,
  escalation_reason text,
  decision text check (decision in ('freelancer', 'client', 'partial')),
  freelancer_pct int check (freelancer_pct between 0 and 100),
  decision_reason text check (char_length(decision_reason) <= 5000),
  decided_by uuid references public.profiles (id),
  decided_at timestamptz,
  -- Settlement of the decision on-chain.
  onchain_flagged_at timestamptz,
  settlement_status text not null default 'awaiting_flag'
    check (settlement_status in ('awaiting_flag', 'ready', 'pending', 'settled', 'failed')),
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint disputes_decision_complete check (
    status <> 'resolved' or (decision is not null and freelancer_pct is not null and decided_at is not null)
  )
);
create trigger disputes_touch before update on public.disputes
  for each row execute function app.touch_updated_at();
create unique index disputes_one_active_per_milestone on public.disputes (milestone_id) where status <> 'resolved';
create index disputes_contract_idx on public.disputes (contract_id);
create index disputes_arbitrator_idx on public.disputes (arbitrator_id, status);

create table public.dispute_evidence (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id),
  kind text not null check (kind in ('file', 'link', 'note')),
  title text not null check (char_length(btrim(title)) between 3 and 160),
  description text not null default '' check (char_length(description) <= 3000),
  url text check (url ~ '^https?://\S{3,}$' and char_length(url) <= 500),
  storage_path text check (char_length(storage_path) <= 400),
  file_name text check (char_length(file_name) <= 200),
  size_bytes bigint check (size_bytes between 1 and 52428800),
  mime_type text check (char_length(mime_type) <= 120),
  created_at timestamptz not null default now(),
  constraint evidence_shape check (
    (kind = 'file' and storage_path is not null and file_name is not null)
    or (kind = 'link' and url is not null)
    or (kind = 'note' and char_length(description) >= 10)
  )
);
create index dispute_evidence_dispute_idx on public.dispute_evidence (dispute_id, created_at);

create table public.dispute_messages (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  sender_id uuid references public.profiles (id),
  kind text not null default 'text' check (kind in ('text', 'system')),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now(),
  constraint dispute_messages_shape check ((kind = 'text') = (sender_id is not null))
);
create index dispute_messages_dispute_idx on public.dispute_messages (dispute_id, created_at);

create table public.dispute_events (
  id bigint generated always as identity primary key,
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  actor_id uuid references public.profiles (id),
  type text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index dispute_events_dispute_idx on public.dispute_events (dispute_id, id);
create trigger dispute_events_immutable before update or delete on public.dispute_events
  for each row execute function app.forbid_mutation();

create or replace function app.log_dispute_event(p_dispute uuid, p_type text, p_data jsonb default '{}'::jsonb,
                                                 p_actor uuid default auth.uid())
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.dispute_events (dispute_id, actor_id, type, data) values (p_dispute, p_actor, p_type, p_data)
$$;

create or replace function app.can_view_dispute(p_dispute uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.disputes d join public.contracts c on c.id = d.contract_id
     where d.id = p_dispute
       and (c.client_id = p_uid or c.freelancer_id = p_uid or d.arbitrator_id = p_uid)
  ) or app.is_admin(p_uid)
$$;

-- Arbitrators assigned to a dispute on a contract can read that contract's record.
create or replace function app.can_view_contract(p_contract uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.is_contract_party(p_contract)
      or app.is_admin()
      or exists (select 1 from public.disputes d where d.contract_id = p_contract and d.arbitrator_id = auth.uid())
$$;

-- ---------------------------------------------------------------------------
-- Reputation
-- ---------------------------------------------------------------------------
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts (id),
  reviewer_id uuid not null references public.profiles (id),
  reviewee_id uuid not null references public.profiles (id),
  reviewer_role text not null check (reviewer_role in ('client', 'freelancer')),
  rating smallint not null check (rating between 1 and 5),
  -- Category ratings, 1–5 each. Client reviews: quality, communication, timeliness.
  -- Freelancer reviews: clarity, communication, responsiveness.
  ratings jsonb not null default '{}'::jsonb check (jsonb_typeof(ratings) = 'object'),
  body text not null check (char_length(btrim(body)) between 20 and 3000),
  created_at timestamptz not null default now(),
  unique (contract_id, reviewer_id),
  constraint reviews_distinct check (reviewer_id <> reviewee_id)
);
create index reviews_reviewee_idx on public.reviews (reviewee_id, created_at desc);

-- Trust credits ledger: an explainable history of every credit change.
create table public.trust_credit_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null,
  reason text not null check (reason in ('contract_completed', 'positive_review', 'dispute_lost')),
  contract_id uuid references public.contracts (id),
  created_at timestamptz not null default now(),
  unique (user_id, reason, contract_id)
);
create trigger trust_credit_events_immutable before update or delete on public.trust_credit_events
  for each row execute function app.forbid_mutation();

create or replace function app.award_trust_credits(p_user uuid, p_reason text, p_contract uuid, p_delta int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted int;
begin
  insert into public.trust_credit_events (user_id, delta, reason, contract_id)
  values (p_user, p_delta, p_reason, p_contract)
  on conflict (user_id, reason, contract_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.profile_stats set trust_credits = greatest(0, trust_credits + p_delta), updated_at = now()
     where id = p_user;
  end if;
end;
$$;

create or replace function app.on_review_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profile_stats s
     set rating_avg = sub.avg_rating, review_count = sub.n, updated_at = now()
    from (select round(avg(rating)::numeric, 2) as avg_rating, count(*)::int as n
            from public.reviews where reviewee_id = new.reviewee_id) sub
   where s.id = new.reviewee_id;
  if new.rating >= 4 then
    perform app.award_trust_credits(new.reviewee_id, 'positive_review', new.contract_id, 10);
  end if;
  return null;
end;
$$;
create trigger reviews_after_insert after insert on public.reviews
  for each row execute function app.on_review_inserted();

-- Profile sections
create table public.portfolio_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  url text check (url ~ '^https://\S{3,}$' and char_length(url) <= 500),
  image_path text check (char_length(image_path) <= 400),
  contract_id uuid references public.contracts (id),
  created_at timestamptz not null default now()
);
create index portfolio_items_user_idx on public.portfolio_items (user_id, created_at desc);

create table public.education (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  school text not null check (char_length(btrim(school)) between 2 and 160),
  degree text check (char_length(degree) <= 160),
  field text check (char_length(field) <= 160),
  start_year int check (start_year between 1950 and 2100),
  end_year int check (end_year between 1950 and 2100),
  created_at timestamptz not null default now(),
  constraint education_years check (end_year is null or start_year is null or end_year >= start_year)
);

create table public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 160),
  issuer text check (char_length(issuer) <= 160),
  issued_on date,
  credential_url text check (credential_url ~ '^https://\S{3,}$' and char_length(credential_url) <= 500),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- AI outputs (written only by the server; never a fabricated fallback)
-- ---------------------------------------------------------------------------
create table public.ai_risk_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  input_hash text not null check (input_hash ~ '^[0-9a-f]{64}$'),
  model text not null,
  analyzed_fields text[] not null,
  result jsonb not null,
  requested_by uuid references public.profiles (id),
  generated_at timestamptz not null default now(),
  unique (project_id, input_hash)
);

create table public.ai_dispute_recommendations (
  id uuid primary key default gen_random_uuid(),
  dispute_id uuid not null references public.disputes (id) on delete cascade,
  model text not null,
  analyzed_sources text[] not null,
  result jsonb not null,
  requested_by uuid references public.profiles (id),
  generated_at timestamptz not null default now()
);
create index ai_dispute_recommendations_dispute_idx on public.ai_dispute_recommendations (dispute_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------
revoke all on public.arbitrators, public.disputes, public.dispute_evidence, public.dispute_messages, public.dispute_events,
              public.reviews, public.trust_credit_events, public.portfolio_items, public.education,
              public.certifications, public.ai_risk_reports, public.ai_dispute_recommendations
  from anon, authenticated;

grant select on public.arbitrators, public.disputes, public.dispute_evidence, public.dispute_messages,
                public.dispute_events, public.trust_credit_events, public.ai_dispute_recommendations
  to authenticated;
grant insert (dispute_id, submitted_by, kind, title, description, url, storage_path, file_name, size_bytes, mime_type)
  on public.dispute_evidence to authenticated;
grant insert (dispute_id, sender_id, kind, body) on public.dispute_messages to authenticated;
grant select on public.reviews, public.portfolio_items, public.education, public.certifications, public.ai_risk_reports
  to anon, authenticated;
grant insert, update, delete on public.portfolio_items, public.education, public.certifications to authenticated;

alter table public.arbitrators enable row level security;
alter table public.disputes enable row level security;
alter table public.dispute_evidence enable row level security;
alter table public.dispute_messages enable row level security;
alter table public.dispute_events enable row level security;
alter table public.reviews enable row level security;
alter table public.trust_credit_events enable row level security;
alter table public.portfolio_items enable row level security;
alter table public.education enable row level security;
alter table public.certifications enable row level security;
alter table public.ai_risk_reports enable row level security;
alter table public.ai_dispute_recommendations enable row level security;

create policy arbitrators_read on public.arbitrators for select to authenticated
  using (user_id = auth.uid() or app.is_admin()
         or exists (select 1 from public.disputes d where d.arbitrator_id = arbitrators.user_id
                     and app.is_contract_party(d.contract_id)));

create policy disputes_read on public.disputes for select to authenticated using (app.can_view_dispute(id));
create policy dispute_events_read on public.dispute_events for select to authenticated using (app.can_view_dispute(dispute_id));
create policy dispute_evidence_read on public.dispute_evidence for select to authenticated using (app.can_view_dispute(dispute_id));
create policy dispute_evidence_insert on public.dispute_evidence for insert to authenticated
  with check (
    submitted_by = auth.uid() and app.can_view_dispute(dispute_id)
    and exists (select 1 from public.disputes d where d.id = dispute_id and d.status <> 'resolved')
    and (storage_path is null or storage_path like dispute_id::text || '/%')
  );
create policy dispute_messages_read on public.dispute_messages for select to authenticated using (app.can_view_dispute(dispute_id));
create policy dispute_messages_send on public.dispute_messages for insert to authenticated
  with check (
    sender_id = auth.uid() and kind = 'text' and app.can_view_dispute(dispute_id)
    and exists (select 1 from public.disputes d where d.id = dispute_id and d.status <> 'resolved')
  );

create policy reviews_read on public.reviews for select to anon, authenticated using (true);
create policy trust_credit_events_own on public.trust_credit_events for select to authenticated using (user_id = auth.uid());

create policy portfolio_read on public.portfolio_items for select to anon, authenticated using (true);
create policy portfolio_insert on public.portfolio_items for insert to authenticated
  with check (user_id = auth.uid() and contract_id is null);
create policy portfolio_update on public.portfolio_items for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and contract_id is null);
create policy portfolio_delete on public.portfolio_items for delete to authenticated using (user_id = auth.uid());

create policy education_read on public.education for select to anon, authenticated using (true);
create policy education_write on public.education for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy certifications_read on public.certifications for select to anon, authenticated using (true);
create policy certifications_write on public.certifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy ai_risk_reports_read on public.ai_risk_reports for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
create policy ai_dispute_recommendations_read on public.ai_dispute_recommendations for select to authenticated
  using (app.can_view_dispute(dispute_id));

revoke execute on function app.log_dispute_event(uuid, text, jsonb, uuid),
  app.award_trust_credits(uuid, text, uuid, int) from public;
grant execute on function app.can_view_dispute(uuid, uuid) to authenticated, service_role;
