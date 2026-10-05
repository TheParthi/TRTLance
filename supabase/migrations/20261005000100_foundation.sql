-- TrustLance v2 — foundation: private helper schema, error convention, identity and platform tables.
--
-- Conventions used by every migration:
--   * Statuses are lowercase snake_case text guarded by CHECK constraints.
--   * Money is numeric(38,18) in the escrow network's native unit (SHM); never floats, never integers.
--   * Clients never write privileged columns. Anything that changes state another user relies on
--     goes through a SECURITY DEFINER function with `set search_path = ''`.
--   * Business errors are raised as  errcode P0001, message 'TL:<code>', detail '<human message>'
--     so the app can show the message without leaking database internals.

create schema if not exists app;
grant usage on schema app to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Error helper
-- ---------------------------------------------------------------------------
create or replace function app.fail(p_code text, p_message text)
returns void
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = 'TL:' || p_code, detail = p_message;
end;
$$;

create or replace function app.require_user()
returns uuid
language plpgsql
stable
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform app.fail('not_authenticated', 'Sign in to continue.');
  end if;
  return v_uid;
end;
$$;

create or replace function app.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Append-only guard for audit tables.
create or replace function app.forbid_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception using errcode = 'P0001', message = 'TL:immutable', detail = 'Audit records cannot be changed.';
end;
$$;

-- ---------------------------------------------------------------------------
-- Reference data
-- ---------------------------------------------------------------------------
create table public.categories (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,40}$'),
  label text not null,
  description text not null default '',
  sort_order int not null default 0
);

insert into public.categories (slug, label, description, sort_order) values
  ('web-development',    'Web development',      'Websites, web apps, APIs and back ends',            10),
  ('mobile-development', 'Mobile development',   'iOS, Android and cross-platform apps',              20),
  ('design',             'Design',               'Product, UI/UX, brand and graphic design',          30),
  ('data-ai',            'Data & AI',            'Data engineering, analytics and machine learning',  40),
  ('blockchain',         'Blockchain',           'Smart contracts, dApps and Web3 integration',       50),
  ('writing',            'Writing',              'Copywriting, technical writing and editing',        60),
  ('marketing',          'Marketing',            'Growth, SEO, content and social',                   70),
  ('video-audio',        'Video & audio',        'Editing, animation, voice and music',               80),
  ('business',           'Business & consulting','Strategy, operations, finance and legal support',   90),
  ('other',              'Other',                'Anything that does not fit above',                 100);

revoke all on public.categories from anon, authenticated;
grant select on public.categories to anon, authenticated;
alter table public.categories enable row level security;
create policy categories_read on public.categories for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- Profiles: public identity. Only columns that are safe to show anyone live here.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  headline text check (char_length(headline) <= 120),
  bio text check (char_length(bio) <= 2000),
  avatar_path text check (char_length(avatar_path) <= 300),
  location text check (char_length(location) <= 80),
  website_url text check (website_url ~ '^https://\S{3,}$' and char_length(website_url) <= 300),
  intent text not null default 'both' check (intent in ('hire', 'work', 'both')),
  skills text[] not null default '{}' check (cardinality(skills) <= 25),
  languages text[] not null default '{}' check (cardinality(languages) <= 10),
  experience_level text check (experience_level in ('entry', 'intermediate', 'expert')),
  years_experience int check (years_experience between 0 and 60),
  onboarding_step text not null default 'welcome',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_touch before update on public.profiles
  for each row execute function app.touch_updated_at();

create index profiles_skills_idx on public.profiles using gin (skills);

-- Private account data, readable and writable only by its owner.
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  phone text check (phone ~ '^\+?[0-9 ()-]{6,20}$'),
  muted_notification_categories text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profile_private_touch before update on public.profile_private
  for each row execute function app.touch_updated_at();

