-- ===========================================================================
-- Platform administration console
--
-- The console never reads tables directly. Row-level security deliberately does not give admins
-- blanket read access, so every screen is backed by a `security definer` function that checks
-- app.is_admin() first and returns exactly the columns that screen needs. Every state change goes
-- through a function here and writes a row to admin_audit_log, so the console leaves a trail.
--
-- Added here:
--   1. Member suspension and project moderation (the two states the console can set)
--   2. The audit log and app.audit()
--   3. Read functions (overview, members, projects, contracts, disputes, money, audit, settings)
--   4. Write functions (suspend, grant admin, moderate, settings, holidays)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Moderation state
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column suspended_at timestamptz,
  add column suspended_reason text check (char_length(suspended_reason) <= 500),
  add column suspended_by uuid references public.profiles (id);

create index profiles_suspended_idx on public.profiles (suspended_at) where suspended_at is not null;

-- A suspended member keeps read access to their own account so they can see why and reply, but
-- every write goes through app.require_user(), so refusing here covers the whole product at once.
create or replace function app.require_user()
returns uuid
language plpgsql
stable
as $$
declare
  v_uid uuid := auth.uid();
  v_suspended timestamptz;
begin
  if v_uid is null then
    perform app.fail('not_authenticated', 'Sign in to continue.');
  end if;
  select suspended_at into v_suspended from public.profiles where id = v_uid;
  if v_suspended is not null then
    perform app.fail('account_suspended',
      'Your account is suspended, so you cannot make changes. Contact support if you think this is a mistake.');
  end if;
  return v_uid;
end;
$$;

-- Projects the platform team has hidden or flagged. 'ok' is the normal state.
alter table public.projects
  add column moderation_state text not null default 'ok' check (moderation_state in ('ok', 'flagged', 'removed')),
  add column moderation_reason text check (char_length(moderation_reason) <= 500),
  add column moderated_at timestamptz,
  add column moderated_by uuid references public.profiles (id);

create index projects_moderation_idx on public.projects (moderation_state) where moderation_state <> 'ok';

-- A removed project leaves the marketplace everywhere at once: search, lists and its own page all
-- read through these policies. Its client, the hired freelancer and admins can still open it, so the
-- client can see the reason and nothing disappears from an existing contract's paper trail.
drop policy projects_read_public on public.projects;
drop policy projects_read on public.projects;
create policy projects_read_public on public.projects for select to anon
  using (status <> 'draft' and visibility = 'public' and moderation_state <> 'removed');
create policy projects_read on public.projects for select to authenticated
  using (
    (status <> 'draft' and moderation_state <> 'removed')
    or client_id = auth.uid() or hired_freelancer_id = auth.uid() or app.is_admin()
  );

-- ---------------------------------------------------------------------------
-- 2. The audit log
-- ---------------------------------------------------------------------------
create table public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles (id),
  action text not null check (action ~ '^[a-z_.]{3,60}$'),
  subject_type text not null check (subject_type ~ '^[a-z_]{3,30}$'),
  subject_id text check (char_length(subject_id) <= 100),
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_audit_log_recent_idx on public.admin_audit_log (created_at desc);
create index admin_audit_log_subject_idx on public.admin_audit_log (subject_type, subject_id, created_at desc);
create index admin_audit_log_actor_idx on public.admin_audit_log (actor_id, created_at desc);

-- Append-only: a trail you can edit is not a trail.
create trigger admin_audit_log_immutable before update or delete on public.admin_audit_log
  for each row execute function app.forbid_mutation();

-- Row-level security with no policy would already return nothing, but taking the grant away as well
-- turns a silent empty result into a plain "permission denied" if anything ever queries it directly.
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from public, anon, authenticated;

