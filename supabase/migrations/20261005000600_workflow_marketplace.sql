-- TrustLance v2 — workflow functions: projects, proposals, hiring and signing.
-- Every function re-checks identity and state server-side; the browser is never trusted.

create or replace function app.fmt_amount(p numeric)
returns text
language sql
immutable
as $$
  select rtrim(rtrim(round(p, 6)::numeric(38, 6)::text, '0'), '.')
$$;

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create or replace function public.publish_project(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_p public.projects;
  v_plan_sum numeric;
  v_plan_bad int;
begin
  perform app.rate_limit('publish_project', 10, 3600);
  select * into v_p from public.projects where id = p_project_id for update;
  if not found or v_p.client_id <> v_uid then
    perform app.fail('not_found', 'Project not found.');
  end if;
  if v_p.status <> 'draft' then
    perform app.fail('invalid_state', 'This project has already been published.');
  end if;
  if char_length(btrim(v_p.title)) < 10 then
    perform app.fail('validation', 'Add a title of at least 10 characters.');
  end if;
  if char_length(btrim(v_p.description)) < 30 then
    perform app.fail('validation', 'Describe the project in at least 30 characters.');
  end if;
  if v_p.category is null or cardinality(v_p.skills) = 0 or v_p.experience_level is null then
    perform app.fail('validation', 'Choose a category, at least one skill and an experience level.');
  end if;
  if v_p.budget_amount is null then
    perform app.fail('validation', 'Set a budget.');
  end if;
  if v_p.due_date is not null and v_p.due_date < current_date then
    perform app.fail('validation', 'The due date is in the past.');
  end if;
  if jsonb_array_length(v_p.milestone_plan) > 0 then
    select coalesce(sum((m ->> 'amount')::numeric), 0),
           count(*) filter (where char_length(btrim(coalesce(m ->> 'title', ''))) < 3
                               or coalesce((m ->> 'amount')::numeric, 0) <= 0)
      into v_plan_sum, v_plan_bad
      from jsonb_array_elements(v_p.milestone_plan) m;
    if v_plan_bad > 0 then
      perform app.fail('validation', 'Every suggested milestone needs a title and a positive amount.');
    end if;
    if v_plan_sum <> v_p.budget_amount then
      perform app.fail('validation', 'Suggested milestone amounts must add up to the budget.');
    end if;
  end if;

  update public.projects set status = 'open', published_at = now(), draft_step = 9 where id = p_project_id;
end;
$$;

create or replace function public.cancel_project(p_project_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_p public.projects;
  v_prop record;
begin
  select * into v_p from public.projects where id = p_project_id for update;
  if not found or v_p.client_id <> v_uid then
    perform app.fail('not_found', 'Project not found.');
  end if;
  if v_p.status <> 'open' then
    perform app.fail('invalid_state', 'Only open projects can be closed.');
  end if;
  update public.projects set status = 'cancelled', closed_at = now() where id = p_project_id;
  for v_prop in
    update public.proposals set status = 'declined', decided_at = now()
     where project_id = p_project_id and status = 'pending'
     returning freelancer_id
  loop
    perform app.notify(v_prop.freelancer_id, 'projects', 'project.closed', 'Project closed: ' || v_p.title,
                       coalesce(nullif(btrim(p_reason), ''), 'The client closed this project without hiring.'),
                       '/projects/' || p_project_id, 'info', p_project_id);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Proposals
-- ---------------------------------------------------------------------------
create or replace function public.submit_proposal(p_project_id uuid, p_cover_letter text, p_amount numeric,
                                                  p_duration_days int, p_relevant_skills text[], p_milestones jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_p public.projects;
  v_existing public.proposals;
  v_id uuid;
  v_count int;
  v_sum numeric;
  v_bad int;
  v_name text;
begin
  perform app.rate_limit('submit_proposal', 20, 3600);
  select * into v_p from public.projects where id = p_project_id for update;
  if not found or v_p.status = 'draft' then
    perform app.fail('not_found', 'Project not found.');
  end if;
  if v_p.client_id = v_uid then
    perform app.fail('forbidden', 'You cannot send a proposal to your own project.');
  end if;
  if v_p.status <> 'open' then
    perform app.fail('project_closed', 'This project is no longer accepting proposals.');
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 6) then
    perform app.fail('validation', 'Enter a positive amount with at most 6 decimal places.');
  end if;
  if p_duration_days is null or p_duration_days not between 1 and 730 then
    perform app.fail('validation', 'Duration must be between 1 and 730 days.');
  end if;
  if char_length(btrim(coalesce(p_cover_letter, ''))) < 50 then
    perform app.fail('validation', 'Write a cover letter of at least 50 characters.');
  end if;
  if p_milestones is null or jsonb_typeof(p_milestones) <> 'array' then
    perform app.fail('validation', 'Add at least one milestone.');
  end if;
  v_count := jsonb_array_length(p_milestones);
  if v_count not between 1 and 20 then
    perform app.fail('validation', 'Add between 1 and 20 milestones.');
  end if;
  select coalesce(sum((m ->> 'amount')::numeric), 0),
         count(*) filter (where char_length(btrim(coalesce(m ->> 'title', ''))) < 3
                             or coalesce((m ->> 'amount')::numeric, 0) <= 0
                             or (m ->> 'amount')::numeric <> round((m ->> 'amount')::numeric, 6)
                             or coalesce((m ->> 'due_in_days')::int, 0) not between 1 and p_duration_days)
    into v_sum, v_bad
    from jsonb_array_elements(p_milestones) m;
  if v_bad > 0 then
    perform app.fail('validation', 'Each milestone needs a title, a positive amount and a due day within the proposal duration.');
  end if;
  if v_sum <> p_amount then
    perform app.fail('validation', 'Milestone amounts must add up exactly to the proposal amount.');
  end if;

  select * into v_existing from public.proposals where project_id = p_project_id and freelancer_id = v_uid for update;
  if found then
    if v_existing.status <> 'withdrawn' then
      perform app.fail('proposal_exists', 'You have already sent a proposal for this project.');
    end if;
    update public.proposals
       set cover_letter = btrim(p_cover_letter), amount = p_amount, duration_days = p_duration_days,
           relevant_skills = coalesce(p_relevant_skills, '{}'), status = 'pending', decided_at = null,
           created_at = now()
     where id = v_existing.id
     returning id into v_id;
    delete from public.proposal_milestones where proposal_id = v_id;
  else
    insert into public.proposals (project_id, freelancer_id, cover_letter, amount, duration_days, relevant_skills)
    values (p_project_id, v_uid, btrim(p_cover_letter), p_amount, p_duration_days, coalesce(p_relevant_skills, '{}'))
    returning id into v_id;
  end if;

  insert into public.proposal_milestones (proposal_id, position, title, description, amount, due_in_days)
  select v_id, ord::int, btrim(m ->> 'title'), btrim(coalesce(m ->> 'description', '')),
         (m ->> 'amount')::numeric, (m ->> 'due_in_days')::int
    from jsonb_array_elements(p_milestones) with ordinality as t(m, ord);

  select display_name into v_name from public.profiles where id = v_uid;
  perform app.notify(v_p.client_id, 'projects', 'proposal.new', 'New proposal on ' || v_p.title,
                     coalesce(v_name, 'A freelancer') || ' proposed ' || app.fmt_amount(p_amount) || ' SHM over '
                       || p_duration_days || ' days.',
                     '/projects/' || p_project_id || '/proposals', 'info', v_id);
  return v_id;
end;
$$;

create or replace function public.withdraw_proposal(p_proposal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_pr public.proposals;
  v_title text;
  v_client uuid;
begin
  select * into v_pr from public.proposals where id = p_proposal_id for update;
  if not found or v_pr.freelancer_id <> v_uid then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  if v_pr.status <> 'pending' then
    perform app.fail('invalid_state', 'Only pending proposals can be withdrawn.');
  end if;
  update public.proposals set status = 'withdrawn', decided_at = now() where id = p_proposal_id;
  select title, client_id into v_title, v_client from public.projects where id = v_pr.project_id;
  perform app.notify(v_client, 'projects', 'proposal.withdrawn', 'A proposal was withdrawn', 'On ' || v_title,
                     '/projects/' || v_pr.project_id || '/proposals', 'info', p_proposal_id);
end;
$$;

create or replace function public.decline_proposal(p_proposal_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_pr public.proposals;
  v_p public.projects;
begin
  select * into v_pr from public.proposals where id = p_proposal_id for update;
  if not found then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  select * into v_p from public.projects where id = v_pr.project_id;
  if v_p.client_id <> v_uid then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  if v_pr.status <> 'pending' then
    perform app.fail('invalid_state', 'This proposal has already been decided.');
  end if;
  update public.proposals set status = 'declined', decided_at = now() where id = p_proposal_id;
  perform app.notify(v_pr.freelancer_id, 'projects', 'proposal.declined', 'Proposal not selected: ' || v_p.title,
                     coalesce(nullif(btrim(p_reason), ''), 'The client chose not to move forward with your proposal.'),
                     '/projects/' || v_p.id, 'info', p_proposal_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Hiring: accept a proposal → contract awaiting signatures. Idempotent.
-- ---------------------------------------------------------------------------
create or replace function public.accept_proposal(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_pr public.proposals;
  v_p public.projects;
  v_contract uuid;
  v_terms jsonb;
  v_client public.profiles;
  v_free public.profiles;
  v_conv uuid;
  v_other record;
begin
  select * into v_pr from public.proposals where id = p_proposal_id;
  if not found then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  -- Lock the project: concurrent accepts on the same project serialize here.
  select * into v_p from public.projects where id = v_pr.project_id for update;
  if v_p.client_id <> v_uid then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  select * into v_pr from public.proposals where id = p_proposal_id for update;

  if v_pr.status = 'accepted' then
    select id into v_contract from public.contracts where proposal_id = p_proposal_id;
    return v_contract;
  end if;
  if v_p.status <> 'open' then
    perform app.fail('project_closed', 'This project is not open for hiring.');
  end if;
  if v_pr.status <> 'pending' then
    perform app.fail('invalid_state', 'This proposal is no longer available.');
  end if;

  select * into v_client from public.profiles where id = v_p.client_id;
  select * into v_free from public.profiles where id = v_pr.freelancer_id;

  v_terms := jsonb_build_object(
    'version', 1,
    'project', jsonb_build_object('id', v_p.id, 'title', v_p.title),
    'scope', v_p.description,
    'deliverables', to_jsonb(v_p.deliverables),
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.display_name, 'username', v_client.username),
    'freelancer', jsonb_build_object('id', v_free.id, 'name', v_free.display_name, 'username', v_free.username),
    'currency', 'SHM',
    'total_amount', v_pr.amount::text,
    'duration_days', v_pr.duration_days,
    'milestones', (select jsonb_agg(jsonb_build_object('position', position, 'title', title, 'description', description,
                                                       'amount', amount::text, 'due_in_days', due_in_days) order by position)
                     from public.proposal_milestones where proposal_id = p_proposal_id),
    'payment_terms', 'The client deposits the full amount into the escrow contract before work starts. Each milestone is paid to the freelancer''s verified wallet when the client approves it. Disputed milestones are decided by an independent arbitrator and settled by the escrow contract.'
  );

  insert into public.contracts (project_id, proposal_id, client_id, freelancer_id, title, scope, deliverables,
                                total_amount, terms, terms_hash)
  values (v_p.id, p_proposal_id, v_p.client_id, v_pr.freelancer_id, v_p.title, v_p.description, v_p.deliverables,
          v_pr.amount, v_terms, encode(extensions.digest(convert_to(v_terms::text, 'UTF8'), 'sha256'), 'hex'))
  returning id into v_contract;

  insert into public.milestones (contract_id, position, title, description, amount, due_in_days)
  select v_contract, position, title, description, amount, due_in_days
    from public.proposal_milestones where proposal_id = p_proposal_id;

  update public.proposals set status = 'accepted', decided_at = now() where id = p_proposal_id;
  for v_other in
    update public.proposals set status = 'declined', decided_at = now()
     where project_id = v_p.id and status = 'pending' and id <> p_proposal_id
     returning freelancer_id, id
  loop
    perform app.notify(v_other.freelancer_id, 'projects', 'proposal.declined', 'Proposal not selected: ' || v_p.title,
                       'The client hired another freelancer for this project.', '/projects/' || v_p.id, 'info', v_other.id);
  end loop;
  update public.projects set status = 'in_contract', hired_freelancer_id = v_pr.freelancer_id where id = v_p.id;

  v_conv := app.ensure_conversation(v_p.id, v_pr.freelancer_id);
  update public.conversations set contract_id = v_contract where id = v_conv;
  perform app.post_system_message(v_conv, v_client.display_name || ' hired ' || v_free.display_name
                                  || '. The contract is waiting for both signatures.');

  perform app.log_contract_event(v_contract, 'contract.created',
    jsonb_build_object('proposal_id', p_proposal_id, 'total_amount', v_pr.amount::text));
  perform app.notify(v_pr.freelancer_id, 'contracts', 'contract.offered', 'You''re hired: ' || v_p.title,
                     'Review and sign the contract so the client can fund escrow.', '/contracts/' || v_contract,
                     'success', v_contract);
  return v_contract;
end;
$$;

-- ---------------------------------------------------------------------------
-- Signing. Both parties sign the exact terms (by hash) with a verified wallet on file.
-- ---------------------------------------------------------------------------
create or replace function public.sign_contract(p_contract_id uuid, p_full_name text, p_terms_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
  v_wallet text;
  v_role text;
  v_other uuid;
  v_name text := btrim(coalesce(p_full_name, ''));
begin
  select * into v_c from public.contracts where id = p_contract_id for update;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.status <> 'pending_signatures' then
    perform app.fail('invalid_state', 'This contract is not waiting for signatures.');
  end if;
  if p_terms_hash is distinct from v_c.terms_hash then
    perform app.fail('terms_changed', 'The contract terms changed. Reload and review them before signing.');
  end if;
  if char_length(v_name) not between 2 and 100 then
    perform app.fail('validation', 'Type your full name to sign.');
  end if;
  select address into v_wallet from public.wallets where user_id = v_uid;
  if v_wallet is null then
    perform app.fail('wallet_required', 'Verify your wallet first. Escrow pays out to, and is funded from, verified wallets.');
  end if;

  if v_uid = v_c.client_id then
    if v_c.client_signed_at is not null then
      perform app.fail('already_signed', 'You have already signed this contract.');
    end if;
    if v_wallet = v_c.freelancer_wallet then
      perform app.fail('forbidden', 'Client and freelancer must use different wallets.');
    end if;
    update public.contracts set client_signed_at = now(), client_signature_name = v_name, client_wallet = v_wallet
     where id = p_contract_id returning * into v_c;
    v_role := 'client';
    v_other := v_c.freelancer_id;
  else
    if v_c.freelancer_signed_at is not null then
      perform app.fail('already_signed', 'You have already signed this contract.');
    end if;
    if v_wallet = v_c.client_wallet then
      perform app.fail('forbidden', 'Client and freelancer must use different wallets.');
    end if;
    update public.contracts set freelancer_signed_at = now(), freelancer_signature_name = v_name, freelancer_wallet = v_wallet
     where id = p_contract_id returning * into v_c;
    v_role := 'freelancer';
    v_other := v_c.client_id;
  end if;

  perform app.log_contract_event(p_contract_id, 'contract.signed',
    jsonb_build_object('role', v_role, 'name', v_name, 'wallet', v_wallet, 'terms_hash', v_c.terms_hash));

  if v_c.client_signed_at is not null and v_c.freelancer_signed_at is not null then
    update public.contracts set status = 'awaiting_funding' where id = p_contract_id;
    perform app.log_contract_event(p_contract_id, 'contract.awaiting_funding', '{}'::jsonb, null);
    perform app.notify(v_c.client_id, 'payments', 'contract.fund', 'Fund escrow to start: ' || v_c.title,
                       'Both parties signed. Deposit ' || app.fmt_amount(v_c.total_amount)
                         || ' SHM into escrow so work can begin.',
                       '/contracts/' || p_contract_id, 'warning', p_contract_id);
    if v_role = 'client' then
      perform app.notify(v_c.freelancer_id, 'contracts', 'contract.signed', 'Contract signed by both parties',
                         'Waiting for the client to fund escrow. Do not start work until escrow is funded.',
                         '/contracts/' || p_contract_id, 'info', p_contract_id);
    else
      null; -- the client already receives the funding notification above
    end if;
    return 'awaiting_funding';
  end if;

  perform app.notify(v_other, 'contracts', 'contract.signed', v_name || ' signed the contract',
                     'Review and sign: ' || v_c.title, '/contracts/' || p_contract_id, 'info', p_contract_id);
  return 'pending_signatures';
end;
$$;

-- Either party can cancel before any money is deposited. The project reopens for proposals.
create or replace function public.cancel_contract(p_contract_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
  v_pending int;
begin
  select * into v_c from public.contracts where id = p_contract_id for update;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.status not in ('pending_signatures', 'awaiting_funding') then
    perform app.fail('invalid_state', 'Funded contracts cannot be cancelled. Use a refund or a dispute instead.');
  end if;
  select count(*) into v_pending from public.escrow_transactions
   where contract_id = p_contract_id and kind = 'fund' and status = 'pending';
  if v_pending > 0 then
    perform app.fail('funding_in_progress', 'A funding transaction is still being confirmed. Wait for it to finish.');
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    perform app.fail('validation', 'Explain why you are cancelling (at least 10 characters).');
  end if;
  update public.contracts set status = 'cancelled', cancelled_at = now() where id = p_contract_id;
  update public.projects set status = 'open', hired_freelancer_id = null where id = v_c.project_id;
  update public.proposals set status = 'withdrawn', decided_at = now() where id = v_c.proposal_id;
  perform app.log_contract_event(p_contract_id, 'contract.cancelled', jsonb_build_object('reason', btrim(p_reason)));
  perform app.notify(case when v_uid = v_c.client_id then v_c.freelancer_id else v_c.client_id end,
                     'contracts', 'contract.cancelled', 'Contract cancelled: ' || v_c.title, btrim(p_reason),
                     '/contracts/' || p_contract_id, 'warning', p_contract_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Conversations and notifications
-- ---------------------------------------------------------------------------
create or replace function public.start_conversation(p_proposal_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_pr public.proposals;
  v_client uuid;
begin
  select * into v_pr from public.proposals where id = p_proposal_id;
  if not found then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  select client_id into v_client from public.projects where id = v_pr.project_id;
  if v_uid <> v_client and v_uid <> v_pr.freelancer_id then
    perform app.fail('not_found', 'Proposal not found.');
  end if;
  if v_pr.status = 'withdrawn' then
    perform app.fail('invalid_state', 'This proposal was withdrawn.');
  end if;
  return app.ensure_conversation(v_pr.project_id, v_pr.freelancer_id);
end;
$$;

create or replace function public.mark_conversation_read(p_conversation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  update public.conversation_members set last_read_at = now()
   where conversation_id = p_conversation_id and user_id = v_uid;
  update public.notifications set read_at = now()
   where user_id = v_uid and type = 'message.new' and entity_id = p_conversation_id and read_at is null;
end;
$$;

create or replace function public.mark_notifications_read(p_ids uuid[] default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  update public.notifications set read_at = now()
   where user_id = v_uid and read_at is null and (p_ids is null or id = any (p_ids));
end;
$$;

-- Throttle chat to protect other members.
create or replace function app.throttle_messages()
returns trigger
language plpgsql
as $$
begin
  if new.kind <> 'system' then
    perform app.rate_limit('message', 40, 60);
  end if;
  return new;
end;
$$;
create trigger messages_throttle before insert on public.messages
  for each row execute function app.throttle_messages();
create trigger dispute_messages_throttle before insert on public.dispute_messages
  for each row execute function app.throttle_messages();

-- ---------------------------------------------------------------------------
-- Discovery
-- ---------------------------------------------------------------------------
create or replace function public.search_projects(
  p_query text default null,
  p_category text default null,
  p_skills text[] default null,
  p_min numeric default null,
  p_max numeric default null,
  p_experience text default null,
  p_sort text default 'newest',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  id uuid, title text, description text, category text, skills text[], budget_amount numeric, currency text,
  experience_level text, start_date date, due_date date, proposal_count int, milestone_count int,
  published_at timestamptz, client_id uuid, client_username text, client_name text, client_avatar text,
  client_email_verified boolean, client_wallet_verified boolean, client_funded int, client_rating numeric,
  client_reviews int, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select case when nullif(btrim(p_query), '') is null then null
                else websearch_to_tsquery('english', p_query) end as tsq
  ), base as (
    select p.*, s.email_verified, s.wallet_verified, s.funded_as_client, s.rating_avg, s.review_count,
           pr.username, pr.display_name, pr.avatar_path,
           case when q.tsq is null then 0 else ts_rank(p.search, q.tsq) end as rank
      from public.projects p
      join public.profiles pr on pr.id = p.client_id
      join public.profile_stats s on s.id = p.client_id
      cross join q
     where p.status = 'open' and p.visibility = 'public'
       and (q.tsq is null or p.search @@ q.tsq)
       and (p_category is null or p.category = p_category)
       and (p_skills is null or cardinality(p_skills) = 0 or p.skills && p_skills)
       and (p_min is null or p.budget_amount >= p_min)
       and (p_max is null or p.budget_amount <= p_max)
       and (p_experience is null or p.experience_level = p_experience)
  )
  select b.id, b.title, left(b.description, 400), b.category, b.skills, b.budget_amount, b.currency,
         b.experience_level, b.start_date, b.due_date, b.proposal_count, jsonb_array_length(b.milestone_plan),
         b.published_at, b.client_id, b.username, b.display_name, b.avatar_path,
         b.email_verified, b.wallet_verified, b.funded_as_client, b.rating_avg, b.review_count,
         count(*) over ()
    from base b
   order by
     case when p_sort = 'relevance' then b.rank end desc nulls last,
     case when p_sort = 'budget_high' then b.budget_amount end desc nulls last,
     case when p_sort = 'budget_low' then b.budget_amount end asc nulls last,
     case when p_sort = 'fewest_proposals' then b.proposal_count end asc nulls last,
     b.published_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

create or replace function public.search_people(p_query text default null, p_skills text[] default null,
                                                 p_limit int default 20, p_offset int default 0)
returns table (
  id uuid, username text, display_name text, headline text, avatar_path text, skills text[], location text,
  experience_level text, rating_avg numeric, review_count int, completed_as_freelancer int, wallet_verified boolean,
  email_verified boolean, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.headline, p.avatar_path, p.skills, p.location, p.experience_level,
         s.rating_avg, s.review_count, s.completed_as_freelancer, s.wallet_verified, s.email_verified,
         count(*) over ()
    from public.profiles p
    join public.profile_stats s on s.id = p.id
   where p.intent in ('work', 'both')
     and p.onboarding_completed_at is not null
     and (nullif(btrim(p_query), '') is null
          or p.display_name ilike '%' || btrim(p_query) || '%'
          or p.username ilike '%' || btrim(p_query) || '%'
          or p.headline ilike '%' || btrim(p_query) || '%'
          or exists (select 1 from unnest(p.skills) sk where sk ilike '%' || btrim(p_query) || '%'))
     and (p_skills is null or cardinality(p_skills) = 0 or p.skills && p_skills)
   order by s.completed_as_freelancer desc, s.rating_avg desc nulls last, p.created_at desc
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
  offset greatest(coalesce(p_offset, 0), 0)
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function
  public.publish_project(uuid), public.cancel_project(uuid, text),
  public.submit_proposal(uuid, text, numeric, int, text[], jsonb), public.withdraw_proposal(uuid),
  public.decline_proposal(uuid, text), public.accept_proposal(uuid), public.sign_contract(uuid, text, text),
  public.cancel_contract(uuid, text), public.start_conversation(uuid), public.mark_conversation_read(uuid),
  public.mark_notifications_read(uuid[])
  from public, anon;
grant execute on function
  public.publish_project(uuid), public.cancel_project(uuid, text),
  public.submit_proposal(uuid, text, numeric, int, text[], jsonb), public.withdraw_proposal(uuid),
  public.decline_proposal(uuid, text), public.accept_proposal(uuid), public.sign_contract(uuid, text, text),
  public.cancel_contract(uuid, text), public.start_conversation(uuid), public.mark_conversation_read(uuid),
  public.mark_notifications_read(uuid[])
  to authenticated;
grant execute on function public.search_projects(text, text, text[], numeric, numeric, text, text, int, int),
  public.search_people(text, text[], int, int) to anon, authenticated;