-- Server-owned reputation and trust facts. Nobody writes these from the browser.
create table public.profile_stats (
  id uuid primary key references public.profiles (id) on delete cascade,
  email_verified boolean not null default false,
  wallet_verified boolean not null default false,
  rating_avg numeric(3, 2),
  review_count int not null default 0,
  completed_as_freelancer int not null default 0,
  completed_as_client int not null default 0,
  funded_as_client int not null default 0,
  disputes_lost int not null default 0,
  trust_credits int not null default 0,
  updated_at timestamptz not null default now()
);

-- Reserved usernames that could be used to impersonate the platform.
create or replace function app.is_reserved_username(p_username text)
returns boolean
language sql
immutable
as $$
  select p_username = any (array['admin','administrator','support','help','trustlance','system',
    'arbitrator','arbiter','moderator','security','root','judge_bot','official','staff','billing'])
$$;

create or replace function app.check_username()
returns trigger
language plpgsql
as $$
begin
  if app.is_reserved_username(new.username) then
    perform app.fail('username_reserved', 'That username is reserved. Choose another one.');
  end if;
  return new;
end;
$$;
create trigger profiles_username_check before insert or update of username on public.profiles
  for each row execute function app.check_username();

-- Create the profile rows for every new auth user, server-side, regardless of sign-in method.
create or replace function app.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_base text;
  v_name text;
  v_username text;
  v_n int := 1;
begin
  v_name := coalesce(nullif(btrim(v_meta ->> 'full_name'), ''), nullif(btrim(v_meta ->> 'name'), ''),
                     split_part(coalesce(new.email, 'member'), '@', 1));
  v_base := lower(regexp_replace(coalesce(nullif(v_meta ->> 'username', ''), split_part(coalesce(new.email, 'member'), '@', 1)),
                                 '[^a-zA-Z0-9_]', '_', 'g'));
  v_base := left(v_base, 24);
  if char_length(v_base) < 3 or app.is_reserved_username(v_base) then
    v_base := 'member_' || left(replace(new.id::text, '-', ''), 6);
  end if;
  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_n := v_n + 1;
    v_username := left(v_base, 24) || '_' || v_n;
  end loop;

  insert into public.profiles (id, username, display_name)
  values (new.id, v_username, left(v_name, 80));
  insert into public.profile_private (id) values (new.id);
  insert into public.profile_stats (id, email_verified) values (new.id, new.email_confirmed_at is not null);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function app.handle_new_auth_user();

create or replace function app.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email_confirmed_at is distinct from old.email_confirmed_at then
    update public.profile_stats
       set email_verified = new.email_confirmed_at is not null, updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_updated after update on auth.users
  for each row execute function app.handle_auth_user_updated();

-- ---------------------------------------------------------------------------
-- Wallets: one verified wallet per account, written only by the server after a
-- Sign-In-With-Ethereum signature has been verified.
-- ---------------------------------------------------------------------------
create table public.wallets (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  address text not null unique check (address ~ '^0x[0-9a-f]{40}$'),
  chain_id int not null,
  verified_at timestamptz not null default now(),
  siwe_message text not null,
  signature text not null
);

create table public.wallet_nonces (
  nonce text primary key check (nonce ~ '^[A-Za-z0-9]{16,64}$'),
  user_id uuid not null references public.profiles (id) on delete cascade,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create or replace function app.sync_wallet_verified()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    update public.profile_stats set wallet_verified = false, updated_at = now() where id = old.user_id;
    return old;
  end if;
  update public.profile_stats set wallet_verified = true, updated_at = now() where id = new.user_id;
  return new;
end;
$$;
create trigger wallets_sync_stats after insert or delete on public.wallets
  for each row execute function app.sync_wallet_verified();

-- ---------------------------------------------------------------------------
-- Platform administration
-- ---------------------------------------------------------------------------
create table public.platform_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  granted_at timestamptz not null default now(),
  note text
);

create or replace function app.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.platform_admins where user_id = p_uid)
$$;

-- ---------------------------------------------------------------------------
-- Rate limiting and idempotency (used by RPCs and server routes)
-- ---------------------------------------------------------------------------
create table public.rate_limit_hits (
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, subject, window_start)
);