create or replace function app.audit(p_action text, p_subject_type text, p_subject_id text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.admin_audit_log (actor_id, action, subject_type, subject_id, detail)
  values (auth.uid(), p_action, p_subject_type, p_subject_id, coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- Guard every function below. Returns the admin's id.
create or replace function app.require_admin()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform app.fail('not_authenticated', 'Sign in to continue.');
  end if;
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Admins only.');
  end if;
  return v_uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Reading: the console's screens
-- ---------------------------------------------------------------------------

-- The overview: counts and money in one round trip, plus the sizes of the action queues.
create or replace function public.admin_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'members', (
      select jsonb_build_object(
        'total', count(*),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'new_30d', count(*) filter (where created_at > now() - interval '30 days'),
        'onboarded', count(*) filter (where onboarding_completed_at is not null),
        'suspended', count(*) filter (where suspended_at is not null),
        'hiring', count(*) filter (where intent in ('hire', 'both')),
        'working', count(*) filter (where intent in ('work', 'both'))
      ) from public.profiles
    ),
    'projects', (
      select jsonb_build_object(
        'total', count(*),
        'open', count(*) filter (where status = 'open'),
        'draft', count(*) filter (where status = 'draft'),
        'in_contract', count(*) filter (where status = 'in_contract'),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'flagged', count(*) filter (where moderation_state = 'flagged'),
        'removed', count(*) filter (where moderation_state = 'removed'),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days')
      ) from public.projects
    ),
    'proposals', (
      select jsonb_build_object(
        'total', count(*),
        'pending', count(*) filter (where status = 'pending'),
        'accepted', count(*) filter (where status = 'accepted')
      ) from public.proposals
    ),
    'contracts', (
      select jsonb_build_object(
        'total', count(*),
        'pending_signatures', count(*) filter (where status = 'pending_signatures'),
        'awaiting_funding', count(*) filter (where status = 'awaiting_funding'),
        'active', count(*) filter (where status = 'active'),
        'disputed', count(*) filter (where status = 'disputed'),
        'completed', count(*) filter (where status = 'completed'),
        'cancelled', count(*) filter (where status = 'cancelled'),
        'new_7d', count(*) filter (where created_at > now() - interval '7 days'),
        'value', coalesce(sum(total_amount), 0)::text
      ) from public.contracts
    ),
    'disputes', (
      select jsonb_build_object(
        'total', count(*),
        'open', count(*) filter (where status = 'open'),
        'awaiting_evidence', count(*) filter (where status = 'awaiting_evidence'),
        'under_review', count(*) filter (where status = 'under_review'),
        'escalated', count(*) filter (where status = 'escalated'),
        'resolved', count(*) filter (where status = 'resolved'),
        'unsettled', count(*) filter (where status = 'resolved' and settlement_status = 'pending')
      ) from public.disputes
    ),
    'money', (
      select jsonb_build_object(
        'escrow', coalesce(sum(balance) filter (where kind = 'escrow'), 0),
        'wallets', coalesce(sum(balance) filter (where kind = 'wallet'), 0),
        'pending', coalesce(sum(balance) filter (where kind = 'pending'), 0),
        'earnings', coalesce(sum(balance) filter (where kind = 'earnings'), 0),
        'fees', coalesce(sum(balance) filter (where kind = 'platform_fees'), 0),
        'in_transit', coalesce(sum(balance) filter (where kind = 'payouts_in_transit'), 0),
        'issued', coalesce(-sum(balance) filter (where kind = 'gateway'), 0)
      ) from public.coin_accounts
    ),
    'queues', jsonb_build_object(
      'attention', (select count(*) from public.disputes
                     where (status = 'open' and arbitrator_id is null) or status = 'escalated'),
      'withdrawals', (select count(*) from public.withdrawals where status = 'requested'),
      'withdrawals_coins', (select coalesce(sum(coins), 0) from public.withdrawals where status = 'requested'),
      'bank_accounts', (select count(*) from public.payout_accounts where status = 'pending'),
      'applications', (select count(*) from public.arbitrators where status = 'pending'),
      'flagged_projects', (select count(*) from public.projects where moderation_state = 'flagged')
    ),
    'arbitrators', (
      select jsonb_build_object(
        'approved', count(*) filter (where status = 'approved'),
        'available', count(*) filter (where status = 'approved' and is_available),
        'pending', count(*) filter (where status = 'pending'),
        'suspended', count(*) filter (where status = 'suspended')
      ) from public.arbitrators
    ),
    'generated_at', now()
  ) into v_result;
  return v_result;
end;
$$;

-- One row per day for the console's charts. Days with nothing still appear, so the line has no gaps.
create or replace function public.admin_timeseries(p_days int default 30)
returns table (day date, signups bigint, projects bigint, contracts bigint, funded bigint,
               funded_coins bigint, fees_coins bigint, disputes bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days int := least(greatest(coalesce(p_days, 30), 1), 365);
begin
  perform app.require_admin();
  return query
    with days as (
      select generate_series(current_date - (v_days - 1), current_date, interval '1 day')::date as day
    )
    select d.day,
      (select count(*) from public.profiles x where x.created_at::date = d.day),
      (select count(*) from public.projects x where x.published_at::date = d.day),
      (select count(*) from public.contracts x where x.created_at::date = d.day),
      (select count(*) from public.contracts x where x.funded_at::date = d.day),
      (select coalesce(sum(x.total_amount), 0)::bigint from public.contracts x where x.funded_at::date = d.day),
      (select coalesce(sum(e.amount), 0)::bigint
         from public.coin_entries e join public.coin_accounts a on a.id = e.account_id
        where a.kind = 'platform_fees' and e.created_at::date = d.day),
      (select count(*) from public.disputes x where x.created_at::date = d.day)
      from days d
     order by d.day;
end;
$$;

-- Members, searchable and filterable. total_count rides along so the console can page without a
-- second round trip.
create or replace function public.admin_member_list(
  p_query text default null,
  p_filter text default 'all',
  p_sort text default 'recent',
  p_limit int default 25,
  p_offset int default 0
)
returns table (id uuid, username text, display_name text, headline text, avatar_path text, intent text,
               created_at timestamptz, onboarded boolean, suspended_at timestamptz, suspended_reason text,
               is_admin boolean, arbitrator_status text, email_verified boolean, identity_verified boolean,
               rating_avg numeric, review_count int, contracts bigint, open_disputes bigint,
               wallet bigint, pending bigint, earnings bigint, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
  v_filter text := coalesce(nullif(btrim(coalesce(p_filter, '')), ''), 'all');
begin
  perform app.require_admin();
  return query
    with matched as (
      select p.*
        from public.profiles p
       where (v_q is null
              or p.username ilike '%' || v_q || '%'
              or p.display_name ilike '%' || v_q || '%'
              or p.id::text = v_q)
         and case v_filter
               when 'suspended' then p.suspended_at is not null
               when 'admins' then app.is_admin(p.id)
               when 'arbitrators' then exists (select 1 from public.arbitrators a
                                                where a.user_id = p.id and a.status = 'approved')
               when 'unonboarded' then p.onboarding_completed_at is null
               when 'new' then p.created_at > now() - interval '7 days'
               else true
             end
    ), counted as (select count(*) as n from matched)
    select m.id, m.username, m.display_name, m.headline, m.avatar_path, m.intent, m.created_at,
           m.onboarding_completed_at is not null,
           m.suspended_at, m.suspended_reason,
           app.is_admin(m.id),
           (select a.status from public.arbitrators a where a.user_id = m.id),
           coalesce(s.email_verified, false), coalesce(s.identity_verified, false),
           s.rating_avg, coalesce(s.review_count, 0),
           (select count(*) from public.contracts c where c.client_id = m.id or c.freelancer_id = m.id),
           (select count(*) from public.disputes d
              join public.contracts c on c.id = d.contract_id
             where (c.client_id = m.id or c.freelancer_id = m.id) and d.status <> 'resolved'),
           coalesce((select ca.balance from public.coin_accounts ca where ca.user_id = m.id and ca.kind = 'wallet'), 0),
           coalesce((select ca.balance from public.coin_accounts ca where ca.user_id = m.id and ca.kind = 'pending'), 0),
           coalesce((select ca.balance from public.coin_accounts ca where ca.user_id = m.id and ca.kind = 'earnings'), 0),
           counted.n
      from matched m
      cross join counted
      left join public.profile_stats s on s.id = m.id
     order by
       case when v_filter = 'suspended' then m.suspended_at end desc nulls last,
       case when p_sort = 'name' then m.display_name end asc,
       case when p_sort = 'oldest' then m.created_at end asc,
       m.created_at desc
     limit v_limit offset v_offset;
end;
$$;

-- Everything the console shows about one member, including the private facts an admin may need
-- for a payout or abuse review.
create or replace function public.admin_member_detail(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'profile', to_jsonb(p) - 'suspended_by',
    'is_admin', app.is_admin(p.id),
    'admin_note', (select a.note from public.platform_admins a where a.user_id = p.id),
    'email', (select u.email from auth.users u where u.id = p.id),
    'email_confirmed_at', (select u.email_confirmed_at from auth.users u where u.id = p.id),
    'last_sign_in_at', (select u.last_sign_in_at from auth.users u where u.id = p.id),
    'phone', (select v.phone from public.profile_private v where v.id = p.id),
    'stats', (select to_jsonb(s) from public.profile_stats s where s.id = p.id),
    'suspended_by_name', (select q.display_name from public.profiles q where q.id = p.suspended_by),
    'arbitrator', (select to_jsonb(a) from public.arbitrators a where a.user_id = p.id),
    'balances', coalesce((select jsonb_object_agg(ca.kind, ca.balance)
                            from public.coin_accounts ca where ca.user_id = p.id), '{}'::jsonb),
    'holds', coalesce((select sum(h.coins) from public.coin_holds h
                        where h.user_id = p.id and h.released_at is null), 0),
    'payout_account', (select to_jsonb(a) - 'account_number' - 'pan' from public.payout_accounts a where a.user_id = p.id),
    'projects', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'title', x.title, 'status', x.status, 'moderation_state', x.moderation_state,
        'budget_amount', x.budget_amount, 'proposal_count', x.proposal_count, 'created_at', x.created_at)
        order by x.created_at desc)
      from (select * from public.projects where client_id = p.id order by created_at desc limit 20) x), '[]'::jsonb),
    'contracts', coalesce((select jsonb_agg(jsonb_build_object(
        'id', x.id, 'title', x.title, 'status', x.status, 'total_amount', x.total_amount,
        'role', case when x.client_id = p.id then 'client' else 'freelancer' end,
        'counterparty', (select q.display_name from public.profiles q
                          where q.id = case when x.client_id = p.id then x.freelancer_id else x.client_id end),
        'created_at', x.created_at)
        order by x.created_at desc)
      from (select * from public.contracts where client_id = p.id or freelancer_id = p.id
             order by created_at desc limit 20) x), '[]'::jsonb),
    'disputes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'number', d.number, 'status', d.status, 'amount', d.amount,
        'raised_by_them', d.raised_by = p.id, 'created_at', d.created_at)
        order by d.created_at desc)
      from public.disputes d join public.contracts c on c.id = d.contract_id
     where c.client_id = p.id or c.freelancer_id = p.id), '[]'::jsonb),
    'withdrawals', coalesce((select jsonb_agg(jsonb_build_object(
        'id', w.id, 'number', w.number, 'coins', w.coins, 'amount_paise', w.amount_paise,
        'status', w.status, 'reference', w.reference, 'requested_at', w.requested_at)
        order by w.requested_at desc)
      from public.withdrawals w where w.user_id = p.id), '[]'::jsonb),
    'purchases', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c2.id, 'coins', c2.coins, 'amount_paise', c2.amount_paise, 'provider', c2.provider,
        'status', c2.status, 'created_at', c2.created_at)
        order by c2.created_at desc)
      from (select * from public.coin_purchases where user_id = p.id order by created_at desc limit 20) c2), '[]'::jsonb),
    'audit', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'action', l.action, 'detail', l.detail, 'created_at', l.created_at,
        'actor', (select q.display_name from public.profiles q where q.id = l.actor_id))
        order by l.created_at desc)
      from (select * from public.admin_audit_log where subject_type = 'member' and subject_id = p.id::text
             order by created_at desc limit 25) l), '[]'::jsonb)
  ) into v_result
  from public.profiles p
  where p.id = p_user;
  if v_result is null then
    perform app.fail('not_found', 'No member with that id.');
  end if;
  return v_result;
