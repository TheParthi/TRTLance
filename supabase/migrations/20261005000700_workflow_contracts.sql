-- TrustLance v2 — contract workflow: escrow transactions, milestones, completion and reviews.
--
-- Money moves only on-chain. The database mirrors the chain: the server verifies each transaction
-- receipt against the escrow contract and then calls one of the service-only apply_* functions.
-- All apply_* functions are idempotent (keyed by transaction) and enforce legal state transitions.

-- ---------------------------------------------------------------------------
-- Wallet verification (Sign-In-With-Ethereum)
-- ---------------------------------------------------------------------------
create or replace function public.issue_wallet_nonce()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_nonce text := encode(extensions.gen_random_bytes(16), 'hex');
begin
  perform app.rate_limit('wallet_nonce', 10, 600);
  if exists (select 1 from public.wallets where user_id = v_uid) then
    perform app.fail('wallet_already_linked', 'Your account already has a verified wallet.');
  end if;
  insert into public.wallet_nonces (nonce, user_id, expires_at) values (v_nonce, v_uid, now() + interval '10 minutes');
  return v_nonce;
end;
$$;

-- Called by the server only after it has verified the signature over the SIWE message.
create or replace function public.link_verified_wallet(p_user uuid, p_nonce text, p_address text, p_chain_id int,
                                                       p_message text, p_signature text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n public.wallet_nonces;
  v_addr text := lower(p_address);
begin
  select * into v_n from public.wallet_nonces where nonce = p_nonce for update;
  if not found or v_n.user_id <> p_user or v_n.consumed_at is not null or v_n.expires_at < now() then
    perform app.fail('nonce_invalid', 'This verification request expired. Start again.');
  end if;
  update public.wallet_nonces set consumed_at = now() where nonce = p_nonce;
  if exists (select 1 from public.wallets where user_id = p_user) then
    perform app.fail('wallet_already_linked', 'Your account already has a verified wallet.');
  end if;
  if exists (select 1 from public.wallets where address = v_addr) then
    perform app.fail('wallet_in_use', 'This wallet is already verified on another TrustLance account.');
  end if;
  insert into public.wallets (user_id, address, chain_id, siwe_message, signature)
  values (p_user, v_addr, p_chain_id, p_message, p_signature);
  perform app.notify(p_user, 'security', 'wallet.verified', 'Wallet verified',
                     'Wallet ' || left(v_addr, 6) || '…' || right(v_addr, 4) || ' is now linked to your account.',
                     '/wallet', 'success', null);
end;
$$;

-- ---------------------------------------------------------------------------
-- Escrow transactions reported by a party's wallet (pending until the server verifies them)
-- ---------------------------------------------------------------------------
create or replace function public.report_escrow_tx(p_contract_id uuid, p_kind text, p_milestone_id uuid,
                                                   p_chain_id int, p_tx_hash text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
  v_m public.milestones;
  v_hash text := lower(p_tx_hash);
  v_id uuid;
  v_existing public.escrow_transactions;
begin
  perform app.rate_limit('report_tx', 30, 600);
  if v_hash !~ '^0x[0-9a-f]{64}$' then
    perform app.fail('validation', 'That is not a valid transaction hash.');
  end if;
  select * into v_c from public.contracts where id = p_contract_id;
  if not found or not (v_c.client_id = v_uid or v_c.freelancer_id = v_uid or app.is_admin(v_uid)) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if p_milestone_id is not null then
    select * into v_m from public.milestones where id = p_milestone_id and contract_id = p_contract_id;
    if not found then
      perform app.fail('not_found', 'Milestone not found.');
    end if;
  end if;

  if p_kind = 'fund' then
    if v_uid <> v_c.client_id or v_c.status <> 'awaiting_funding' then
      perform app.fail('invalid_state', 'This contract is not waiting for funding.');
    end if;
  elsif p_kind = 'release' then
    if v_uid <> v_c.client_id or v_m.id is null then
      perform app.fail('forbidden', 'Only the client can release a milestone.');
    end if;
  elsif p_kind = 'refund' then
    if v_uid <> v_c.freelancer_id or v_m.id is null then
      perform app.fail('forbidden', 'Only the freelancer can return milestone funds.');
    end if;
  elsif p_kind = 'dispute' then
    if v_m.id is null or v_uid not in (v_c.client_id, v_c.freelancer_id) then
      perform app.fail('forbidden', 'Only a party can flag a milestone on-chain.');
    end if;
  elsif p_kind = 'resolve' then
    if v_m.id is null or not app.is_admin(v_uid) then
      perform app.fail('forbidden', 'Only the platform arbiter can settle a dispute.');
    end if;
  else
    perform app.fail('validation', 'Unknown transaction type.');
  end if;

  select * into v_existing from public.escrow_transactions where chain_id = p_chain_id and tx_hash = v_hash;
  if found then
    if v_existing.contract_id <> p_contract_id or v_existing.kind <> p_kind then
      perform app.fail('conflict', 'This transaction is already recorded for something else.');
    end if;
    return v_existing.id;
  end if;

  insert into public.escrow_transactions (contract_id, milestone_id, kind, chain_id, tx_hash, reported_by)
  values (p_contract_id, p_milestone_id, p_kind, p_chain_id, v_hash, v_uid)
  returning id into v_id;
  if p_kind = 'resolve' then
    update public.disputes set settlement_status = 'pending'
     where milestone_id = p_milestone_id and status = 'resolved' and settlement_status = 'ready';
  end if;
  perform app.log_contract_event(p_contract_id, 'escrow.tx_submitted',
    jsonb_build_object('kind', p_kind, 'tx_hash', v_hash, 'milestone_id', p_milestone_id));
  return v_id;
end;
$$;

-- Server-only: mark a transaction as failed (reverted, wrong contract, wrong amounts…).
create or replace function public.fail_escrow_tx(p_tx_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.status <> 'pending' then
    return;
  end if;
  update public.escrow_transactions set status = 'failed', failure_reason = left(p_reason, 500) where id = p_tx_id;
  if v_t.kind = 'resolve' then
    update public.disputes set settlement_status = 'ready'
     where milestone_id = v_t.milestone_id and status = 'resolved' and settlement_status = 'pending';
  end if;
  perform app.log_contract_event(v_t.contract_id, 'escrow.tx_failed',
    jsonb_build_object('kind', v_t.kind, 'tx_hash', v_t.tx_hash, 'reason', left(p_reason, 500)), null);
  if v_t.reported_by is not null then
    perform app.notify(v_t.reported_by, 'payments', 'escrow.tx_failed', 'Transaction not accepted',
                       left(p_reason, 300), '/contracts/' || v_t.contract_id, 'critical', v_t.contract_id);
  end if;
end;
$$;

create or replace function app.confirm_tx(p_tx_id uuid, p_block bigint, p_from text, p_amount numeric)
returns public.escrow_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
begin
  update public.escrow_transactions
     set status = 'confirmed', block_number = p_block, from_address = lower(p_from), amount = p_amount,
         confirmed_at = now(), failure_reason = null
   where id = p_tx_id
  returning * into v_t;
  return v_t;
end;
$$;

-- When every milestone is closed the contract and project complete and reputation updates.
create or replace function app.maybe_complete_contract(p_contract uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.contracts;
  v_open int;
  v_active_disputes int;
begin
  select * into v_c from public.contracts where id = p_contract for update;
  select count(*) into v_open from public.milestones
   where contract_id = p_contract and status not in ('paid', 'refunded', 'settled');
  select count(*) into v_active_disputes from public.disputes where contract_id = p_contract and status <> 'resolved';

  if v_open = 0 and v_c.status in ('active', 'disputed') then
    update public.contracts set status = 'completed', completed_at = now() where id = p_contract;
    update public.projects set status = 'completed', closed_at = now() where id = v_c.project_id;
    update public.profile_stats set completed_as_client = completed_as_client + 1, updated_at = now() where id = v_c.client_id;
    update public.profile_stats set completed_as_freelancer = completed_as_freelancer + 1, updated_at = now() where id = v_c.freelancer_id;
    perform app.award_trust_credits(v_c.client_id, 'contract_completed', p_contract, 20);
    perform app.award_trust_credits(v_c.freelancer_id, 'contract_completed', p_contract, 20);
    perform app.log_contract_event(p_contract, 'contract.completed', '{}'::jsonb, null);
    perform app.notify(v_c.client_id, 'contracts', 'contract.completed', 'Contract complete: ' || v_c.title,
                       'All milestones are closed. Leave a review for your freelancer.', '/contracts/' || p_contract || '?tab=review',
                       'success', p_contract);
    perform app.notify(v_c.freelancer_id, 'contracts', 'contract.completed', 'Contract complete: ' || v_c.title,
                       'All milestones are closed. Leave a review for your client.', '/contracts/' || p_contract || '?tab=review',
                       'success', p_contract);
  elsif v_c.status = 'disputed' and v_active_disputes = 0 then
    update public.contracts set status = 'active' where id = p_contract;
  end if;
end;
$$;

-- Server-only: the Funded event was verified on-chain.
create or replace function public.apply_escrow_funding(p_tx_id uuid, p_block bigint, p_from text, p_amount numeric,
                                                       p_escrow_address text, p_escrow_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
  v_c public.contracts;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.kind <> 'fund' then
    perform app.fail('not_found', 'Transaction not found.');
  end if;
  if v_t.status = 'confirmed' then
    return;
  end if;
  select * into v_c from public.contracts where id = v_t.contract_id for update;
  if v_c.status <> 'awaiting_funding' then
    perform public.fail_escrow_tx(p_tx_id, 'The contract was not waiting for funding when this transaction confirmed.');
    return;
  end if;
  if lower(p_from) <> v_c.client_wallet then
    perform public.fail_escrow_tx(p_tx_id, 'Escrow was funded from a wallet other than the client''s verified wallet.');
    return;
  end if;
  if p_amount <> v_c.total_amount then
    perform public.fail_escrow_tx(p_tx_id, 'The deposited amount does not match the contract total.');
    return;
  end if;

  perform app.confirm_tx(p_tx_id, p_block, p_from, p_amount);
  update public.contracts
     set status = 'active', funded_at = now(), chain_id = v_t.chain_id,
         escrow_address = lower(p_escrow_address), escrow_key = lower(p_escrow_key)
   where id = v_c.id;
  update public.milestones
     set status = 'funded', due_date = current_date + due_in_days
   where contract_id = v_c.id and status = 'pending';
  update public.profile_stats set funded_as_client = funded_as_client + 1, updated_at = now() where id = v_c.client_id;
  perform app.log_contract_event(v_c.id, 'escrow.funded',
    jsonb_build_object('tx_hash', v_t.tx_hash, 'amount', p_amount::text, 'chain_id', v_t.chain_id), null);
  perform app.notify(v_c.freelancer_id, 'payments', 'escrow.funded', 'Escrow funded — you can start work',
                     app.fmt_amount(p_amount) || ' SHM is secured in escrow for ' || v_c.title || '.',
                     '/contracts/' || v_c.id, 'success', v_c.id);
  perform app.notify(v_c.client_id, 'payments', 'escrow.funded', 'Escrow funded',
                     app.fmt_amount(p_amount) || ' SHM is secured in escrow for ' || v_c.title || '.',
                     '/contracts/' || v_c.id, 'success', v_c.id);
end;
$$;

-- Server-only: a milestone was released to the freelancer on-chain.
create or replace function public.apply_escrow_release(p_tx_id uuid, p_block bigint, p_from text, p_position int,
                                                       p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
  v_c public.contracts;
  v_m public.milestones;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.kind <> 'release' then
    perform app.fail('not_found', 'Transaction not found.');
  end if;
  if v_t.status = 'confirmed' then
    return;
  end if;
  select * into v_c from public.contracts where id = v_t.contract_id for update;
  select * into v_m from public.milestones where contract_id = v_c.id and position = p_position for update;
  if not found or (v_t.milestone_id is not null and v_t.milestone_id <> v_m.id) then
    perform public.fail_escrow_tx(p_tx_id, 'The released milestone does not match this request.');
    return;
  end if;
  if v_m.status not in ('funded', 'submitted', 'revision_requested', 'approved') then
    perform public.fail_escrow_tx(p_tx_id, 'This milestone could not be released from its current state.');
    return;
  end if;
  if p_amount <> v_m.amount then
    perform public.fail_escrow_tx(p_tx_id, 'The released amount does not match the milestone.');
    return;
  end if;

  perform app.confirm_tx(p_tx_id, p_block, p_from, p_amount);
  update public.escrow_transactions set milestone_id = v_m.id where id = p_tx_id;
  update public.milestones
     set status = 'paid', paid_at = now(), approved_at = coalesce(approved_at, now()), freelancer_payout = p_amount
   where id = v_m.id;
  update public.milestone_submissions set review_status = 'approved', reviewed_at = coalesce(reviewed_at, now()),
         reviewed_by = coalesce(reviewed_by, v_c.client_id)
   where milestone_id = v_m.id and review_status = 'pending';
  perform app.log_contract_event(v_c.id, 'milestone.paid',
    jsonb_build_object('milestone_id', v_m.id, 'position', p_position, 'amount', p_amount::text, 'tx_hash', v_t.tx_hash), null);
  perform app.notify(v_c.freelancer_id, 'payments', 'milestone.paid', 'Payment released: ' || v_m.title,
                     app.fmt_amount(p_amount) || ' SHM was sent to your verified wallet.', '/contracts/' || v_c.id,
                     'success', v_c.id);
  perform app.maybe_complete_contract(v_c.id);
end;
$$;

-- Server-only: the freelancer returned a milestone's funds to the client on-chain.
create or replace function public.apply_escrow_refund(p_tx_id uuid, p_block bigint, p_from text, p_position int,
                                                      p_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
  v_c public.contracts;
  v_m public.milestones;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.kind <> 'refund' then
    perform app.fail('not_found', 'Transaction not found.');
  end if;
  if v_t.status = 'confirmed' then
    return;
  end if;
  select * into v_c from public.contracts where id = v_t.contract_id for update;
  select * into v_m from public.milestones where contract_id = v_c.id and position = p_position for update;
  if not found or v_m.status not in ('funded', 'submitted', 'revision_requested', 'approved') or p_amount <> v_m.amount then
    perform public.fail_escrow_tx(p_tx_id, 'This refund does not match an open milestone.');
    return;
  end if;
  perform app.confirm_tx(p_tx_id, p_block, p_from, p_amount);
  update public.escrow_transactions set milestone_id = v_m.id where id = p_tx_id;
  update public.milestones set status = 'refunded', client_refund = p_amount where id = v_m.id;
  perform app.log_contract_event(v_c.id, 'milestone.refunded',
    jsonb_build_object('milestone_id', v_m.id, 'position', p_position, 'amount', p_amount::text, 'tx_hash', v_t.tx_hash), null);
  perform app.notify(v_c.client_id, 'payments', 'milestone.refunded', 'Milestone refunded: ' || v_m.title,
                     app.fmt_amount(p_amount) || ' SHM was returned to your verified wallet.', '/contracts/' || v_c.id,
                     'info', v_c.id);
  perform app.maybe_complete_contract(v_c.id);
end;
$$;

-- Server-only: a party flagged the milestone as disputed on-chain (freezes it for the arbiter).
create or replace function public.apply_escrow_dispute_flag(p_tx_id uuid, p_block bigint, p_from text, p_position int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
  v_m public.milestones;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.kind <> 'dispute' then
    perform app.fail('not_found', 'Transaction not found.');
  end if;
  if v_t.status = 'confirmed' then
    return;
  end if;
  select * into v_m from public.milestones where contract_id = v_t.contract_id and position = p_position;
  if not found then
    perform public.fail_escrow_tx(p_tx_id, 'The flagged milestone does not exist.');
    return;
  end if;
  perform app.confirm_tx(p_tx_id, p_block, p_from, null);
  update public.escrow_transactions set milestone_id = v_m.id where id = p_tx_id;
  update public.disputes
     set onchain_flagged_at = coalesce(onchain_flagged_at, now()),
         settlement_status = case when settlement_status = 'awaiting_flag' then 'ready' else settlement_status end
   where milestone_id = v_m.id and (status <> 'resolved' or settlement_status = 'awaiting_flag');
  perform app.log_contract_event(v_t.contract_id, 'escrow.dispute_flagged',
    jsonb_build_object('milestone_id', v_m.id, 'position', p_position, 'tx_hash', v_t.tx_hash), null);
end;
$$;

-- Server-only: the arbiter's settlement confirmed on-chain.
create or replace function public.apply_escrow_resolution(p_tx_id uuid, p_block bigint, p_from text, p_position int,
                                                          p_freelancer_amount numeric, p_client_amount numeric)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_t public.escrow_transactions;
  v_c public.contracts;
  v_m public.milestones;
  v_d public.disputes;
  v_status text;
begin
  select * into v_t from public.escrow_transactions where id = p_tx_id for update;
  if not found or v_t.kind <> 'resolve' then
    perform app.fail('not_found', 'Transaction not found.');
  end if;
  if v_t.status = 'confirmed' then
    return;
  end if;
  select * into v_c from public.contracts where id = v_t.contract_id for update;
  select * into v_m from public.milestones where contract_id = v_c.id and position = p_position for update;
  select * into v_d from public.disputes where milestone_id = v_m.id order by created_at desc limit 1 for update;
  if v_m.status <> 'disputed' or v_d.id is null or v_d.status <> 'resolved' then
    perform public.fail_escrow_tx(p_tx_id, 'There is no decided dispute for this milestone.');
    return;
  end if;
  if p_freelancer_amount + p_client_amount <> v_m.amount
     or p_freelancer_amount <> trunc(v_m.amount * v_d.freelancer_pct / 100.0, 18) then
    perform public.fail_escrow_tx(p_tx_id, 'The settlement does not match the arbitrator''s decision.');
    return;
  end if;

  perform app.confirm_tx(p_tx_id, p_block, p_from, v_m.amount);
  update public.escrow_transactions set milestone_id = v_m.id where id = p_tx_id;
  v_status := case when v_d.freelancer_pct = 100 then 'paid' when v_d.freelancer_pct = 0 then 'refunded' else 'settled' end;
  update public.milestones
     set status = v_status, freelancer_payout = p_freelancer_amount, client_refund = p_client_amount,
         paid_at = case when p_freelancer_amount > 0 then now() end
   where id = v_m.id;
  update public.disputes set settlement_status = 'settled', settled_at = now() where id = v_d.id;
  perform app.log_dispute_event(v_d.id, 'dispute.settled',
    jsonb_build_object('tx_hash', v_t.tx_hash, 'freelancer_amount', p_freelancer_amount::text,
                       'client_amount', p_client_amount::text), null);
  perform app.log_contract_event(v_c.id, 'milestone.settled',
    jsonb_build_object('milestone_id', v_m.id, 'position', p_position, 'freelancer_amount', p_freelancer_amount::text,
                       'client_amount', p_client_amount::text, 'tx_hash', v_t.tx_hash), null);
  perform app.notify(v_c.client_id, 'disputes', 'dispute.settled', 'Dispute settled on-chain',
                     'You received ' || app.fmt_amount(p_client_amount) || ' SHM; the freelancer received '
                       || app.fmt_amount(p_freelancer_amount) || ' SHM.', '/disputes/' || v_d.id, 'success', v_d.id);
  perform app.notify(v_c.freelancer_id, 'disputes', 'dispute.settled', 'Dispute settled on-chain',
                     'You received ' || app.fmt_amount(p_freelancer_amount) || ' SHM; the client received '
                       || app.fmt_amount(p_client_amount) || ' SHM.', '/disputes/' || v_d.id, 'success', v_d.id);
  perform app.maybe_complete_contract(v_c.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Milestone work
-- ---------------------------------------------------------------------------
create or replace function public.submit_milestone(p_milestone_id uuid, p_note text, p_links text[], p_files jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_m public.milestones;
  v_c public.contracts;
  v_version int;
  v_id uuid;
  v_bad int;
begin
  perform app.rate_limit('submit_milestone', 20, 3600);
  select * into v_m from public.milestones where id = p_milestone_id for update;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if v_c.freelancer_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_c.status not in ('active', 'disputed') then
    perform app.fail('invalid_state', 'Work can be submitted only after escrow is funded.');
  end if;
  if v_m.status not in ('funded', 'revision_requested') then
    perform app.fail('invalid_state', 'This milestone is not waiting for a submission.');
  end if;
  if char_length(btrim(coalesce(p_note, ''))) < 10 then
    perform app.fail('validation', 'Describe what you are delivering (at least 10 characters).');
  end if;
  select count(*) into v_bad from unnest(coalesce(p_links, '{}')) l where (l !~ '^https?://\S{3,}$' or char_length(l) > 500);
  if v_bad > 0 or cardinality(coalesce(p_links, '{}')) > 10 then
    perform app.fail('validation', 'Links must be full http(s) URLs (up to 10).');
  end if;
  if p_files is not null and jsonb_typeof(p_files) = 'array' then
    select count(*) into v_bad from jsonb_array_elements(p_files) f
     where coalesce(f ->> 'storage_path', '') not like v_c.id::text || '/%';
    if v_bad > 0 or jsonb_array_length(p_files) > 10 then
      perform app.fail('validation', 'Attachments must be uploaded to this contract (up to 10).');
    end if;
  end if;

  select coalesce(max(version), 0) + 1 into v_version from public.milestone_submissions where milestone_id = v_m.id;
  insert into public.milestone_submissions (milestone_id, contract_id, version, note, links, submitted_by)
  values (v_m.id, v_c.id, v_version, btrim(p_note), coalesce(p_links, '{}'), v_uid)
  returning id into v_id;
  if p_files is not null and jsonb_typeof(p_files) = 'array' then
    insert into public.contract_files (contract_id, submission_id, uploaded_by, storage_path, file_name, size_bytes, mime_type)
    select v_c.id, v_id, v_uid, f ->> 'storage_path', f ->> 'file_name', (f ->> 'size_bytes')::bigint, f ->> 'mime_type'
      from jsonb_array_elements(p_files) f;
  end if;
  update public.milestones set status = 'submitted', submitted_at = now() where id = v_m.id;
  perform app.log_contract_event(v_c.id, 'milestone.submitted',
    jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position, 'version', v_version));
  perform app.notify(v_c.client_id, 'milestones', 'milestone.submitted', 'Work submitted: ' || v_m.title,
                     'Review the delivery and approve or request changes.', '/contracts/' || v_c.id,
                     'warning', v_c.id);
  return v_id;
end;
$$;

create or replace function public.request_revision(p_milestone_id uuid, p_comment text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_m public.milestones;
  v_c public.contracts;
begin
  select * into v_m from public.milestones where id = p_milestone_id for update;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if v_c.client_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_m.status <> 'submitted' then
    perform app.fail('invalid_state', 'There is no submission waiting for review.');
  end if;
  if char_length(btrim(coalesce(p_comment, ''))) < 10 then
    perform app.fail('validation', 'Explain what needs to change (at least 10 characters).');
  end if;
  update public.milestone_submissions
     set review_status = 'revision_requested', review_comment = btrim(p_comment), reviewed_by = v_uid, reviewed_at = now()
   where milestone_id = v_m.id and review_status = 'pending';
  update public.milestones set status = 'revision_requested', revision_count = revision_count + 1 where id = v_m.id;
  perform app.log_contract_event(v_c.id, 'milestone.revision_requested',
    jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position));
  perform app.notify(v_c.freelancer_id, 'milestones', 'milestone.revision', 'Changes requested: ' || v_m.title,
                     left(btrim(p_comment), 300), '/contracts/' || v_c.id, 'warning', v_c.id);
end;
$$;

-- Approval records the client's decision; payment happens when the release transaction confirms.
create or replace function public.approve_milestone(p_milestone_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_m public.milestones;
  v_c public.contracts;
begin
  select * into v_m from public.milestones where id = p_milestone_id for update;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if v_c.client_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_m.status = 'submitted' then
    update public.milestone_submissions
       set review_status = 'approved', reviewed_by = v_uid, reviewed_at = now()
     where milestone_id = v_m.id and review_status = 'pending';
    update public.milestones set status = 'approved', approved_at = now() where id = v_m.id;
    perform app.log_contract_event(v_c.id, 'milestone.approved',
      jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position));
    perform app.notify(v_c.freelancer_id, 'milestones', 'milestone.approved', 'Approved: ' || v_m.title,
                       'The client approved your work. Payment is released when their wallet transaction confirms.',
                       '/contracts/' || v_c.id, 'success', v_c.id);
  elsif v_m.status <> 'approved' then
    perform app.fail('invalid_state', 'Only submitted work can be approved.');
  end if;
  return jsonb_build_object('contract_id', v_c.id, 'escrow_key', v_c.escrow_key, 'position', v_m.position,
                            'amount', v_m.amount::text);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reviews (only after a completed contract, once per side)
-- ---------------------------------------------------------------------------
create or replace function public.submit_review(p_contract_id uuid, p_rating int, p_ratings jsonb, p_body text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
  v_role text;
  v_reviewee uuid;
  v_keys text[];
  v_id uuid;
  v_bad int;
begin
  select * into v_c from public.contracts where id = p_contract_id;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.status <> 'completed' then
    perform app.fail('invalid_state', 'Reviews open when the contract is complete.');
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    perform app.fail('validation', 'Choose an overall rating from 1 to 5.');
  end if;
  if char_length(btrim(coalesce(p_body, ''))) < 20 then
    perform app.fail('validation', 'Write at least 20 characters about your experience.');
  end if;
  if v_uid = v_c.client_id then
    v_role := 'client';
    v_reviewee := v_c.freelancer_id;
    v_keys := array['quality', 'communication', 'timeliness'];
  else
    v_role := 'freelancer';
    v_reviewee := v_c.client_id;
    v_keys := array['clarity', 'communication', 'responsiveness'];
  end if;
  p_ratings := coalesce(p_ratings, '{}'::jsonb);
  select count(*) into v_bad from jsonb_each(p_ratings) e
   where not (e.key = any (v_keys)) or jsonb_typeof(e.value) <> 'number' or (e.value)::int not between 1 and 5;
  if v_bad > 0 then
    perform app.fail('validation', 'Category ratings must be between 1 and 5.');
  end if;
  if exists (select 1 from public.reviews where contract_id = p_contract_id and reviewer_id = v_uid) then
    perform app.fail('already_reviewed', 'You have already reviewed this contract.');
  end if;
  insert into public.reviews (contract_id, reviewer_id, reviewee_id, reviewer_role, rating, ratings, body)
  values (p_contract_id, v_uid, v_reviewee, v_role, p_rating, p_ratings, btrim(p_body))
  returning id into v_id;
  perform app.log_contract_event(p_contract_id, 'review.submitted', jsonb_build_object('role', v_role, 'rating', p_rating));
  perform app.notify(v_reviewee, 'contracts', 'review.received', 'You received a ' || p_rating || '-star review',
                     'On ' || v_c.title, '/contracts/' || p_contract_id || '?tab=review', 'info', p_contract_id);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke execute on function
  public.issue_wallet_nonce(), public.report_escrow_tx(uuid, text, uuid, int, text),
  public.submit_milestone(uuid, text, text[], jsonb), public.request_revision(uuid, text),
  public.approve_milestone(uuid), public.submit_review(uuid, int, jsonb, text)
  from public, anon;
grant execute on function
  public.issue_wallet_nonce(), public.report_escrow_tx(uuid, text, uuid, int, text),
  public.submit_milestone(uuid, text, text[], jsonb), public.request_revision(uuid, text),
  public.approve_milestone(uuid), public.submit_review(uuid, int, jsonb, text)
  to authenticated;

revoke execute on function
  public.link_verified_wallet(uuid, text, text, int, text, text), public.fail_escrow_tx(uuid, text),
  public.apply_escrow_funding(uuid, bigint, text, numeric, text, text),
  public.apply_escrow_release(uuid, bigint, text, int, numeric),
  public.apply_escrow_refund(uuid, bigint, text, int, numeric),
  public.apply_escrow_dispute_flag(uuid, bigint, text, int),
  public.apply_escrow_resolution(uuid, bigint, text, int, numeric, numeric)
  from public, anon, authenticated;
grant execute on function
  public.link_verified_wallet(uuid, text, text, int, text, text), public.fail_escrow_tx(uuid, text),
  public.apply_escrow_funding(uuid, bigint, text, numeric, text, text),
  public.apply_escrow_release(uuid, bigint, text, int, numeric),
  public.apply_escrow_refund(uuid, bigint, text, int, numeric),
  public.apply_escrow_dispute_flag(uuid, bigint, text, int),
  public.apply_escrow_resolution(uuid, bigint, text, int, numeric, numeric)
  to service_role;

revoke execute on function app.confirm_tx(uuid, bigint, text, numeric), app.maybe_complete_contract(uuid) from public;