create or replace function app.rate_limit(p_bucket text, p_limit int, p_window_seconds int, p_subject text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subject text := coalesce(p_subject, auth.uid()::text, 'anonymous');
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  insert into public.rate_limit_hits as r (bucket, subject, window_start, hits)
  values (p_bucket, v_subject, v_window, 1)
  on conflict (bucket, subject, window_start) do update set hits = r.hits + 1
  returning hits into v_hits;
  if v_hits > p_limit then
    perform app.fail('rate_limited', 'Too many requests. Please wait a moment and try again.');
  end if;
  -- Opportunistic cleanup of old windows.
  delete from public.rate_limit_hits where window_start < now() - interval '1 day' and random() < 0.01;
end;
$$;

-- Server routes call this through the service role.
create or replace function public.check_rate_limit(p_bucket text, p_limit int, p_window_seconds int, p_subject text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.rate_limit(p_bucket, p_limit, p_window_seconds, p_subject);
end;
$$;

create table public.idempotency_keys (
  user_id uuid not null,
  key text not null check (char_length(key) between 8 and 100),
  scope text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- Returns the stored result for (user, key) or null. Raises if the key was used for another operation.
create or replace function app.idempotent_result(p_key text, p_scope text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.idempotency_keys;
begin
  if p_key is null then
    return null;
  end if;
  select * into v_row from public.idempotency_keys where user_id = auth.uid() and key = p_key;
  if not found then
    return null;
  end if;
  if v_row.scope <> p_scope then
    perform app.fail('idempotency_conflict', 'This request key was already used for a different action.');
  end if;
  return v_row.result;
end;
$$;

create or replace function app.remember_result(p_key text, p_scope text, p_result jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_key is null then
    return;
  end if;
  insert into public.idempotency_keys (user_id, key, scope, result)
  values (auth.uid(), p_key, p_scope, p_result)
  on conflict (user_id, key) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and row-level security for this migration's tables
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.profile_private, public.profile_stats, public.wallets,
              public.wallet_nonces, public.platform_admins, public.rate_limit_hits, public.idempotency_keys
  from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (display_name, headline, bio, avatar_path, location, website_url, intent, skills, languages,
              experience_level, years_experience, onboarding_step, onboarding_completed_at, username)
  on public.profiles to authenticated;
grant select on public.profile_stats to anon, authenticated;
grant select, update (phone, muted_notification_categories) on public.profile_private to authenticated;
grant select on public.wallets to authenticated;
grant select on public.platform_admins to authenticated;

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;
alter table public.profile_stats enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_nonces enable row level security;
alter table public.platform_admins enable row level security;
alter table public.rate_limit_hits enable row level security;
alter table public.idempotency_keys enable row level security;

create policy profiles_read on public.profiles for select to anon, authenticated using (true);
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profile_private_own_read on public.profile_private for select to authenticated using (id = auth.uid());
create policy profile_private_own_update on public.profile_private for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profile_stats_read on public.profile_stats for select to anon, authenticated using (true);

create policy wallets_own_read on public.wallets for select to authenticated using (user_id = auth.uid());

create policy platform_admins_self on public.platform_admins for select to authenticated using (user_id = auth.uid());

revoke execute on function app.fail(text, text), app.require_user(), app.is_admin(uuid), app.rate_limit(text, int, int, text),
  app.idempotent_result(text, text), app.remember_result(text, text, jsonb), app.is_reserved_username(text)
  from public;
grant execute on function app.fail(text, text), app.require_user(), app.is_admin(uuid), app.is_reserved_username(text)
  to anon, authenticated, service_role;
grant execute on function app.rate_limit(text, int, int, text), app.idempotent_result(text, text),
  app.remember_result(text, text, jsonb) to authenticated, service_role;

revoke execute on function public.check_rate_limit(text, int, int, text) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, int, int, text) to service_role;
