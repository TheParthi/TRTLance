-- TrustLance v2 — TrustLance Coins replace on-chain escrow.
--
-- Model
--   * 1 coin = ₹1. Clients buy coins through the payment provider; the real money is held by the
--     provider (a licensed payment aggregator / escrow account), never by TrustLance's own bank account.
--   * Coins move only through a double-entry ledger (coin_accounts / coin_transactions / coin_entries).
--     Every movement debits one account and credits another, so the ledger always sums to zero, and
--     no user-facing account can go negative.
--   * Accounts:  wallet    — a user's purchased coins (spend on contracts; not withdrawable to a bank)
--                escrow    — one per contract: coins locked for its milestones
--                pending   — a freelancer's released earnings during the hold period
--                earnings  — a freelancer's withdrawable earnings
--                platform_fees, payouts_in_transit, gateway — system accounts. `gateway` is the outside
--                world: purchases move coins out of it, completed bank payouts move coins back into it.
--   * Released milestone payments (minus the platform fee) wait `hold_working_days` working days in
--     `pending` before they become withdrawable. Withdrawals are paid to a verified bank account.
--
-- This migration removes the wallet / on-chain escrow machinery that coins replace.

-- ---------------------------------------------------------------------------
-- 1. Remove on-chain escrow and wallet verification
-- ---------------------------------------------------------------------------
drop function if exists public.issue_wallet_nonce();
drop function if exists public.link_verified_wallet(uuid, text, text, int, text, text);
drop function if exists public.report_escrow_tx(uuid, text, uuid, int, text);
drop function if exists public.fail_escrow_tx(uuid, text);
drop function if exists app.confirm_tx(uuid, bigint, text, numeric);
drop function if exists public.apply_escrow_funding(uuid, bigint, text, numeric, text, text);
drop function if exists public.apply_escrow_release(uuid, bigint, text, int, numeric);
drop function if exists public.apply_escrow_refund(uuid, bigint, text, int, numeric);
drop function if exists public.apply_escrow_dispute_flag(uuid, bigint, text, int);
drop function if exists public.apply_escrow_resolution(uuid, bigint, text, int, numeric, numeric);
drop function if exists app.contract_ref(uuid);

drop table if exists public.escrow_transactions;
drop table if exists public.wallet_nonces;
drop table if exists public.wallets;
drop function if exists app.sync_wallet_verified();

alter table public.contracts
  drop column if exists client_wallet,
  drop column if exists freelancer_wallet,
  drop column if exists chain_id,
  drop column if exists escrow_address,
  drop column if exists escrow_key;

alter table public.disputes drop column if exists onchain_flagged_at;
alter table public.disputes drop constraint if exists disputes_settlement_status_check;
update public.disputes set settlement_status = case when settlement_status = 'settled' then 'settled' else 'pending' end;
alter table public.disputes alter column settlement_status set default 'pending';
alter table public.disputes add constraint disputes_settlement_status_check check (settlement_status in ('pending', 'settled'));

-- Identity (PAN + bank account) replaces the wallet as the verification signal.
alter table public.profile_stats rename column wallet_verified to identity_verified;
update public.profile_stats set identity_verified = false;

-- ---------------------------------------------------------------------------
-- 2. Currency: whole TrustLance Coins
-- ---------------------------------------------------------------------------
alter table public.projects drop constraint if exists projects_currency_check;
alter table public.proposals drop constraint if exists proposals_currency_check;
alter table public.contracts drop constraint if exists contracts_currency_check;
update public.projects set currency = 'COIN';
update public.proposals set currency = 'COIN';
update public.contracts set currency = 'COIN';
alter table public.projects alter column currency set default 'COIN';
alter table public.proposals alter column currency set default 'COIN';
alter table public.contracts alter column currency set default 'COIN';
alter table public.projects add constraint projects_currency_check check (currency = 'COIN');
alter table public.proposals add constraint proposals_currency_check check (currency = 'COIN');
alter table public.contracts add constraint contracts_currency_check check (currency = 'COIN');

-- Amounts are whole coins from now on (NOT VALID: earlier rows are left as they were).
alter table public.projects add constraint projects_budget_whole check (budget_amount = trunc(budget_amount)) not valid;
alter table public.proposals add constraint proposals_amount_whole check (amount = trunc(amount)) not valid;
alter table public.proposal_milestones add constraint proposal_milestones_amount_whole check (amount = trunc(amount)) not valid;
alter table public.contracts add constraint contracts_total_whole check (total_amount = trunc(total_amount)) not valid;
alter table public.milestones add constraint milestones_amount_whole check (amount = trunc(amount)) not valid;

-- The platform fee is fixed per contract when it is created (basis points: 1000 = 10%).
alter table public.contracts add column fee_bps int not null default 1000 check (fee_bps between 0 and 5000);
alter table public.milestones add column platform_fee numeric(38, 18);

-- ---------------------------------------------------------------------------
-- 3. Platform settings and working days
-- ---------------------------------------------------------------------------
create table public.platform_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value numeric not null,
  description text not null default ''
);
insert into public.platform_settings (key, value, description) values
  ('fee_bps',              1000,   'Platform fee on each milestone payment, in basis points (1000 = 10%).'),
  ('hold_working_days',    7,      'Working days a released payment is held before it can be withdrawn.'),
  ('auto_release_days',    7,      'Days after a submission with no client response before the milestone pays out automatically.'),
  ('min_milestone_coins',  100,    'Smallest milestone amount.'),
  ('min_purchase_coins',   100,    'Smallest coin purchase.'),
  ('max_purchase_coins',   500000, 'Largest single coin purchase.'),
  ('min_withdrawal_coins', 500,    'Smallest withdrawal.'),
  ('paise_per_coin',       100,    'Price of one coin in paise (100 = ₹1).');

create or replace function app.setting(p_key text)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v numeric;
begin
  select value into v from public.platform_settings where key = p_key;
  if v is null then
    raise exception 'missing platform setting %', p_key;
  end if;
  return v;
end;
$$;

-- Public holidays that do not count as working days (admins maintain this list).
create table public.holidays (
  day date primary key,
  label text not null check (char_length(label) between 2 and 80)
);

create or replace function app.add_working_days(p_from date, p_days int)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_day date := p_from;
  v_left int := greatest(p_days, 0);
begin
  while v_left > 0 loop
    v_day := v_day + 1;
    if extract(isodow from v_day) < 6 and not exists (select 1 from public.holidays where day = v_day) then
      v_left := v_left - 1;
    end if;
  end loop;
  return v_day;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The coin ledger
-- ---------------------------------------------------------------------------
create table public.coin_accounts (
  id bigint generated always as identity primary key,
  kind text not null
    check (kind in ('wallet', 'pending', 'earnings', 'escrow', 'platform_fees', 'payouts_in_transit', 'gateway')),
  user_id uuid references public.profiles (id),
  contract_id uuid references public.contracts (id),
  balance bigint not null default 0,
  created_at timestamptz not null default now(),
  constraint coin_accounts_owner check (
    (kind in ('wallet', 'pending', 'earnings') and user_id is not null and contract_id is null)
    or (kind = 'escrow' and contract_id is not null and user_id is null)
    or (kind in ('platform_fees', 'payouts_in_transit', 'gateway') and user_id is null and contract_id is null)
  ),
  constraint coin_accounts_no_overdraft check (kind = 'gateway' or balance >= 0)
);
create unique index coin_accounts_user_kind on public.coin_accounts (user_id, kind) where user_id is not null;
create unique index coin_accounts_contract on public.coin_accounts (contract_id) where contract_id is not null;
create unique index coin_accounts_system on public.coin_accounts (kind)
  where kind in ('platform_fees', 'payouts_in_transit', 'gateway');