end;
$$;

-- Projects for moderation, newest first.
create or replace function public.admin_project_list(
  p_query text default null,
  p_status text default 'all',
  p_moderation text default 'all',
  p_limit int default 25,
  p_offset int default 0
)
returns table (id uuid, title text, status text, moderation_state text, moderation_reason text,
               category text, budget_amount numeric, proposal_count int, visibility text,
               created_at timestamptz, published_at timestamptz,
               client_id uuid, client_name text, client_username text, client_suspended boolean,
               total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
begin
  perform app.require_admin();
  return query
    with matched as (
      select x.* from public.projects x
       where (v_q is null or x.title ilike '%' || v_q || '%' or x.description ilike '%' || v_q || '%')
         and (coalesce(p_status, 'all') = 'all' or x.status = p_status)
         and (coalesce(p_moderation, 'all') = 'all' or x.moderation_state = p_moderation)
    ), counted as (select count(*) as n from matched)
    select m.id, m.title, m.status, m.moderation_state, m.moderation_reason, m.category, m.budget_amount,
           m.proposal_count, m.visibility, m.created_at, m.published_at,
           m.client_id, c.display_name, c.username, c.suspended_at is not null, counted.n
      from matched m
      cross join counted
      join public.profiles c on c.id = m.client_id
     order by m.created_at desc
     limit v_limit offset v_offset;
end;
$$;

-- Contracts, with how much of each is still locked in escrow.
create or replace function public.admin_contract_list(
  p_query text default null,
  p_status text default 'all',
  p_limit int default 25,
  p_offset int default 0
)
returns table (id uuid, title text, status text, total_amount numeric, fee_bps int,
               client_id uuid, client_name text, client_username text,
               freelancer_id uuid, freelancer_name text, freelancer_username text,
               milestones bigint, paid_milestones bigint, escrow bigint, open_disputes bigint,
               created_at timestamptz, funded_at timestamptz, completed_at timestamptz, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
  v_q text := nullif(btrim(coalesce(p_query, '')), '');
begin
  perform app.require_admin();
  return query
    with matched as (
      select x.* from public.contracts x
       where (v_q is null or x.title ilike '%' || v_q || '%' or x.id::text = v_q)
         and (coalesce(p_status, 'all') = 'all' or x.status = p_status)
    ), counted as (select count(*) as n from matched)
    select m.id, m.title, m.status, m.total_amount, m.fee_bps,
           m.client_id, cl.display_name, cl.username,
           m.freelancer_id, fr.display_name, fr.username,
           (select count(*) from public.milestones ms where ms.contract_id = m.id),
           (select count(*) from public.milestones ms where ms.contract_id = m.id and ms.status = 'paid'),
           coalesce((select ca.balance from public.coin_accounts ca where ca.contract_id = m.id), 0),
           (select count(*) from public.disputes d where d.contract_id = m.id and d.status <> 'resolved'),
           m.created_at, m.funded_at, m.completed_at, counted.n
      from matched m
      cross join counted
      join public.profiles cl on cl.id = m.client_id
      join public.profiles fr on fr.id = m.freelancer_id
     order by m.created_at desc
     limit v_limit offset v_offset;
end;
$$;

-- One contract in full: milestones, escrow movements, events and disputes.
create or replace function public.admin_contract_detail(p_contract uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'contract', to_jsonb(c),
    'client', (select jsonb_build_object('id', q.id, 'display_name', q.display_name, 'username', q.username,
                                         'suspended', q.suspended_at is not null)
                 from public.profiles q where q.id = c.client_id),
    'freelancer', (select jsonb_build_object('id', q.id, 'display_name', q.display_name, 'username', q.username,
                                             'suspended', q.suspended_at is not null)
                     from public.profiles q where q.id = c.freelancer_id),
    'escrow_balance', coalesce((select ca.balance from public.coin_accounts ca where ca.contract_id = c.id), 0),
    'milestones', coalesce((select jsonb_agg(to_jsonb(m) order by m.position)
                              from public.milestones m where m.contract_id = c.id), '[]'::jsonb),
    'disputes', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'number', d.number, 'status', d.status, 'amount', d.amount,
        'milestone_id', d.milestone_id, 'arbitrator_id', d.arbitrator_id,
        'settlement_status', d.settlement_status, 'created_at', d.created_at) order by d.created_at desc)
      from public.disputes d where d.contract_id = c.id), '[]'::jsonb),
    'events', coalesce((select jsonb_agg(jsonb_build_object(
        'id', e.id, 'type', e.type, 'data', e.data, 'created_at', e.created_at,
        'actor', (select q.display_name from public.profiles q where q.id = e.actor_id)) order by e.id desc)
      from (select * from public.contract_events where contract_id = c.id order by id desc limit 100) e), '[]'::jsonb),
    'ledger', coalesce((select jsonb_agg(jsonb_build_object(
        'entry_id', en.id, 'amount', en.amount, 'balance_after', en.balance_after,
        'kind', t.kind, 'memo', t.memo, 'milestone_id', t.milestone_id, 'created_at', en.created_at)
        order by en.id desc)
      from public.coin_entries en
      join public.coin_accounts ca on ca.id = en.account_id
      join public.coin_transactions t on t.id = en.transaction_id
     where ca.contract_id = c.id), '[]'::jsonb)
  ) into v_result
  from public.contracts c
  where c.id = p_contract;
  if v_result is null then
    perform app.fail('not_found', 'No contract with that id.');
  end if;
  return v_result;
