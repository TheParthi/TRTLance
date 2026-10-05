-- TrustLance v2 — disputes and arbitration workflow.
--
-- Dispute status: open (waiting for an arbitrator) → awaiting_evidence → under_review → resolved
--                 any unresolved status → escalated (platform admin decides)
-- The arbitrator recommends nothing automatically: the AI recommendation is advisory and the
-- decision is always a person's. Funds move only when the escrow contract settles the decision.

create or replace function app.active_case_count(p_arbitrator uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int from public.disputes where arbitrator_id = p_arbitrator and status <> 'resolved'
$$;

-- An arbitrator has a conflict if they have ever been on a contract with either party.
create or replace function app.has_conflict(p_arbitrator uuid, p_client uuid, p_freelancer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_arbitrator in (p_client, p_freelancer) or exists (
    select 1 from public.contracts c
     where (c.client_id = p_arbitrator and c.freelancer_id in (p_client, p_freelancer))
        or (c.freelancer_id = p_arbitrator and c.client_id in (p_client, p_freelancer))
  )
$$;

create or replace function app.assign_arbitrator(p_dispute uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disputes;
  v_c public.contracts;
  v_category text;
  v_pick uuid;
begin
  select * into v_d from public.disputes where id = p_dispute for update;
  select * into v_c from public.contracts where id = v_d.contract_id;
  select category into v_category from public.projects where id = v_c.project_id;
  select a.user_id into v_pick
    from public.arbitrators a
   where a.status = 'approved' and a.is_available
     and not app.has_conflict(a.user_id, v_c.client_id, v_c.freelancer_id)
     and app.active_case_count(a.user_id) < a.capacity
   order by (v_category = any (a.specializations)) desc, app.active_case_count(a.user_id) asc, random()
   limit 1;
  if v_pick is null then
    return null;
  end if;
  update public.disputes
     set arbitrator_id = v_pick, assigned_at = now(), status = 'awaiting_evidence',
         evidence_due_at = now() + interval '3 days'
   where id = p_dispute;
  perform app.log_dispute_event(p_dispute, 'dispute.assigned', jsonb_build_object('arbitrator_id', v_pick), null);
  perform app.notify(v_pick, 'disputes', 'dispute.assigned', 'New case assigned: DSP-' || lpad(v_d.number::text, 6, '0'),
                     'Review the case and the evidence. Evidence window: 3 days.', '/arbitration/cases/' || p_dispute,
                     'warning', p_dispute);
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute, 'system', 'An independent arbitrator has been assigned. Both parties have 3 days to add evidence.');
  return v_pick;
end;
$$;

create or replace function public.open_dispute(p_contract_id uuid, p_milestone_id uuid, p_reason text, p_description text,
                                               p_requested_outcome text, p_requested_freelancer_pct int,
                                               p_idempotency_key text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_prior jsonb;
  v_c public.contracts;
  v_m public.milestones;
  v_id uuid;
  v_number bigint;
  v_respondent uuid;
  v_name text;
begin
  v_prior := app.idempotent_result(p_idempotency_key, 'open_dispute');
  if v_prior is not null then
    return (v_prior ->> 'dispute_id')::uuid;
  end if;
  perform app.rate_limit('open_dispute', 5, 3600);

  select * into v_c from public.contracts where id = p_contract_id for update;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.status not in ('active', 'disputed') then
    perform app.fail('invalid_state', 'Disputes can be opened only on funded contracts.');
  end if;
  select * into v_m from public.milestones where id = p_milestone_id and contract_id = p_contract_id for update;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_m.status not in ('funded', 'submitted', 'revision_requested', 'approved') then
    perform app.fail('invalid_state', 'This milestone cannot be disputed in its current state.');
  end if;
  if p_reason not in ('quality', 'scope', 'deadline', 'non_responsive', 'non_payment', 'other') then
    perform app.fail('validation', 'Choose a reason.');
  end if;
  if char_length(btrim(coalesce(p_description, ''))) < 50 then
    perform app.fail('validation', 'Describe the problem in at least 50 characters.');
  end if;
  if p_requested_outcome not in ('release', 'refund', 'partial') then
    perform app.fail('validation', 'Choose the outcome you are asking for.');
  end if;
  if p_requested_outcome = 'partial' and (p_requested_freelancer_pct is null or p_requested_freelancer_pct not between 1 and 99) then
    perform app.fail('validation', 'For a partial outcome, choose the freelancer''s share (1–99%).');
  end if;

  v_respondent := case when v_uid = v_c.client_id then v_c.freelancer_id else v_c.client_id end;
  insert into public.disputes (contract_id, milestone_id, raised_by, respondent_id, reason, description,
                               requested_outcome, requested_freelancer_pct, amount)
  values (p_contract_id, p_milestone_id, v_uid, v_respondent, p_reason, btrim(p_description), p_requested_outcome,
          case when p_requested_outcome = 'partial' then p_requested_freelancer_pct
               when p_requested_outcome = 'release' then 100 else 0 end,
          v_m.amount)
  returning id, number into v_id, v_number;

  update public.milestones set status_before_dispute = status, status = 'disputed' where id = v_m.id;
  update public.contracts set status = 'disputed' where id = p_contract_id;

  select display_name into v_name from public.profiles where id = v_uid;
  perform app.log_dispute_event(v_id, 'dispute.opened',
    jsonb_build_object('reason', p_reason, 'requested_outcome', p_requested_outcome, 'milestone_position', v_m.position));
  perform app.log_contract_event(p_contract_id, 'dispute.opened',
    jsonb_build_object('dispute_id', v_id, 'milestone_id', v_m.id, 'position', v_m.position));
  insert into public.dispute_messages (dispute_id, kind, body)
  values (v_id, 'system', v_name || ' opened this dispute about milestone ' || v_m.position || ' (' || v_m.title || ').');
  perform app.notify(v_respondent, 'disputes', 'dispute.opened', 'Dispute opened: ' || v_c.title,
                     v_name || ' disputed milestone ' || v_m.position || '. Add your evidence and response.',
                     '/disputes/' || v_id, 'critical', v_id);

  perform app.assign_arbitrator(v_id);
  perform app.remember_result(p_idempotency_key, 'open_dispute', jsonb_build_object('dispute_id', v_id));
  return v_id;
end;
$$;

create or replace function app.require_case_arbitrator(p_dispute uuid)
returns public.disputes
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disputes;
begin
  select * into v_d from public.disputes where id = p_dispute for update;
  if not found or (v_d.arbitrator_id is distinct from auth.uid() and not app.is_admin()) then
    perform app.fail('not_found', 'Case not found.');
  end if;
  return v_d;
end;
$$;

create or replace function public.start_dispute_review(p_dispute_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disputes;
begin
  perform app.require_user();
  v_d := app.require_case_arbitrator(p_dispute_id);
  if v_d.status <> 'awaiting_evidence' then
    perform app.fail('invalid_state', 'This case is not waiting for evidence.');
  end if;
  update public.disputes set status = 'under_review' where id = p_dispute_id;
  perform app.log_dispute_event(p_dispute_id, 'dispute.review_started');
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'The arbitrator closed the evidence window and started the review.');
end;
$$;

create or replace function public.request_more_evidence(p_dispute_id uuid, p_message text, p_days int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disputes;
  v_c public.contracts;
begin
  perform app.require_user();
  v_d := app.require_case_arbitrator(p_dispute_id);
  if v_d.status not in ('awaiting_evidence', 'under_review') then
    perform app.fail('invalid_state', 'Evidence can be requested only on an active case.');
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 or coalesce(p_days, 0) not between 1 and 7 then
    perform app.fail('validation', 'Explain what is needed and give 1–7 days.');
  end if;
  update public.disputes set status = 'awaiting_evidence', evidence_due_at = now() + make_interval(days => p_days)
   where id = p_dispute_id;
  perform app.log_dispute_event(p_dispute_id, 'dispute.evidence_requested', jsonb_build_object('days', p_days));
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'The arbitrator requested more evidence (' || p_days || ' days): ' || btrim(p_message));
  select * into v_c from public.contracts where id = v_d.contract_id;
  perform app.notify(v_c.client_id, 'disputes', 'dispute.evidence_requested', 'Evidence requested',
                     left(btrim(p_message), 300), '/disputes/' || p_dispute_id, 'warning', p_dispute_id);
  perform app.notify(v_c.freelancer_id, 'disputes', 'dispute.evidence_requested', 'Evidence requested',
                     left(btrim(p_message), 300), '/disputes/' || p_dispute_id, 'warning', p_dispute_id);
end;
$$;

create or replace function public.escalate_dispute(p_dispute_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_d public.disputes;
  v_c public.contracts;
  v_admin record;
begin
  select * into v_d from public.disputes where id = p_dispute_id for update;
  if not found or not app.can_view_dispute(p_dispute_id) then
    perform app.fail('not_found', 'Dispute not found.');
  end if;
  if v_d.status in ('resolved', 'escalated') then
    perform app.fail('invalid_state', 'This dispute cannot be escalated.');
  end if;
  select * into v_c from public.contracts where id = v_d.contract_id;
  if v_uid <> coalesce(v_d.arbitrator_id, '00000000-0000-0000-0000-000000000000'::uuid) then
    -- A party may escalate only if no arbitrator was assigned within 48 hours.
    if v_uid not in (v_c.client_id, v_c.freelancer_id) or v_d.arbitrator_id is not null
       or v_d.created_at > now() - interval '48 hours' then
      perform app.fail('forbidden', 'You can escalate only if no arbitrator was assigned within 48 hours.');
    end if;
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    perform app.fail('validation', 'Explain why this needs escalation.');
  end if;
  update public.disputes set status = 'escalated', escalation_reason = btrim(p_reason) where id = p_dispute_id;
  perform app.log_dispute_event(p_dispute_id, 'dispute.escalated', jsonb_build_object('reason', btrim(p_reason)));
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'This case was escalated to the TrustLance platform team.');
  for v_admin in select user_id from public.platform_admins loop
    perform app.notify(v_admin.user_id, 'disputes', 'dispute.escalated',
                       'Escalated case DSP-' || lpad(v_d.number::text, 6, '0'), left(btrim(p_reason), 300),
                       '/admin/disputes/' || p_dispute_id, 'critical', p_dispute_id);
  end loop;
end;
$$;

create or replace function public.decide_dispute(p_dispute_id uuid, p_decision text, p_freelancer_pct int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_d public.disputes;
  v_c public.contracts;
  v_pct int;
  v_summary text;
  v_loser uuid;
begin
  select * into v_d from public.disputes where id = p_dispute_id for update;
  if not found then
    perform app.fail('not_found', 'Case not found.');
  end if;
  if v_d.status = 'resolved' then
    perform app.fail('invalid_state', 'This case has already been decided.');
  end if;
  if not ((v_d.arbitrator_id = v_uid and v_d.status in ('awaiting_evidence', 'under_review'))
          or (app.is_admin(v_uid) and v_d.status in ('open', 'escalated', 'awaiting_evidence', 'under_review'))) then
    perform app.fail('forbidden', 'Only the assigned arbitrator can decide this case.');
  end if;
  select * into v_c from public.contracts where id = v_d.contract_id;
  if app.has_conflict(v_uid, v_c.client_id, v_c.freelancer_id) then
    perform app.fail('conflict_of_interest', 'You have worked with one of the parties and cannot decide this case.');
  end if;
  v_pct := case p_decision when 'freelancer' then 100 when 'client' then 0 when 'partial' then p_freelancer_pct end;
  if v_pct is null or (p_decision = 'partial' and v_pct not between 1 and 99) then
    perform app.fail('validation', 'Choose an outcome; a partial outcome needs a freelancer share of 1–99%.');
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 50 then
    perform app.fail('validation', 'Explain the decision in at least 50 characters. Both parties will read it.');
  end if;

  update public.disputes
     set status = 'resolved', decision = p_decision, freelancer_pct = v_pct, decision_reason = btrim(p_reason),
         decided_by = v_uid, decided_at = now(),
         settlement_status = case when onchain_flagged_at is not null then 'ready' else 'awaiting_flag' end
   where id = p_dispute_id;

  v_summary := case p_decision when 'freelancer' then 'Full payment to the freelancer'
                               when 'client' then 'Full refund to the client'
                               else v_pct || '% to the freelancer, ' || (100 - v_pct) || '% refunded to the client' end;
  perform app.log_dispute_event(p_dispute_id, 'dispute.decided',
    jsonb_build_object('decision', p_decision, 'freelancer_pct', v_pct, 'by_admin', v_d.arbitrator_id is distinct from v_uid));
  perform app.log_contract_event(v_c.id, 'dispute.decided',
    jsonb_build_object('dispute_id', p_dispute_id, 'decision', p_decision, 'freelancer_pct', v_pct));
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'Decision: ' || v_summary || '. Funds move when the escrow contract settles it.');

  v_loser := case p_decision when 'freelancer' then v_c.client_id when 'client' then v_c.freelancer_id end;
  if v_loser is not null then
    update public.profile_stats set disputes_lost = disputes_lost + 1, updated_at = now() where id = v_loser;
    perform app.award_trust_credits(v_loser, 'dispute_lost', v_c.id, -20);
  end if;

  perform app.notify(v_c.client_id, 'disputes', 'dispute.decided', 'Dispute decided: ' || v_c.title, v_summary,
                     '/disputes/' || p_dispute_id, 'critical', p_dispute_id);
  perform app.notify(v_c.freelancer_id, 'disputes', 'dispute.decided', 'Dispute decided: ' || v_c.title, v_summary,
                     '/disputes/' || p_dispute_id, 'critical', p_dispute_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Arbitrator programme
-- ---------------------------------------------------------------------------
create or replace function public.arbitrator_eligibility()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_s public.profile_stats;
  v_created timestamptz;
  v_checks jsonb;
begin
  select * into v_s from public.profile_stats where id = v_uid;
  select created_at into v_created from public.profiles where id = v_uid;
  v_checks := jsonb_build_array(
    jsonb_build_object('key', 'contracts', 'label', 'At least 3 completed contracts',
                       'met', (v_s.completed_as_client + v_s.completed_as_freelancer) >= 3,
                       'value', v_s.completed_as_client + v_s.completed_as_freelancer),
    jsonb_build_object('key', 'rating', 'label', 'Average rating of 4.0 or higher from at least 3 reviews',
                       'met', coalesce(v_s.rating_avg, 0) >= 4.0 and v_s.review_count >= 3,
                       'value', v_s.rating_avg),
    jsonb_build_object('key', 'disputes', 'label', 'No disputes decided against you',
                       'met', v_s.disputes_lost = 0, 'value', v_s.disputes_lost),
    jsonb_build_object('key', 'wallet', 'label', 'Verified wallet', 'met', v_s.wallet_verified, 'value', v_s.wallet_verified),
    jsonb_build_object('key', 'age', 'label', 'Account at least 30 days old',
                       'met', v_created <= now() - interval '30 days', 'value', v_created)
  );
  return jsonb_build_object('eligible', not exists (select 1 from jsonb_array_elements(v_checks) c where not (c ->> 'met')::boolean),
                            'checks', v_checks);
end;
$$;

create or replace function public.apply_as_arbitrator(p_specializations text[], p_statement text, p_capacity int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_existing public.arbitrators;
begin
  if not (public.arbitrator_eligibility() ->> 'eligible')::boolean then
    perform app.fail('not_eligible', 'You do not meet the arbitrator requirements yet.');
  end if;
  if coalesce(cardinality(p_specializations), 0) not between 1 and 3
     or exists (select 1 from unnest(p_specializations) s where s not in (select slug from public.categories)) then
    perform app.fail('validation', 'Choose one to three specialisations.');
  end if;
  if char_length(btrim(coalesce(p_statement, ''))) < 50 then
    perform app.fail('validation', 'Tell us about your experience (at least 50 characters).');
  end if;
  select * into v_existing from public.arbitrators where user_id = v_uid;
  if found and v_existing.status in ('pending', 'approved', 'suspended') then
    perform app.fail('invalid_state', 'You already have an arbitrator application.');
  end if;
  insert into public.arbitrators (user_id, specializations, statement, capacity)
  values (v_uid, p_specializations, btrim(p_statement), coalesce(p_capacity, 3))
  on conflict (user_id) do update
    set status = 'pending', specializations = excluded.specializations, statement = excluded.statement,
        capacity = excluded.capacity, applied_at = now(), reviewed_at = null, reviewed_by = null, review_note = null;
end;
$$;

create or replace function public.set_arbitrator_availability(p_available boolean, p_capacity int default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  update public.arbitrators
     set is_available = p_available, capacity = coalesce(p_capacity, capacity)
   where user_id = v_uid and status = 'approved';
  if not found then
    perform app.fail('forbidden', 'Only approved arbitrators can change availability.');
  end if;
end;
$$;

create or replace function public.admin_review_arbitrator(p_user_id uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Admins only.');
  end if;
  update public.arbitrators
     set status = case when p_approve then 'approved' else 'rejected' end, reviewed_at = now(), reviewed_by = v_uid,
         review_note = p_note, is_available = false
   where user_id = p_user_id and status in ('pending', 'suspended', 'approved');
  if not found then
    perform app.fail('not_found', 'Application not found.');
  end if;
  perform app.notify(p_user_id, 'system', 'arbitrator.reviewed',
                     case when p_approve then 'You are now a TrustLance arbitrator' else 'Arbitrator application not approved' end,
                     coalesce(p_note, ''), '/arbitration', case when p_approve then 'success' else 'info' end, null);
end;
$$;

create or replace function public.admin_assign_arbitrator(p_dispute_id uuid, p_arbitrator_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_d public.disputes;
  v_c public.contracts;
begin
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Admins only.');
  end if;
  select * into v_d from public.disputes where id = p_dispute_id for update;
  if not found or v_d.status = 'resolved' then
    perform app.fail('not_found', 'Open case not found.');
  end if;
  select * into v_c from public.contracts where id = v_d.contract_id;
  if not exists (select 1 from public.arbitrators where user_id = p_arbitrator_id and status = 'approved') then
    perform app.fail('validation', 'Choose an approved arbitrator.');
  end if;
  if app.has_conflict(p_arbitrator_id, v_c.client_id, v_c.freelancer_id) then
    perform app.fail('conflict_of_interest', 'That arbitrator has worked with one of the parties.');
  end if;
  update public.disputes
     set arbitrator_id = p_arbitrator_id, assigned_at = now(), status = 'awaiting_evidence',
         evidence_due_at = now() + interval '3 days'
   where id = p_dispute_id;
  perform app.log_dispute_event(p_dispute_id, 'dispute.assigned', jsonb_build_object('arbitrator_id', p_arbitrator_id, 'by_admin', true));
  perform app.notify(p_arbitrator_id, 'disputes', 'dispute.assigned', 'New case assigned: DSP-' || lpad(v_d.number::text, 6, '0'),
                     'Assigned by the platform team.', '/arbitration/cases/' || p_dispute_id, 'warning', p_dispute_id);
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'An independent arbitrator has been assigned. Both parties have 3 days to add evidence.');
end;
$$;

-- Notify the other participants of new dispute messages.
create or replace function app.on_dispute_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_d public.disputes;
  v_c public.contracts;
  v_u uuid;
begin
  if new.kind = 'system' then
    return null;
  end if;
  select * into v_d from public.disputes where id = new.dispute_id;
  select * into v_c from public.contracts where id = v_d.contract_id;
  foreach v_u in array array[v_c.client_id, v_c.freelancer_id, v_d.arbitrator_id] loop
    if v_u is not null and v_u <> new.sender_id and not exists (
      select 1 from public.notifications where user_id = v_u and type = 'dispute.message' and entity_id = new.dispute_id
         and read_at is null) then
      perform app.notify(v_u, 'disputes', 'dispute.message', 'New message in DSP-' || lpad(v_d.number::text, 6, '0'),
                         left(new.body, 300),
                         case when v_u = v_d.arbitrator_id then '/arbitration/cases/' else '/disputes/' end || new.dispute_id,
                         'info', new.dispute_id);
    end if;
  end loop;
  return null;
end;
$$;
create trigger dispute_messages_notify after insert on public.dispute_messages
  for each row execute function app.on_dispute_message();

create or replace function app.on_dispute_evidence()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.log_dispute_event(new.dispute_id, 'evidence.added',
    jsonb_build_object('evidence_id', new.id, 'kind', new.kind, 'title', new.title), new.submitted_by);
  return null;
end;
$$;
create trigger dispute_evidence_log after insert on public.dispute_evidence
  for each row execute function app.on_dispute_evidence();

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function
  public.open_dispute(uuid, uuid, text, text, text, int, text), public.start_dispute_review(uuid),
  public.request_more_evidence(uuid, text, int), public.escalate_dispute(uuid, text),
  public.decide_dispute(uuid, text, int, text), public.arbitrator_eligibility(),
  public.apply_as_arbitrator(text[], text, int), public.set_arbitrator_availability(boolean, int),
  public.admin_review_arbitrator(uuid, boolean, text), public.admin_assign_arbitrator(uuid, uuid)
  from public, anon;
grant execute on function
  public.open_dispute(uuid, uuid, text, text, text, int, text), public.start_dispute_review(uuid),
  public.request_more_evidence(uuid, text, int), public.escalate_dispute(uuid, text),
  public.decide_dispute(uuid, text, int, text), public.arbitrator_eligibility(),
  public.apply_as_arbitrator(text[], text, int), public.set_arbitrator_availability(boolean, int),
  public.admin_review_arbitrator(uuid, boolean, text), public.admin_assign_arbitrator(uuid, uuid)
  to authenticated;
revoke execute on function app.assign_arbitrator(uuid), app.require_case_arbitrator(uuid) from public;
grant execute on function app.active_case_count(uuid), app.has_conflict(uuid, uuid, uuid) to authenticated, service_role;