insert into public.coin_accounts (kind) values ('platform_fees'), ('payouts_in_transit'), ('gateway');

create table public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('purchase', 'fund', 'release', 'refund', 'settlement', 'hold_release',
                                     'withdrawal', 'withdrawal_paid', 'withdrawal_returned')),
  memo text not null check (char_length(memo) <= 300),
  contract_id uuid references public.contracts (id),
  milestone_id uuid references public.milestones (id),
  purchase_id uuid,
  withdrawal_id uuid,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);
create index coin_transactions_contract_idx on public.coin_transactions (contract_id, created_at desc);

create table public.coin_entries (
  id bigint generated always as identity primary key,
  transaction_id uuid not null references public.coin_transactions (id),
  account_id bigint not null references public.coin_accounts (id),
  amount bigint not null check (amount <> 0),
  balance_after bigint not null,
  created_at timestamptz not null default now()
);
create index coin_entries_account_idx on public.coin_entries (account_id, id desc);
create index coin_entries_transaction_idx on public.coin_entries (transaction_id);

create trigger coin_transactions_immutable before update or delete on public.coin_transactions
  for each row execute function app.forbid_mutation();
create trigger coin_entries_immutable before update or delete on public.coin_entries
  for each row execute function app.forbid_mutation();

-- Released earnings waiting out the hold period.
create table public.coin_holds (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  contract_id uuid not null references public.contracts (id),
  milestone_id uuid not null references public.milestones (id),
  coins bigint not null check (coins > 0),
  available_on date not null,
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create index coin_holds_due_idx on public.coin_holds (available_on) where released_at is null;
create index coin_holds_user_idx on public.coin_holds (user_id, available_on);

-- Returns the account id, creating the account on first use.
create or replace function app.coin_account(p_kind text, p_user uuid default null, p_contract uuid default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
begin
  if p_kind in ('wallet', 'pending', 'earnings') then
    select id into v_id from public.coin_accounts where user_id = p_user and kind = p_kind;
    if v_id is null then
      insert into public.coin_accounts (kind, user_id) values (p_kind, p_user)
      on conflict (user_id, kind) where user_id is not null do nothing;
      select id into v_id from public.coin_accounts where user_id = p_user and kind = p_kind;
    end if;
  elsif p_kind = 'escrow' then
    select id into v_id from public.coin_accounts where contract_id = p_contract;
    if v_id is null then
      insert into public.coin_accounts (kind, contract_id) values ('escrow', p_contract)
      on conflict (contract_id) where contract_id is not null do nothing;
      select id into v_id from public.coin_accounts where contract_id = p_contract;
    end if;
  else
    select id into v_id from public.coin_accounts where kind = p_kind and user_id is null and contract_id is null;
  end if;
  return v_id;
end;
$$;

create or replace function app.coin_balance(p_kind text, p_user uuid default null, p_contract uuid default null)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select balance from public.coin_accounts
                    where kind = p_kind
                      and user_id is not distinct from p_user
                      and contract_id is not distinct from p_contract), 0)
$$;

create or replace function app.new_coin_txn(p_kind text, p_memo text, p_contract uuid default null,
                                            p_milestone uuid default null, p_purchase uuid default null,
                                            p_withdrawal uuid default null)
returns uuid
language sql
security definer
set search_path = ''
as $$
  insert into public.coin_transactions (kind, memo, contract_id, milestone_id, purchase_id, withdrawal_id, actor_id)
  values (p_kind, left(p_memo, 300), p_contract, p_milestone, p_purchase, p_withdrawal, auth.uid())
  returning id
$$;