end;
$$;

-- Disputes across the platform, with the two parties and the arbitrator resolved to names.
create or replace function public.admin_dispute_list(
  p_status text default 'all',
  p_limit int default 25,
  p_offset int default 0
)
returns table (id uuid, number bigint, status text, reason text, amount numeric,
               settlement_status text, escalation_reason text,
               contract_id uuid, contract_title text, milestone_position int,
               client_name text, freelancer_name text,
               arbitrator_id uuid, arbitrator_name text,
               decision text, freelancer_pct int,
               created_at timestamptz, decided_at timestamptz, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 25), 1), 100);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  perform app.require_admin();
  return query
    with matched as (
      select d.* from public.disputes d
       where case coalesce(p_status, 'all')
               when 'all' then true
               when 'attention' then (d.status = 'open' and d.arbitrator_id is null) or d.status = 'escalated'
               when 'live' then d.status <> 'resolved'
               else d.status = p_status
             end
    ), counted as (select count(*) as n from matched)
    select m.id, m.number, m.status, m.reason, m.amount, m.settlement_status, m.escalation_reason,
           m.contract_id, c.title,
           (select ms.position from public.milestones ms where ms.id = m.milestone_id),
           cl.display_name, fr.display_name,
           m.arbitrator_id, (select q.display_name from public.profiles q where q.id = m.arbitrator_id),
           m.decision, m.freelancer_pct, m.created_at, m.decided_at, counted.n
      from matched m
      cross join counted
      join public.contracts c on c.id = m.contract_id
      join public.profiles cl on cl.id = c.client_id
      join public.profiles fr on fr.id = c.freelancer_id
     order by m.created_at desc
     limit v_limit offset v_offset;
end;
$$;

-- Money: where every coin sits, and whether the books agree.
--
-- The ledger is double entry, so two things must hold. Each account's stored balance must equal the
-- sum of its entries, and every account balance added together must come to zero (the gateway
-- account is negative by exactly the number of coins ever issued). Either one failing is a bug worth
-- seeing on screen rather than discovering in a support ticket.
create or replace function public.admin_finance()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'accounts', (
      select coalesce(jsonb_agg(jsonb_build_object('kind', k.kind, 'balance', k.balance, 'accounts', k.n)
                                order by k.kind), '[]'::jsonb)
        from (select kind, sum(balance)::bigint as balance, count(*) as n
                from public.coin_accounts group by kind) k
    ),
    'issued', coalesce((select -sum(balance) from public.coin_accounts where kind = 'gateway'), 0),
    'purchases', (
      select jsonb_build_object(
        'paid', count(*) filter (where status = 'paid'),
        'paid_coins', coalesce(sum(coins) filter (where status = 'paid'), 0),
        'paid_paise', coalesce(sum(amount_paise) filter (where status = 'paid'), 0),
        'created', count(*) filter (where status = 'created'),
        'failed', count(*) filter (where status = 'failed'),
        'paid_7d', coalesce(sum(coins) filter (where status = 'paid' and paid_at > now() - interval '7 days'), 0)
      ) from public.coin_purchases
    ),
    'withdrawals', (
      select jsonb_build_object(
        'requested', count(*) filter (where status = 'requested'),
        'requested_coins', coalesce(sum(coins) filter (where status = 'requested'), 0),
        'paid', count(*) filter (where status = 'paid'),
        'paid_coins', coalesce(sum(coins) filter (where status = 'paid'), 0),
        'paid_paise', coalesce(sum(amount_paise) filter (where status = 'paid'), 0),
        'failed', count(*) filter (where status = 'failed'),
        'cancelled', count(*) filter (where status = 'cancelled')
      ) from public.withdrawals
    ),
    'fees', (
      select jsonb_build_object(
        'total', coalesce(sum(e.amount), 0),
        'last_30d', coalesce(sum(e.amount) filter (where e.created_at > now() - interval '30 days'), 0)
      ) from public.coin_entries e
        join public.coin_accounts a on a.id = e.account_id
       where a.kind = 'platform_fees'
    ),
    'holds', (
      select jsonb_build_object(
        'coins', coalesce(sum(coins), 0),
        'count', count(*),
        'due_today', coalesce(sum(coins) filter (where available_on <= current_date), 0)
      ) from public.coin_holds where released_at is null
    ),
    'reconciliation', jsonb_build_object(
      'sum_of_balances', (select coalesce(sum(balance), 0) from public.coin_accounts),
      'drifted_accounts', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'account_id', d.id, 'kind', d.kind, 'user_id', d.user_id, 'contract_id', d.contract_id,
                 'balance', d.balance, 'entry_sum', d.entry_sum)), '[]'::jsonb)
          from (select a.id, a.kind, a.user_id, a.contract_id, a.balance,
                       coalesce((select sum(e.amount) from public.coin_entries e where e.account_id = a.id), 0) as entry_sum
                  from public.coin_accounts a) d
         where d.balance <> d.entry_sum
      ),
      'transactions', (select count(*) from public.coin_transactions),
      'entries', (select count(*) from public.coin_entries)
    ),
    'settings', coalesce((select jsonb_object_agg(key, value) from public.platform_settings), '{}'::jsonb),
    'generated_at', now()
  ) into v_result;
  return v_result;
end;
$$;