-- Moves coins between two accounts as one balanced pair of entries. Never overdraws a user account.
create or replace function app.move_coins(p_txn uuid, p_from bigint, p_to bigint, p_amount bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.coin_accounts;
  v_to_balance bigint;
begin
  if p_amount = 0 then
    return;
  end if;
  if p_amount < 0 or p_from = p_to then
    raise exception 'invalid coin movement';
  end if;
  -- Lock both accounts in id order so concurrent movements cannot deadlock.
  perform 1 from public.coin_accounts where id in (p_from, p_to) order by id for update;
  select * into v_from from public.coin_accounts where id = p_from;
  if v_from.kind <> 'gateway' and v_from.balance < p_amount then
    perform app.fail('insufficient_coins', 'There are not enough coins for this.');
  end if;
  update public.coin_accounts set balance = balance - p_amount where id = p_from;
  update public.coin_accounts set balance = balance + p_amount where id = p_to returning balance into v_to_balance;
  insert into public.coin_entries (transaction_id, account_id, amount, balance_after)
  values (p_txn, p_from, -p_amount, v_from.balance - p_amount),
         (p_txn, p_to, p_amount, v_to_balance);
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Buying coins (the server creates the provider order and reports the verified payment)
-- ---------------------------------------------------------------------------
create table public.coin_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  coins bigint not null check (coins > 0),
  amount_paise bigint not null check (amount_paise > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  provider text not null check (provider in ('mock', 'razorpay')),
  provider_order_id text unique check (char_length(provider_order_id) <= 100),
  provider_payment_id text unique check (char_length(provider_payment_id) <= 100),
  status text not null default 'created' check (status in ('created', 'paid', 'failed')),
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index coin_purchases_user_idx on public.coin_purchases (user_id, created_at desc);

create or replace function public.create_coin_purchase(p_user uuid, p_coins bigint, p_provider text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_paise bigint;
begin
  perform app.rate_limit('coin_purchase', 20, 3600, p_user::text);
  if p_coins is null or p_coins < app.setting('min_purchase_coins') or p_coins > app.setting('max_purchase_coins') then
    perform app.fail('validation', 'Buy between ' || app.setting('min_purchase_coins')::bigint || ' and '
                                   || app.setting('max_purchase_coins')::bigint || ' coins at a time.');
  end if;
  v_paise := p_coins * app.setting('paise_per_coin')::bigint;
  insert into public.coin_purchases (user_id, coins, amount_paise, provider)
  values (p_user, p_coins, v_paise, p_provider)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'coins', p_coins, 'amount_paise', v_paise);
end;
$$;

create or replace function public.attach_coin_purchase_order(p_purchase_id uuid, p_order_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.coin_purchases set provider_order_id = p_order_id
   where id = p_purchase_id and status = 'created' and provider_order_id is null;
  if not found then
    perform app.fail('invalid_state', 'This purchase cannot take a payment order.');
  end if;
end;
$$;

-- Idempotent: the browser callback and the provider webhook may both report the same payment.
create or replace function public.complete_coin_purchase(p_order_id text, p_payment_id text, p_amount_paise bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_p public.coin_purchases;
  v_txn uuid;
begin
  select * into v_p from public.coin_purchases where provider_order_id = p_order_id for update;
  if not found then
    perform app.fail('not_found', 'Purchase not found.');
  end if;
  if v_p.status = 'paid' then
    return 'paid';
  end if;
  if p_amount_paise <> v_p.amount_paise then
    update public.coin_purchases set status = 'failed', failure_reason = 'Paid amount does not match the order.'
     where id = v_p.id;
    return 'failed';
  end if;
  update public.coin_purchases set status = 'paid', provider_payment_id = p_payment_id, paid_at = now(), failure_reason = null
   where id = v_p.id;
  v_txn := app.new_coin_txn('purchase', 'Bought ' || v_p.coins || ' coins', null, null, v_p.id);
  perform app.move_coins(v_txn, app.coin_account('gateway'), app.coin_account('wallet', v_p.user_id), v_p.coins);
  perform app.notify(v_p.user_id, 'payments', 'coins.purchased', v_p.coins || ' coins added',
                     'Your payment was received and the coins are in your wallet.', '/wallet', 'success', v_p.id);
  return 'paid';
end;
$$;

create or replace function public.fail_coin_purchase(p_order_id text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.coin_purchases set status = 'failed', failure_reason = left(p_reason, 300)
   where provider_order_id = p_order_id and status = 'created';
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Marketplace functions, redefined for coins
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
  v_balance bigint;
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
  if v_p.budget_amount <> trunc(v_p.budget_amount) or v_p.budget_amount < app.setting('min_milestone_coins') then
    perform app.fail('validation', 'The budget must be a whole number of coins, at least '
                                   || app.setting('min_milestone_coins')::bigint || '.');
  end if;
  if v_p.due_date is not null and v_p.due_date < current_date then
    perform app.fail('validation', 'The due date is in the past.');
  end if;
  if jsonb_array_length(v_p.milestone_plan) > 0 then
    select coalesce(sum((m ->> 'amount')::numeric), 0),
           count(*) filter (where char_length(btrim(coalesce(m ->> 'title', ''))) < 3
                               or coalesce((m ->> 'amount')::numeric, 0) < app.setting('min_milestone_coins')
                               or (m ->> 'amount')::numeric <> trunc((m ->> 'amount')::numeric))
      into v_plan_sum, v_plan_bad
      from jsonb_array_elements(v_p.milestone_plan) m;
    if v_plan_bad > 0 then
      perform app.fail('validation', 'Every milestone needs a title and a whole number of coins (at least '
                                     || app.setting('min_milestone_coins')::bigint || ').');
    end if;
    if v_plan_sum <> v_p.budget_amount then
      perform app.fail('validation', 'Milestone amounts must add up to the budget.');
    end if;
  end if;
  -- Clients post only with the coins to back the budget already in their wallet.
  v_balance := app.coin_balance('wallet', v_uid);
  if v_balance < v_p.budget_amount then
    perform app.fail('insufficient_coins', 'You need ' || (v_p.budget_amount::bigint - v_balance)
                                           || ' more coins to post this project. Buy coins first.');
  end if;

  update public.projects set status = 'open', published_at = now(), draft_step = 9 where id = p_project_id;
end;
$$;

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
  v_min numeric := app.setting('min_milestone_coins');
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
  if p_amount is null or p_amount <= 0 or p_amount <> trunc(p_amount) then
    perform app.fail('validation', 'Enter a whole number of coins.');
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
                             or coalesce((m ->> 'amount')::numeric, 0) < v_min
                             or (m ->> 'amount')::numeric <> trunc((m ->> 'amount')::numeric)
                             or coalesce((m ->> 'due_in_days')::int, 0) not between 1 and p_duration_days)
    into v_sum, v_bad
    from jsonb_array_elements(p_milestones) m;
  if v_bad > 0 then
    perform app.fail('validation', 'Each milestone needs a title, at least ' || v_min::bigint
                                   || ' whole coins and a due day within the proposal duration.');
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
                     coalesce(v_name, 'A freelancer') || ' proposed ' || app.fmt_amount(p_amount) || ' coins over '
                       || p_duration_days || ' days.',
                     '/projects/' || p_project_id || '/proposals', 'info', v_id);
  return v_id;
end;
$$;

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
  v_fee int := app.setting('fee_bps')::int;
  v_hold int := app.setting('hold_working_days')::int;
  v_auto int := app.setting('auto_release_days')::int;
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
    'version', 2,
    'project', jsonb_build_object('id', v_p.id, 'title', v_p.title),
    'scope', v_p.description,
    'deliverables', to_jsonb(v_p.deliverables),
    'client', jsonb_build_object('id', v_client.id, 'name', v_client.display_name, 'username', v_client.username),
    'freelancer', jsonb_build_object('id', v_free.id, 'name', v_free.display_name, 'username', v_free.username),
    'currency', 'COIN',
    'total_amount', v_pr.amount::bigint::text,
    'duration_days', v_pr.duration_days,
    'platform_fee_pct', trim_scale(round(v_fee / 100.0, 2))::text,
    'milestones', (select jsonb_agg(jsonb_build_object('position', position, 'title', title, 'description', description,
                                                       'amount', amount::bigint::text, 'due_in_days', due_in_days) order by position)
                     from public.proposal_milestones where proposal_id = p_proposal_id),
    'payment_terms', 'Amounts are in TrustLance Coins (1 coin = ₹1). The client locks the full amount in TrustLance escrow before work starts. '
                     || 'Each milestone is paid to the freelancer when the client releases it, less a ' || trim_scale(round(v_fee / 100.0, 2))
                     || '% platform fee. If the client does not respond to a submitted milestone within ' || v_auto
                     || ' days, it is released automatically. Released payments can be withdrawn to the freelancer''s verified bank account after '
                     || v_hold || ' working days. Disputed milestones are frozen and settled by an independent arbitrator''s decision.'
  );

  insert into public.contracts (project_id, proposal_id, client_id, freelancer_id, title, scope, deliverables,
                                total_amount, terms, terms_hash, fee_bps)
  values (v_p.id, p_proposal_id, v_p.client_id, v_pr.freelancer_id, v_p.title, v_p.description, v_p.deliverables,
          v_pr.amount, v_terms, encode(extensions.digest(convert_to(v_terms::text, 'UTF8'), 'sha256'), 'hex'), v_fee)
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
    jsonb_build_object('proposal_id', p_proposal_id, 'total_amount', v_pr.amount::bigint::text));
  perform app.notify(v_pr.freelancer_id, 'contracts', 'contract.offered', 'You''re hired: ' || v_p.title,
                     'Review and sign the contract so the client can lock the coins in escrow.', '/contracts/' || v_contract,
                     'success', v_contract);
  return v_contract;
end;
$$;

create or replace function public.sign_contract(p_contract_id uuid, p_full_name text, p_terms_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
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

  if v_uid = v_c.client_id then
    if v_c.client_signed_at is not null then
      perform app.fail('already_signed', 'You have already signed this contract.');
    end if;
    update public.contracts set client_signed_at = now(), client_signature_name = v_name
     where id = p_contract_id returning * into v_c;
    v_role := 'client';
    v_other := v_c.freelancer_id;
  else
    if v_c.freelancer_signed_at is not null then
      perform app.fail('already_signed', 'You have already signed this contract.');
    end if;
    update public.contracts set freelancer_signed_at = now(), freelancer_signature_name = v_name
     where id = p_contract_id returning * into v_c;
    v_role := 'freelancer';
    v_other := v_c.client_id;
  end if;

  perform app.log_contract_event(p_contract_id, 'contract.signed',
    jsonb_build_object('role', v_role, 'name', v_name, 'terms_hash', v_c.terms_hash));

  if v_c.client_signed_at is not null and v_c.freelancer_signed_at is not null then
    update public.contracts set status = 'awaiting_funding' where id = p_contract_id;
    perform app.log_contract_event(p_contract_id, 'contract.awaiting_funding', '{}'::jsonb, null);
    perform app.notify(v_c.client_id, 'payments', 'contract.fund', 'Lock coins to start: ' || v_c.title,
                       'Both parties signed. Lock ' || app.fmt_amount(v_c.total_amount)
                         || ' coins in escrow so work can begin.',
                       '/contracts/' || p_contract_id, 'warning', p_contract_id);
    if v_role = 'client' then
      perform app.notify(v_c.freelancer_id, 'contracts', 'contract.signed', 'Contract signed by both parties',
                         'Waiting for the client to lock the coins. Do not start work until escrow is funded.',
                         '/contracts/' || p_contract_id, 'info', p_contract_id);
    end if;
    return 'awaiting_funding';
  end if;

  perform app.notify(v_other, 'contracts', 'contract.signed', v_name || ' signed the contract',
                     'Review and sign: ' || v_c.title, '/contracts/' || p_contract_id, 'info', p_contract_id);
  return 'pending_signatures';
end;
$$;

create or replace function public.cancel_contract(p_contract_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
begin
  select * into v_c from public.contracts where id = p_contract_id for update;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.status not in ('pending_signatures', 'awaiting_funding') then
    perform app.fail('invalid_state', 'Funded contracts cannot be cancelled. Use a refund or a dispute instead.');
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
-- 7. Escrow: lock, release, refund, settle
-- ---------------------------------------------------------------------------
-- The client locks the whole contract total from their wallet. Safe to call twice.
create or replace function public.fund_contract(p_contract_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_c public.contracts;
  v_total bigint;
  v_balance bigint;
  v_txn uuid;
begin
  select * into v_c from public.contracts where id = p_contract_id for update;
  if not found or (v_c.client_id <> v_uid and v_c.freelancer_id <> v_uid) then
    perform app.fail('not_found', 'Contract not found.');
  end if;
  if v_c.client_id <> v_uid then
    perform app.fail('forbidden', 'Only the client can fund this contract.');
  end if;
  if v_c.funded_at is not null then
    return v_c.status;
  end if;
  if v_c.status <> 'awaiting_funding' then
    perform app.fail('invalid_state', 'This contract is not waiting for funding.');
  end if;
  v_total := v_c.total_amount::bigint;
  v_balance := app.coin_balance('wallet', v_uid);
  if v_balance < v_total then
    perform app.fail('insufficient_coins', 'You need ' || (v_total - v_balance) || ' more coins to fund this contract.');
  end if;

  v_txn := app.new_coin_txn('fund', 'Locked in escrow: ' || v_c.title, v_c.id);
  perform app.move_coins(v_txn, app.coin_account('wallet', v_uid), app.coin_account('escrow', null, v_c.id), v_total);

  update public.contracts set status = 'active', funded_at = now() where id = v_c.id;
  update public.milestones set status = 'funded', due_date = current_date + due_in_days
   where contract_id = v_c.id and status = 'pending';
  update public.profile_stats set funded_as_client = funded_as_client + 1, updated_at = now() where id = v_c.client_id;
  perform app.log_contract_event(v_c.id, 'escrow.funded', jsonb_build_object('amount', v_total::text));
  perform app.notify(v_c.freelancer_id, 'payments', 'escrow.funded', 'Escrow funded — you can start work',
                     v_total || ' coins are locked in escrow for ' || v_c.title || '.',
                     '/contracts/' || v_c.id, 'success', v_c.id);
  return 'active';
end;
$$;

-- Pays a milestone out of escrow: the freelancer's share (less the platform fee) goes on hold,
-- the client's share goes back to their wallet. Callers check permissions and state first.
create or replace function app.settle_milestone(p_milestone uuid, p_freelancer bigint, p_client bigint,
                                                p_status text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m public.milestones;
  v_c public.contracts;
  v_escrow bigint;
  v_fee bigint;
  v_net bigint;
  v_txn uuid;
  v_available date;
begin
  select * into v_m from public.milestones where id = p_milestone for update;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if p_freelancer < 0 or p_client < 0 or p_freelancer + p_client <> v_m.amount::bigint then
    raise exception 'settlement does not match the milestone amount';
  end if;
  v_fee := (p_freelancer * v_c.fee_bps) / 10000;
  v_net := p_freelancer - v_fee;
  v_escrow := app.coin_account('escrow', null, v_c.id);
  v_txn := app.new_coin_txn(p_kind, 'Milestone ' || v_m.position || ': ' || v_m.title, v_c.id, v_m.id);
  perform app.move_coins(v_txn, v_escrow, app.coin_account('platform_fees'), v_fee);
  perform app.move_coins(v_txn, v_escrow, app.coin_account('pending', v_c.freelancer_id), v_net);
  perform app.move_coins(v_txn, v_escrow, app.coin_account('wallet', v_c.client_id), p_client);
  if v_net > 0 then
    v_available := app.add_working_days(current_date, app.setting('hold_working_days')::int);
    insert into public.coin_holds (user_id, contract_id, milestone_id, coins, available_on)
    values (v_c.freelancer_id, v_c.id, v_m.id, v_net, v_available);
  end if;
  update public.milestones
     set status = p_status, freelancer_payout = p_freelancer, client_refund = p_client, platform_fee = v_fee,
         paid_at = case when p_freelancer > 0 then now() end
   where id = v_m.id;
  return jsonb_build_object('freelancer_amount', p_freelancer, 'client_amount', p_client, 'fee', v_fee,
                            'net', v_net, 'available_on', v_available);
end;
$$;

-- Full payment of one milestone to the freelancer. p_actor null = automatic release.
create or replace function app.release_milestone(p_milestone uuid, p_actor uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_m public.milestones;
  v_c public.contracts;
  v_result jsonb;
begin
  select * into v_m from public.milestones where id = p_milestone for update;
  select * into v_c from public.contracts where id = v_m.contract_id for update;
  if v_c.status not in ('active', 'disputed') then
    perform app.fail('invalid_state', 'Coins can be released only on a funded contract.');
  end if;
  if v_m.status not in ('funded', 'submitted', 'revision_requested', 'approved') then
    perform app.fail('invalid_state', 'This milestone cannot be released in its current state.');
  end if;
  update public.milestone_submissions
     set review_status = 'approved', reviewed_at = now(), reviewed_by = coalesce(p_actor, v_c.client_id)
   where milestone_id = v_m.id and review_status = 'pending';
  update public.milestones set approved_at = coalesce(approved_at, now()) where id = v_m.id;
  v_result := app.settle_milestone(v_m.id, v_m.amount::bigint, 0, 'paid', 'release');

  perform app.log_contract_event(v_c.id, case when p_actor is null then 'milestone.auto_released' else 'milestone.paid' end,
    jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position, 'amount', v_m.amount::bigint::text,
                       'fee', (v_result ->> 'fee'), 'available_on', (v_result ->> 'available_on')), p_actor);
  perform app.notify(v_c.freelancer_id, 'payments', 'milestone.paid', 'Payment released: ' || v_m.title,
                     (v_result ->> 'net') || ' coins (after the platform fee) can be withdrawn from '
                       || to_char((v_result ->> 'available_on')::date, 'DD Mon YYYY') || '.',
                     '/wallet', 'success', v_c.id);
  if p_actor is null then
    perform app.notify(v_c.client_id, 'payments', 'milestone.auto_released', 'Released automatically: ' || v_m.title,
                       'The submission had no response for ' || app.setting('auto_release_days')::int
                         || ' days, so the milestone was paid as the contract terms say.',
                       '/contracts/' || v_c.id, 'info', v_c.id);
  end if;
  perform app.maybe_complete_contract(v_c.id);
  return v_result || jsonb_build_object('contract_id', v_c.id, 'position', v_m.position);
end;
$$;

create or replace function public.release_milestone(p_milestone_id uuid)
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
  select * into v_m from public.milestones where id = p_milestone_id;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if v_c.client_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_m.status = 'paid' then
    return jsonb_build_object('contract_id', v_c.id, 'position', v_m.position, 'already_paid', true);
  end if;
  return app.release_milestone(p_milestone_id, v_uid);
end;
$$;

-- Approving submitted work pays it.
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
  select * into v_m from public.milestones where id = p_milestone_id;
  if not found then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  select * into v_c from public.contracts where id = v_m.contract_id;
  if v_c.client_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_m.status = 'paid' then
    return jsonb_build_object('contract_id', v_c.id, 'position', v_m.position, 'already_paid', true);
  end if;
  if v_m.status not in ('submitted', 'approved') then
    perform app.fail('invalid_state', 'Only submitted work can be approved.');
  end if;
  perform app.log_contract_event(v_c.id, 'milestone.approved', jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position));
  return app.release_milestone(p_milestone_id, v_uid);
end;
$$;

-- The freelancer returns a milestone's coins to the client.
create or replace function public.refund_milestone(p_milestone_id uuid)
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
  select * into v_c from public.contracts where id = v_m.contract_id for update;
  if v_c.freelancer_id <> v_uid and v_c.client_id <> v_uid then
    perform app.fail('not_found', 'Milestone not found.');
  end if;
  if v_c.freelancer_id <> v_uid then
    perform app.fail('forbidden', 'Only the freelancer can return milestone coins.');
  end if;
  if v_c.status not in ('active', 'disputed') or v_m.status not in ('funded', 'submitted', 'revision_requested', 'approved') then
    perform app.fail('invalid_state', 'This milestone cannot be refunded in its current state.');
  end if;
  perform app.settle_milestone(v_m.id, 0, v_m.amount::bigint, 'refunded', 'refund');
  perform app.log_contract_event(v_c.id, 'milestone.refunded',
    jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position, 'amount', v_m.amount::bigint::text));
  perform app.notify(v_c.client_id, 'payments', 'milestone.refunded', 'Milestone refunded: ' || v_m.title,
                     v_m.amount::bigint || ' coins were returned to your wallet.', '/contracts/' || v_c.id, 'info', v_c.id);
  perform app.maybe_complete_contract(v_c.id);
end;
$$;

-- Arbitrator decisions now settle immediately.
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
  v_m public.milestones;
  v_pct int;
  v_summary text;
  v_loser uuid;
  v_amount bigint;
  v_freelancer bigint;
  v_client bigint;
  v_result jsonb;
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
  select * into v_c from public.contracts where id = v_d.contract_id for update;
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
  select * into v_m from public.milestones where id = v_d.milestone_id for update;
  if v_m.status <> 'disputed' then
    perform app.fail('invalid_state', 'The disputed milestone is no longer frozen.');
  end if;

  update public.disputes
     set status = 'resolved', decision = p_decision, freelancer_pct = v_pct, decision_reason = btrim(p_reason),
         decided_by = v_uid, decided_at = now()
   where id = p_dispute_id;

  v_amount := v_m.amount::bigint;
  v_freelancer := (v_amount * v_pct) / 100;
  v_client := v_amount - v_freelancer;
  v_result := app.settle_milestone(v_m.id, v_freelancer, v_client,
                                   case when v_pct = 100 then 'paid' when v_pct = 0 then 'refunded' else 'settled' end,
                                   'settlement');
  update public.disputes set settlement_status = 'settled', settled_at = now() where id = p_dispute_id;

  v_summary := case p_decision when 'freelancer' then 'Full payment to the freelancer'
                               when 'client' then 'Full refund to the client'
                               else v_pct || '% to the freelancer, ' || (100 - v_pct) || '% refunded to the client' end;
  perform app.log_dispute_event(p_dispute_id, 'dispute.decided',
    jsonb_build_object('decision', p_decision, 'freelancer_pct', v_pct, 'by_admin', v_d.arbitrator_id is distinct from v_uid));
  perform app.log_dispute_event(p_dispute_id, 'dispute.settled',
    jsonb_build_object('freelancer_amount', v_freelancer::text, 'client_amount', v_client::text, 'fee', v_result ->> 'fee'), null);
  perform app.log_contract_event(v_c.id, 'dispute.decided',
    jsonb_build_object('dispute_id', p_dispute_id, 'decision', p_decision, 'freelancer_pct', v_pct));
  perform app.log_contract_event(v_c.id, 'milestone.settled',
    jsonb_build_object('milestone_id', v_m.id, 'position', v_m.position, 'freelancer_amount', v_freelancer::text,
                       'client_amount', v_client::text), null);
  insert into public.dispute_messages (dispute_id, kind, body)
  values (p_dispute_id, 'system', 'Decision: ' || v_summary || '. The coins were settled: ' || v_freelancer
                                  || ' to the freelancer, ' || v_client || ' back to the client.');

  v_loser := case p_decision when 'freelancer' then v_c.client_id when 'client' then v_c.freelancer_id end;
  if v_loser is not null then
    update public.profile_stats set disputes_lost = disputes_lost + 1, updated_at = now() where id = v_loser;
    perform app.award_trust_credits(v_loser, 'dispute_lost', v_c.id, -20);
  end if;

  perform app.notify(v_c.client_id, 'disputes', 'dispute.decided', 'Dispute decided: ' || v_c.title,
                     v_summary || '. ' || v_client || ' coins were returned to your wallet.',
                     '/disputes/' || p_dispute_id, 'critical', p_dispute_id);
  perform app.notify(v_c.freelancer_id, 'disputes', 'dispute.decided', 'Dispute decided: ' || v_c.title,
                     v_summary || '. ' || (v_result ->> 'net') || ' coins (after the platform fee) were credited to your earnings.',
                     '/disputes/' || p_dispute_id, 'critical', p_dispute_id);
  perform app.maybe_complete_contract(v_c.id);
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Hold period and automatic release
-- ---------------------------------------------------------------------------
-- Moves every hold that has reached its date from pending to withdrawable earnings.
create or replace function app.release_holds(p_user uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_h record;
  v_txn uuid;
  v_count int := 0;
begin
  for v_h in
    select h.*, c.title from public.coin_holds h join public.contracts c on c.id = h.contract_id
     where h.released_at is null and h.available_on <= current_date and (p_user is null or h.user_id = p_user)
     order by h.available_on
     for update of h skip locked
  loop
    v_txn := app.new_coin_txn('hold_release', 'Now withdrawable: ' || v_h.title, v_h.contract_id, v_h.milestone_id);
    perform app.move_coins(v_txn, app.coin_account('pending', v_h.user_id), app.coin_account('earnings', v_h.user_id), v_h.coins);
    update public.coin_holds set released_at = now() where id = v_h.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function app.auto_release_due()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count int := 0;
begin
  for v_id in
    select m.id from public.milestones m join public.contracts c on c.id = m.contract_id
     where m.status = 'submitted' and c.status in ('active', 'disputed')
       and m.submitted_at <= now() - make_interval(days => app.setting('auto_release_days')::int)
  loop
    perform app.release_milestone(v_id, null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- Scheduled job entry point (server cron route).
create or replace function public.run_coin_jobs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_auto int;
  v_holds int;
begin
  v_auto := app.auto_release_due();
  v_holds := app.release_holds(null);
  return jsonb_build_object('auto_released', v_auto, 'holds_released', v_holds);
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Bank accounts and withdrawals
-- ---------------------------------------------------------------------------
create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  account_holder text not null check (char_length(account_holder) between 2 and 100),
  account_number text not null check (account_number ~ '^[0-9]{9,18}$'),
  account_last4 text generated always as (right(account_number, 4)) stored,
  ifsc text not null check (ifsc ~ '^[A-Z]{4}0[A-Z0-9]{6}$'),
  pan text not null check (pan ~ '^[A-Z]{5}[0-9]{4}[A-Z]$'),
  pan_last4 text generated always as (right(pan, 4)) stored,
  status text not null default 'pending' check (status in ('pending', 'verified', 'rejected')),
  review_note text check (char_length(review_note) <= 500),
  reviewed_by uuid references public.profiles (id),
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger payout_accounts_touch before update on public.payout_accounts
  for each row execute function app.touch_updated_at();

create table public.withdrawals (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity unique,
  user_id uuid not null references public.profiles (id),
  coins bigint not null check (coins > 0),
  amount_paise bigint not null check (amount_paise > 0),
  account_holder text not null,
  account_last4 text not null,
  ifsc text not null,
  status text not null default 'requested' check (status in ('requested', 'paid', 'failed', 'cancelled')),
  reference text check (char_length(reference) <= 100),
  failure_reason text check (char_length(failure_reason) <= 500),
  decided_by uuid references public.profiles (id),
  requested_at timestamptz not null default now(),
  decided_at timestamptz
);
create index withdrawals_user_idx on public.withdrawals (user_id, requested_at desc);
create index withdrawals_open_idx on public.withdrawals (requested_at) where status = 'requested';

create or replace function public.save_payout_account(p_holder text, p_account_number text, p_ifsc text, p_pan text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_number text := regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g');
  v_ifsc text := upper(btrim(coalesce(p_ifsc, '')));
  v_pan text := upper(btrim(coalesce(p_pan, '')));
  v_admin record;
begin
  perform app.rate_limit('payout_account', 5, 3600);
  if char_length(btrim(coalesce(p_holder, ''))) not between 2 and 100 then
    perform app.fail('validation', 'Enter the account holder''s name as the bank has it.');
  end if;
  if v_number !~ '^[0-9]{9,18}$' then
    perform app.fail('validation', 'Enter a bank account number of 9 to 18 digits.');
  end if;
  if v_ifsc !~ '^[A-Z]{4}0[A-Z0-9]{6}$' then
    perform app.fail('validation', 'Enter a valid IFSC code, like HDFC0001234.');
  end if;
  if v_pan !~ '^[A-Z]{5}[0-9]{4}[A-Z]$' then
    perform app.fail('validation', 'Enter a valid PAN, like ABCDE1234F.');
  end if;
  if exists (select 1 from public.withdrawals where user_id = v_uid and status = 'requested') then
    perform app.fail('invalid_state', 'Wait for your open withdrawal to finish before changing your bank account.');
  end if;
  insert into public.payout_accounts (user_id, account_holder, account_number, ifsc, pan)
  values (v_uid, btrim(p_holder), v_number, v_ifsc, v_pan)
  on conflict (user_id) do update
    set account_holder = excluded.account_holder, account_number = excluded.account_number, ifsc = excluded.ifsc,
        pan = excluded.pan, status = 'pending', review_note = null, reviewed_by = null, verified_at = null;
  update public.profile_stats set identity_verified = false, updated_at = now() where id = v_uid;
  for v_admin in select user_id from public.platform_admins loop
    perform app.notify(v_admin.user_id, 'system', 'payout_account.submitted', 'Bank account to verify',
                       'A member submitted bank and PAN details for verification.', '/admin', 'info', v_uid);
  end loop;
end;
$$;

create or replace function public.admin_review_payout_account(p_user uuid, p_approve boolean, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Only platform admins can verify bank accounts.');
  end if;
  if v_uid = p_user then
    perform app.fail('forbidden', 'You cannot verify your own bank account.');
  end if;
  if not p_approve and char_length(btrim(coalesce(p_note, ''))) < 10 then
    perform app.fail('validation', 'Tell the member what is wrong (at least 10 characters).');
  end if;
  update public.payout_accounts
     set status = case when p_approve then 'verified' else 'rejected' end,
         review_note = nullif(btrim(coalesce(p_note, '')), ''), reviewed_by = v_uid,
         verified_at = case when p_approve then now() end
   where user_id = p_user and status = 'pending';
  if not found then
    perform app.fail('invalid_state', 'There is no bank account waiting for review.');
  end if;
  update public.profile_stats set identity_verified = p_approve, updated_at = now() where id = p_user;
  perform app.notify(p_user, 'security', 'payout_account.reviewed',
                     case when p_approve then 'Bank account verified' else 'Bank account not verified' end,
                     case when p_approve then 'You can now withdraw your earnings.' else btrim(p_note) end,
                     '/wallet', case when p_approve then 'success' else 'warning' end, null);
end;
$$;

create or replace function public.request_withdrawal(p_coins bigint, p_idempotency_key text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_prior jsonb;
  v_acct public.payout_accounts;
  v_balance bigint;
  v_id uuid;
  v_number bigint;
  v_txn uuid;
  v_admin record;
begin
  v_prior := app.idempotent_result(p_idempotency_key, 'request_withdrawal');
  if v_prior is not null then
    return (v_prior ->> 'withdrawal_id')::uuid;
  end if;
  perform app.rate_limit('request_withdrawal', 5, 3600);
  perform app.release_holds(v_uid);
  select * into v_acct from public.payout_accounts where user_id = v_uid;
  if not found or v_acct.status <> 'verified' then
    perform app.fail('payout_account_required', 'Add a bank account and wait for it to be verified before withdrawing.');
  end if;
  if p_coins is null or p_coins < app.setting('min_withdrawal_coins') then
    perform app.fail('validation', 'The smallest withdrawal is ' || app.setting('min_withdrawal_coins')::bigint || ' coins.');
  end if;
  v_balance := app.coin_balance('earnings', v_uid);
  if v_balance < p_coins then
    perform app.fail('insufficient_coins', 'You can withdraw up to ' || v_balance || ' coins right now.');
  end if;

  insert into public.withdrawals (user_id, coins, amount_paise, account_holder, account_last4, ifsc)
  values (v_uid, p_coins, p_coins * app.setting('paise_per_coin')::bigint, v_acct.account_holder, v_acct.account_last4, v_acct.ifsc)
  returning id, number into v_id, v_number;
  v_txn := app.new_coin_txn('withdrawal', 'Withdrawal WD-' || lpad(v_number::text, 6, '0') || ' to bank ••' || v_acct.account_last4,
                            null, null, null, v_id);
  perform app.move_coins(v_txn, app.coin_account('earnings', v_uid), app.coin_account('payouts_in_transit'), p_coins);
  for v_admin in select user_id from public.platform_admins loop
    perform app.notify(v_admin.user_id, 'payments', 'withdrawal.requested', 'Withdrawal to pay: WD-' || lpad(v_number::text, 6, '0'),
                       p_coins || ' coins to bank ••' || v_acct.account_last4 || '.', '/admin', 'warning', v_id);
  end loop;
  perform app.remember_result(p_idempotency_key, 'request_withdrawal', jsonb_build_object('withdrawal_id', v_id));
  return v_id;
end;
$$;

-- Returns a requested withdrawal's coins to the member's earnings.
create or replace function app.return_withdrawal(p_w public.withdrawals, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_txn uuid;
begin
  update public.withdrawals set status = p_status, failure_reason = p_reason, decided_at = now(), decided_by = auth.uid()
   where id = p_w.id;
  v_txn := app.new_coin_txn('withdrawal_returned', 'Returned: withdrawal WD-' || lpad(p_w.number::text, 6, '0'),
                            null, null, null, p_w.id);
  perform app.move_coins(v_txn, app.coin_account('payouts_in_transit'), app.coin_account('earnings', p_w.user_id), p_w.coins);
end;
$$;

create or replace function public.cancel_withdrawal(p_withdrawal_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_w public.withdrawals;
begin
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found or v_w.user_id <> v_uid then
    perform app.fail('not_found', 'Withdrawal not found.');
  end if;
  if v_w.status <> 'requested' then
    perform app.fail('invalid_state', 'This withdrawal is already being processed.');
  end if;
  perform app.return_withdrawal(v_w, 'cancelled', null);
end;
$$;

create or replace function public.admin_complete_withdrawal(p_withdrawal_id uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_w public.withdrawals;
  v_txn uuid;
begin
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Only platform admins can mark withdrawals as paid.');
  end if;
  if char_length(btrim(coalesce(p_reference, ''))) < 4 then
    perform app.fail('validation', 'Enter the bank transfer reference (UTR).');
  end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    perform app.fail('not_found', 'Withdrawal not found.');
  end if;
  if v_w.user_id = v_uid then
    perform app.fail('forbidden', 'You cannot approve your own withdrawal.');
  end if;
  if v_w.status <> 'requested' then
    perform app.fail('invalid_state', 'This withdrawal is not waiting to be paid.');
  end if;
  update public.withdrawals set status = 'paid', reference = btrim(p_reference), decided_at = now(), decided_by = v_uid
   where id = v_w.id;
  v_txn := app.new_coin_txn('withdrawal_paid', 'Paid to bank: WD-' || lpad(v_w.number::text, 6, '0'), null, null, null, v_w.id);
  perform app.move_coins(v_txn, app.coin_account('payouts_in_transit'), app.coin_account('gateway'), v_w.coins);
  perform app.notify(v_w.user_id, 'payments', 'withdrawal.paid', 'Withdrawal paid',
                     '₹' || (v_w.amount_paise / 100) || ' was sent to your bank account ••' || v_w.account_last4
                       || ' (reference ' || btrim(p_reference) || ').', '/wallet', 'success', v_w.id);
end;
$$;

create or replace function public.admin_fail_withdrawal(p_withdrawal_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
  v_w public.withdrawals;
begin
  if not app.is_admin(v_uid) then
    perform app.fail('forbidden', 'Only platform admins can reject withdrawals.');
  end if;
  if char_length(btrim(coalesce(p_reason, ''))) < 10 then
    perform app.fail('validation', 'Tell the member why (at least 10 characters).');
  end if;
  select * into v_w from public.withdrawals where id = p_withdrawal_id for update;
  if not found then
    perform app.fail('not_found', 'Withdrawal not found.');
  end if;
  if v_w.status <> 'requested' then
    perform app.fail('invalid_state', 'This withdrawal is not waiting to be paid.');
  end if;
  perform app.return_withdrawal(v_w, 'failed', btrim(p_reason));
  perform app.notify(v_w.user_id, 'payments', 'withdrawal.failed', 'Withdrawal not completed',
                     btrim(p_reason) || ' The coins are back in your earnings.', '/wallet', 'warning', v_w.id);
end;
$$;

-- Admin queue with the full bank details needed to make the transfer.
create or replace function public.admin_withdrawal_queue()
returns table (id uuid, number bigint, user_id uuid, display_name text, username text, coins bigint,
               amount_paise bigint, account_holder text, account_number text, ifsc text, pan text,
               requested_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    perform app.fail('forbidden', 'Admins only.');
  end if;
  return query
    select w.id, w.number, w.user_id, p.display_name, p.username, w.coins, w.amount_paise, a.account_holder,
           a.account_number, a.ifsc, a.pan, w.requested_at
      from public.withdrawals w
      join public.profiles p on p.id = w.user_id
      join public.payout_accounts a on a.user_id = w.user_id
     where w.status = 'requested'
     order by w.requested_at;
end;
$$;

create or replace function public.admin_payout_account_queue()
returns table (user_id uuid, display_name text, username text, account_holder text, account_number text,
               ifsc text, pan text, created_at timestamptz, updated_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.is_admin() then
    perform app.fail('forbidden', 'Admins only.');
  end if;
  return query
    select a.user_id, p.display_name, p.username, a.account_holder, a.account_number, a.ifsc, a.pan, a.created_at, a.updated_at
      from public.payout_accounts a join public.profiles p on p.id = a.user_id
     where a.status = 'pending'
     order by a.updated_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- 10. Reading balances and history
-- ---------------------------------------------------------------------------
-- The member's balances. Releases any holds that have come due first.
create or replace function public.my_wallet()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := app.require_user();
begin
  perform app.release_holds(v_uid);
  return jsonb_build_object(
    'wallet', app.coin_balance('wallet', v_uid),
    'pending', app.coin_balance('pending', v_uid),
    'earnings', app.coin_balance('earnings', v_uid),
    'locked', coalesce((select sum(a.balance) from public.coin_accounts a join public.contracts c on c.id = a.contract_id
                         where c.client_id = v_uid), 0),
    'holds', coalesce((select jsonb_agg(jsonb_build_object('coins', h.coins, 'available_on', h.available_on,
                                                           'contract_id', h.contract_id, 'contract_title', c.title)
                                        order by h.available_on)
                         from public.coin_holds h join public.contracts c on c.id = h.contract_id
                        where h.user_id = v_uid and h.released_at is null), '[]'::jsonb),
    'settings', (select jsonb_object_agg(key, value) from public.platform_settings)
  );
end;
$$;

create or replace function public.my_coin_history(p_limit int default 50, p_before bigint default null)
returns table (entry_id bigint, created_at timestamptz, account text, amount bigint, balance_after bigint,
               kind text, memo text, contract_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.created_at, a.kind, e.amount, e.balance_after, t.kind, t.memo, t.contract_id
    from public.coin_entries e
    join public.coin_accounts a on a.id = e.account_id
    join public.coin_transactions t on t.id = e.transaction_id
   where a.user_id = auth.uid() and (p_before is null or e.id < p_before)
   order by e.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 200)
$$;

-- Escrow movements for one contract (parties, arbitrators and admins).
create or replace function public.contract_coin_history(p_contract_id uuid)
returns table (entry_id bigint, created_at timestamptz, amount bigint, balance_after bigint, kind text, memo text,
               milestone_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select e.id, e.created_at, e.amount, e.balance_after, t.kind, t.memo, t.milestone_id
    from public.coin_entries e
    join public.coin_accounts a on a.id = e.account_id
    join public.coin_transactions t on t.id = e.transaction_id
   where a.contract_id = p_contract_id and app.can_view_contract(p_contract_id)
   order by e.id
$$;

-- ---------------------------------------------------------------------------
-- 11. Identity replaces wallet in discovery and the arbitrator programme
-- ---------------------------------------------------------------------------
drop function if exists public.search_projects(text, text, text[], numeric, numeric, text, text, int, int);
create function public.search_projects(
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
  client_email_verified boolean, client_identity_verified boolean, client_funded int, client_rating numeric,
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
    select p.*, s.email_verified, s.identity_verified, s.funded_as_client, s.rating_avg, s.review_count,
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
         b.email_verified, b.identity_verified, b.funded_as_client, b.rating_avg, b.review_count,
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

drop function if exists public.search_people(text, text[], int, int);
create function public.search_people(p_query text default null, p_skills text[] default null,
                                     p_limit int default 20, p_offset int default 0)
returns table (
  id uuid, username text, display_name text, headline text, avatar_path text, skills text[], location text,
  experience_level text, rating_avg numeric, review_count int, completed_as_freelancer int, identity_verified boolean,
  email_verified boolean, total_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select p.id, p.username, p.display_name, p.headline, p.avatar_path, p.skills, p.location, p.experience_level,
         s.rating_avg, s.review_count, s.completed_as_freelancer, s.identity_verified, s.email_verified,
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

create or replace function public.arbitrator_eligibility()
returns jsonb
language plpgsql
volatile
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
    jsonb_build_object('key', 'identity', 'label', 'Verified PAN and bank account', 'met', v_s.identity_verified,
                       'value', v_s.identity_verified),
    jsonb_build_object('key', 'age', 'label', 'Account at least 30 days old',
                       'met', v_created <= now() - interval '30 days', 'value', v_created)
  );
  return jsonb_build_object('eligible', not exists (select 1 from jsonb_array_elements(v_checks) c where not (c ->> 'met')::boolean),
                            'checks', v_checks);
end;
$$;

-- ---------------------------------------------------------------------------
-- 12. Privileges and row-level security
-- ---------------------------------------------------------------------------
revoke all on public.platform_settings, public.holidays, public.coin_accounts, public.coin_transactions,
              public.coin_entries, public.coin_holds, public.coin_purchases, public.payout_accounts, public.withdrawals
  from anon, authenticated;
grant select on public.platform_settings, public.holidays to anon, authenticated;
grant select on public.coin_accounts, public.coin_holds, public.coin_purchases, public.withdrawals to authenticated;
grant select (user_id, account_holder, account_last4, ifsc, pan_last4, status, review_note, verified_at, created_at, updated_at)
  on public.payout_accounts to authenticated;

alter table public.platform_settings enable row level security;
alter table public.holidays enable row level security;
alter table public.coin_accounts enable row level security;
alter table public.coin_transactions enable row level security;
alter table public.coin_entries enable row level security;
alter table public.coin_holds enable row level security;
alter table public.coin_purchases enable row level security;
alter table public.payout_accounts enable row level security;
alter table public.withdrawals enable row level security;

create policy platform_settings_read on public.platform_settings for select to anon, authenticated using (true);
create policy holidays_read on public.holidays for select to anon, authenticated using (true);
create policy coin_accounts_read on public.coin_accounts for select to authenticated
  using (user_id = auth.uid() or (contract_id is not null and app.can_view_contract(contract_id)) or app.is_admin());
create policy coin_holds_read on public.coin_holds for select to authenticated using (user_id = auth.uid());
create policy coin_purchases_read on public.coin_purchases for select to authenticated using (user_id = auth.uid());
create policy payout_accounts_read on public.payout_accounts for select to authenticated using (user_id = auth.uid());
create policy withdrawals_read on public.withdrawals for select to authenticated
  using (user_id = auth.uid() or app.is_admin());

alter publication supabase_realtime add table public.coin_accounts, public.withdrawals;

revoke execute on function
  app.setting(text), app.add_working_days(date, int), app.coin_account(text, uuid, uuid), app.coin_balance(text, uuid, uuid),
  app.new_coin_txn(text, text, uuid, uuid, uuid, uuid), app.move_coins(uuid, bigint, bigint, bigint),
  app.settle_milestone(uuid, bigint, bigint, text, text), app.release_milestone(uuid, uuid), app.release_holds(uuid),
  app.auto_release_due(), app.return_withdrawal(public.withdrawals, text, text)
  from public;

revoke execute on function
  public.fund_contract(uuid), public.release_milestone(uuid), public.refund_milestone(uuid),
  public.save_payout_account(text, text, text, text), public.admin_review_payout_account(uuid, boolean, text),
  public.request_withdrawal(bigint, text), public.cancel_withdrawal(uuid), public.admin_complete_withdrawal(uuid, text),
  public.admin_fail_withdrawal(uuid, text), public.admin_withdrawal_queue(), public.admin_payout_account_queue(),
  public.my_wallet(), public.my_coin_history(int, bigint), public.contract_coin_history(uuid)
  from public, anon;
grant execute on function
  public.fund_contract(uuid), public.release_milestone(uuid), public.refund_milestone(uuid),
  public.save_payout_account(text, text, text, text), public.admin_review_payout_account(uuid, boolean, text),
  public.request_withdrawal(bigint, text), public.cancel_withdrawal(uuid), public.admin_complete_withdrawal(uuid, text),
  public.admin_fail_withdrawal(uuid, text), public.admin_withdrawal_queue(), public.admin_payout_account_queue(),
  public.my_wallet(), public.my_coin_history(int, bigint), public.contract_coin_history(uuid)
  to authenticated;

revoke execute on function
  public.create_coin_purchase(uuid, bigint, text), public.attach_coin_purchase_order(uuid, text),
  public.complete_coin_purchase(text, text, bigint), public.fail_coin_purchase(text, text), public.run_coin_jobs()
  from public, anon, authenticated;
grant execute on function
  public.create_coin_purchase(uuid, bigint, text), public.attach_coin_purchase_order(uuid, text),
  public.complete_coin_purchase(text, text, bigint), public.fail_coin_purchase(text, text), public.run_coin_jobs()
  to service_role;

grant execute on function public.search_projects(text, text, text[], numeric, numeric, text, text, int, int),
  public.search_people(text, text[], int, int) to anon, authenticated;