-- The platform-wide coin ledger, newest first. Optionally narrowed to one member or one kind.
create or replace function public.admin_coin_ledger(
  p_kind text default 'all',
  p_user uuid default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (entry_id bigint, created_at timestamptz, kind text, memo text, amount bigint,
               balance_after bigint, account_kind text, account_user uuid, account_user_name text,
               contract_id uuid, milestone_id uuid, actor_name text, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  perform app.require_admin();
  return query
    with matched as (
      select e.id, e.created_at, e.amount, e.balance_after, e.account_id, e.transaction_id
        from public.coin_entries e
        join public.coin_accounts a on a.id = e.account_id
        join public.coin_transactions t on t.id = e.transaction_id
       where (coalesce(p_kind, 'all') = 'all' or t.kind = p_kind)
         and (p_user is null or a.user_id = p_user)
    ), counted as (select count(*) as n from matched)
    select m.id, m.created_at, t.kind, t.memo, m.amount, m.balance_after,
           a.kind, a.user_id, (select q.display_name from public.profiles q where q.id = a.user_id),
           t.contract_id, t.milestone_id,
           (select q.display_name from public.profiles q where q.id = t.actor_id),
           counted.n
      from matched m
      cross join counted
      join public.coin_accounts a on a.id = m.account_id
      join public.coin_transactions t on t.id = m.transaction_id
     order by m.id desc
     limit v_limit offset v_offset;
end;
$$;

-- The arbitrator roster with each one's current case load.
create or replace function public.admin_arbitrator_list(p_status text default 'all')
returns table (user_id uuid, display_name text, username text, avatar_path text, status text,
               specializations text[], statement text, capacity int, is_available boolean,
               applied_at timestamptz, reviewed_at timestamptz, review_note text,
               live_cases bigint, decided_cases bigint, completed_contracts int, disputes_lost int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  return query
    select a.user_id, p.display_name, p.username, p.avatar_path, a.status, a.specializations, a.statement,
           a.capacity, a.is_available, a.applied_at, a.reviewed_at, a.review_note,
           (select count(*) from public.disputes d where d.arbitrator_id = a.user_id and d.status <> 'resolved'),
           (select count(*) from public.disputes d where d.decided_by = a.user_id),
           coalesce(s.completed_as_client, 0) + coalesce(s.completed_as_freelancer, 0),
           coalesce(s.disputes_lost, 0)
      from public.arbitrators a
      join public.profiles p on p.id = a.user_id
      left join public.profile_stats s on s.id = a.user_id
     where coalesce(p_status, 'all') = 'all' or a.status = p_status
     order by case a.status when 'pending' then 0 when 'approved' then 1 else 2 end, a.applied_at;
end;
$$;

-- The audit trail.
create or replace function public.admin_audit_list(
  p_action text default null,
  p_subject_type text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns table (id bigint, actor_id uuid, actor_name text, actor_username text, action text,
               subject_type text, subject_id text, detail jsonb, created_at timestamptz, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit int := least(greatest(coalesce(p_limit, 50), 1), 200);
  v_offset int := greatest(coalesce(p_offset, 0), 0);
begin
  perform app.require_admin();
  return query
    with matched as (
      select l.* from public.admin_audit_log l
       where (nullif(btrim(coalesce(p_action, '')), '') is null or l.action = p_action)
         and (nullif(btrim(coalesce(p_subject_type, '')), '') is null or l.subject_type = p_subject_type)
    ), counted as (select count(*) as n from matched)
    select m.id, m.actor_id, p.display_name, p.username, m.action, m.subject_type, m.subject_id,
           m.detail, m.created_at, counted.n
      from matched m
      cross join counted
      join public.profiles p on p.id = m.actor_id
     order by m.id desc
     limit v_limit offset v_offset;
end;
$$;

-- Settings, working-day holidays and the admin roster: the three things the settings screen edits.
create or replace function public.admin_configuration()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  perform app.require_admin();
  select jsonb_build_object(
    'settings', coalesce((select jsonb_agg(jsonb_build_object('key', s.key, 'value', s.value, 'description', s.description)
                                           order by s.key) from public.platform_settings s), '[]'::jsonb),
    'holidays', coalesce((select jsonb_agg(jsonb_build_object('day', h.day, 'label', h.label) order by h.day)
                            from public.holidays h where h.day >= current_date - interval '1 year'), '[]'::jsonb),
    'admins', coalesce((select jsonb_agg(jsonb_build_object(
                          'user_id', a.user_id, 'display_name', p.display_name, 'username', p.username,
                          'avatar_path', p.avatar_path, 'note', a.note, 'granted_at', a.granted_at,
                          'email', (select u.email from auth.users u where u.id = a.user_id))
                          order by a.granted_at)
                          from public.platform_admins a join public.profiles p on p.id = a.user_id), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('slug', c.slug, 'label', c.label) order by c.label)
                              from public.categories c), '[]'::jsonb)
  ) into v_result;
  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Writing: every change an admin can make
-- ---------------------------------------------------------------------------

-- Suspend or reinstate a member. A suspended member can still sign in and read their account, but
-- app.require_user() refuses every write, so they cannot post, propose, sign, fund or withdraw.
-- Another admin cannot be suspended: remove their admin role first, so the step is deliberate.
create or replace function public.admin_set_member_suspended(p_user uuid, p_suspend boolean, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_admin();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_name text;
begin
  if p_user = v_uid then
    perform app.fail('forbidden', 'You cannot suspend your own account.');
  end if;
  select display_name into v_name from public.profiles where id = p_user;
  if v_name is null then
    perform app.fail('not_found', 'No member with that id.');
  end if;
  if p_suspend and app.is_admin(p_user) then
    perform app.fail('forbidden', 'Remove this member''s admin role before suspending them.');
  end if;
  if p_suspend and char_length(coalesce(v_reason, '')) < 10 then
    perform app.fail('validation', 'Give a reason of at least 10 characters. The member sees it.');
  end if;

  update public.profiles
     set suspended_at = case when p_suspend then now() end,
         suspended_reason = case when p_suspend then v_reason end,
         suspended_by = case when p_suspend then v_uid end
   where id = p_user
     and (suspended_at is null) = p_suspend;
  if not found then
    perform app.fail('invalid_state', case when p_suspend then 'That member is already suspended.'
                                           else 'That member is not suspended.' end);
  end if;

  perform app.notify(p_user, 'security',
    case when p_suspend then 'account.suspended' else 'account.reinstated' end,
    case when p_suspend then 'Your account has been suspended' else 'Your account has been reinstated' end,
    case when p_suspend then v_reason else 'You can use TrustLance normally again.' end,
    '/settings/account', case when p_suspend then 'critical' else 'success' end, null);
  perform app.audit(case when p_suspend then 'member.suspended' else 'member.reinstated' end,
                    'member', p_user::text, jsonb_build_object('reason', v_reason, 'name', v_name));
end;
$$;

-- Grant or revoke the admin role. The platform must never be left without an admin, and nobody can
-- grant it to themselves (they already have it) or revoke their own — that needs a second admin.
create or replace function public.admin_set_admin_role(p_user uuid, p_grant boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_admin();
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
  v_name text;
begin
  select display_name into v_name from public.profiles where id = p_user;
  if v_name is null then
    perform app.fail('not_found', 'No member with that id.');
  end if;
  if p_user = v_uid then
    perform app.fail('forbidden', 'You cannot change your own admin role. Ask another admin.');
  end if;

  if p_grant then
    if (select suspended_at from public.profiles where id = p_user) is not null then
      perform app.fail('invalid_state', 'Reinstate this member before making them an admin.');
    end if;
    insert into public.platform_admins (user_id, note) values (p_user, v_note)
    on conflict (user_id) do nothing;
    if not found then
      perform app.fail('invalid_state', 'That member is already an admin.');
    end if;
    perform app.notify(p_user, 'security', 'admin.granted', 'You are now a platform admin',
                       'You can open the platform console from your account menu.', '/admin', 'warning', null);
  else
    if (select count(*) from public.platform_admins) <= 1 then
      perform app.fail('invalid_state', 'This is the last admin. Add another admin before removing this one.');
    end if;
    delete from public.platform_admins where user_id = p_user;
    if not found then
      perform app.fail('invalid_state', 'That member is not an admin.');
    end if;
    perform app.notify(p_user, 'security', 'admin.revoked', 'Your admin role was removed',
                       'You no longer have access to the platform console.', '/dashboard', 'warning', null);
  end if;
  perform app.audit(case when p_grant then 'admin.granted' else 'admin.revoked' end,
                    'member', p_user::text, jsonb_build_object('note', v_note, 'name', v_name));
end;
$$;

-- Flag a project for a second look, hide it from the marketplace, or clear both.
-- Removing a project does not touch a contract that came from it: money already in escrow is
-- governed by the contract, not the listing.
create or replace function public.admin_moderate_project(p_project uuid, p_state text, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_admin();
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_project public.projects;
begin
  if p_state not in ('ok', 'flagged', 'removed') then
    perform app.fail('validation', 'Choose a moderation state.');
  end if;
  select * into v_project from public.projects where id = p_project;
  if not found then
    perform app.fail('not_found', 'No project with that id.');
  end if;
  if p_state <> 'ok' and char_length(coalesce(v_reason, '')) < 10 then
    perform app.fail('validation', 'Give a reason of at least 10 characters. The client sees it.');
  end if;
  if v_project.moderation_state = p_state then
    perform app.fail('invalid_state', 'That project is already in that state.');
  end if;

  update public.projects
     set moderation_state = p_state,
         moderation_reason = case when p_state = 'ok' then null else v_reason end,
         moderated_at = case when p_state = 'ok' then null else now() end,
         moderated_by = case when p_state = 'ok' then null else v_uid end
   where id = p_project;

  if p_state = 'removed' then
    perform app.notify(v_project.client_id, 'projects', 'project.removed', 'Your project was removed',
                       v_reason, '/projects/' || p_project, 'critical', p_project);
  elsif p_state = 'flagged' then
    perform app.notify(v_project.client_id, 'projects', 'project.flagged', 'Your project needs changes',
                       v_reason, '/projects/' || p_project || '/edit', 'warning', p_project);
  else
    perform app.notify(v_project.client_id, 'projects', 'project.restored', 'Your project is live again',
                       'The platform team cleared the earlier note.', '/projects/' || p_project, 'success', p_project);
  end if;
  perform app.audit('project.moderated', 'project', p_project::text,
                    jsonb_build_object('from', v_project.moderation_state, 'to', p_state,
                                       'reason', v_reason, 'title', v_project.title));
end;
$$;

-- Change one platform setting. Bounds are checked here because these numbers decide fees, holds and
-- limits for everyone; a typo of one zero is the difference between a 10% fee and a 100% one.
create or replace function public.admin_update_setting(p_key text, p_value numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_admin();
  v_old numeric;
  v_min numeric;
  v_max numeric;
begin
  select value into v_old from public.platform_settings where key = p_key;
  if v_old is null then
    perform app.fail('not_found', 'There is no setting with that name.');
  end if;
  if p_value is null then
    perform app.fail('validation', 'Enter a value.');
  end if;

  case p_key
    when 'fee_bps' then v_min := 0; v_max := 3000;
    when 'hold_working_days' then v_min := 0; v_max := 30;
    when 'auto_release_days' then v_min := 1; v_max := 60;
    when 'min_milestone_coins' then v_min := 1; v_max := 100000;
    when 'min_purchase_coins' then v_min := 1; v_max := 100000;
    when 'max_purchase_coins' then v_min := 1000; v_max := 100000000;
    when 'min_withdrawal_coins' then v_min := 1; v_max := 1000000;
    when 'paise_per_coin' then v_min := 1; v_max := 100000;
    else v_min := 0; v_max := 100000000;
  end case;

  if p_value < v_min or p_value > v_max then
    perform app.fail('validation', format('%s must be between %s and %s.', p_key, v_min, v_max));
  end if;
  -- Every setting is a count, a day or a basis point, so fractions are always a mistake.
  if p_value <> trunc(p_value) then
    perform app.fail('validation', 'Enter a whole number.');
  end if;
  if p_key = 'min_purchase_coins' and p_value > app.setting('max_purchase_coins') then
    perform app.fail('validation', 'The smallest purchase cannot be larger than the largest purchase.');
  end if;
  if p_key = 'max_purchase_coins' and p_value < app.setting('min_purchase_coins') then
    perform app.fail('validation', 'The largest purchase cannot be smaller than the smallest purchase.');
  end if;
  if v_old = p_value then
    perform app.fail('invalid_state', 'That is already the value.');
  end if;

  update public.platform_settings set value = p_value where key = p_key;
  perform app.audit('setting.changed', 'setting', p_key,
                    jsonb_build_object('from', v_old, 'to', p_value));
end;
$$;

-- Working-day holidays. These move every payment hold, so each change is audited.
create or replace function public.admin_set_holiday(p_day date, p_label text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_label text := btrim(coalesce(p_label, ''));
begin
  perform app.require_admin();
  if p_day is null then
    perform app.fail('validation', 'Choose a date.');
  end if;
  if char_length(v_label) not between 2 and 80 then
    perform app.fail('validation', 'Name the holiday (2 to 80 characters).');
  end if;
  insert into public.holidays (day, label) values (p_day, v_label)
  on conflict (day) do update set label = excluded.label;
  perform app.audit('holiday.set', 'holiday', p_day::text, jsonb_build_object('label', v_label));
end;
$$;

create or replace function public.admin_remove_holiday(p_day date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_admin();
  delete from public.holidays where day = p_day;
  if not found then
    perform app.fail('not_found', 'There is no holiday on that date.');
  end if;
  perform app.audit('holiday.removed', 'holiday', p_day::text, '{}'::jsonb);
end;
$$;

-- Recorded when an admin unseals the console (see src/lib/admin/gate.ts). Writing it through a
-- function keeps the audit log append-only and owned by the database.
create or replace function public.admin_record_entry(p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_admin();
begin
  perform app.audit('console.unsealed', 'console', v_uid::text, coalesce(p_detail, '{}'::jsonb));
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Permissions
-- ---------------------------------------------------------------------------
revoke execute on function app.audit(text, text, text, jsonb), app.require_admin() from public;
grant execute on function app.require_admin() to authenticated, service_role;

revoke execute on function
  public.admin_overview(), public.admin_timeseries(int),
  public.admin_member_list(text, text, text, int, int), public.admin_member_detail(uuid),
  public.admin_project_list(text, text, text, int, int),
  public.admin_contract_list(text, text, int, int), public.admin_contract_detail(uuid),
  public.admin_dispute_list(text, int, int), public.admin_finance(),
  public.admin_coin_ledger(text, uuid, int, int), public.admin_arbitrator_list(text),
  public.admin_audit_list(text, text, int, int), public.admin_configuration(),
  public.admin_set_member_suspended(uuid, boolean, text), public.admin_set_admin_role(uuid, boolean, text),
  public.admin_moderate_project(uuid, text, text), public.admin_update_setting(text, numeric),
  public.admin_set_holiday(date, text), public.admin_remove_holiday(date), public.admin_record_entry(jsonb)
  from public, anon;

grant execute on function
  public.admin_overview(), public.admin_timeseries(int),
  public.admin_member_list(text, text, text, int, int), public.admin_member_detail(uuid),
  public.admin_project_list(text, text, text, int, int),
  public.admin_contract_list(text, text, int, int), public.admin_contract_detail(uuid),
  public.admin_dispute_list(text, int, int), public.admin_finance(),
  public.admin_coin_ledger(text, uuid, int, int), public.admin_arbitrator_list(text),
  public.admin_audit_list(text, text, int, int), public.admin_configuration(),
  public.admin_set_member_suspended(uuid, boolean, text), public.admin_set_admin_role(uuid, boolean, text),
  public.admin_moderate_project(uuid, text, text), public.admin_update_setting(text, numeric),
  public.admin_set_holiday(date, text), public.admin_remove_holiday(date), public.admin_record_entry(jsonb)
  to authenticated;
