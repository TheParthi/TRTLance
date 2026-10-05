-- TrustLance v2 — conversations tied to a project (and its contract once hired), and notifications.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  client_id uuid not null references public.profiles (id),
  freelancer_id uuid not null references public.profiles (id),
  contract_id uuid unique references public.contracts (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (project_id, freelancer_id),
  constraint conversations_distinct check (client_id <> freelancer_id)
);
create index conversations_client_idx on public.conversations (client_id, last_message_at desc);
create index conversations_freelancer_idx on public.conversations (freelancer_id, last_message_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default to_timestamp(0),
  primary key (conversation_id, user_id)
);
create index conversation_members_user_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid references public.profiles (id),
  kind text not null default 'text' check (kind in ('text', 'file', 'system')),
  body text not null default '' check (char_length(body) <= 5000),
  file_path text check (char_length(file_path) <= 400),
  file_name text check (char_length(file_name) <= 200),
  file_size bigint check (file_size between 1 and 26214400),
  mime_type text check (char_length(mime_type) <= 120),
  created_at timestamptz not null default now(),
  constraint messages_shape check (
    (kind = 'text' and sender_id is not null and char_length(btrim(body)) >= 1 and file_path is null)
    or (kind = 'file' and sender_id is not null and file_path is not null and file_name is not null)
    or (kind = 'system' and sender_id is null)
  )
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create or replace function app.is_conversation_member(p_conversation uuid, p_uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.conversation_members where conversation_id = p_conversation and user_id = p_uid)
$$;

-- ---------------------------------------------------------------------------
-- Notifications
-- ---------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('projects', 'contracts', 'milestones', 'payments', 'messages',
                                              'disputes', 'security', 'system')),
  type text not null,
  title text not null check (char_length(title) between 1 and 160),
  body text not null default '' check (char_length(body) <= 600),
  link text check (link ~ '^/[A-Za-z0-9/_?=&.#%-]*$'),
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'critical')),
  entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

-- The only way notifications are created. Muting applies to non-critical categories only.
create or replace function app.notify(p_user uuid, p_category text, p_type text, p_title text, p_body text,
                                      p_link text, p_severity text default 'info', p_entity uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user is null then
    return;
  end if;
  if p_category in ('projects', 'messages', 'system') and exists (
       select 1 from public.profile_private where id = p_user and p_category = any (muted_notification_categories)) then
    return;
  end if;
  insert into public.notifications (user_id, category, type, title, body, link, severity, entity_id)
  values (p_user, p_category, p_type, left(p_title, 160), left(coalesce(p_body, ''), 600), p_link, p_severity, p_entity);
end;
$$;

-- New message: bump the conversation and keep one unread "new messages" notification per conversation.
create or replace function app.on_message_inserted()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member record;
  v_sender text;
  v_existing uuid;
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  if new.kind = 'system' then
    return null;
  end if;
  update public.conversation_members set last_read_at = new.created_at
   where conversation_id = new.conversation_id and user_id = new.sender_id;
  select display_name into v_sender from public.profiles where id = new.sender_id;
  for v_member in
    select user_id from public.conversation_members where conversation_id = new.conversation_id and user_id <> new.sender_id
  loop
    select id into v_existing from public.notifications
     where user_id = v_member.user_id and type = 'message.new' and entity_id = new.conversation_id and read_at is null
     limit 1;
    if v_existing is not null then
      update public.notifications
         set body = left(case when new.kind = 'file' then 'Sent a file: ' || new.file_name else new.body end, 600),
             title = 'New messages from ' || coalesce(v_sender, 'a member'),
             created_at = new.created_at
       where id = v_existing;
    else
      perform app.notify(v_member.user_id, 'messages', 'message.new', 'New message from ' || coalesce(v_sender, 'a member'),
                         case when new.kind = 'file' then 'Sent a file: ' || new.file_name else new.body end,
                         '/messages/' || new.conversation_id, 'info', new.conversation_id);
    end if;
  end loop;
  return null;
end;
$$;
create trigger messages_after_insert after insert on public.messages
  for each row execute function app.on_message_inserted();

create or replace function app.post_system_message(p_conversation uuid, p_body text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.messages (conversation_id, kind, body) values (p_conversation, 'system', left(p_body, 5000))
$$;

-- Find or create the conversation between a project's client and a freelancer.
create or replace function app.ensure_conversation(p_project uuid, p_freelancer uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_client uuid;
begin
  select client_id into v_client from public.projects where id = p_project;
  insert into public.conversations (project_id, client_id, freelancer_id)
  values (p_project, v_client, p_freelancer)
  on conflict (project_id, freelancer_id) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.conversations where project_id = p_project and freelancer_id = p_freelancer;
  else
    insert into public.conversation_members (conversation_id, user_id) values (v_id, v_client), (v_id, p_freelancer);
  end if;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------
revoke all on public.conversations, public.conversation_members, public.messages, public.notifications
  from anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages, public.notifications to authenticated;
grant insert (conversation_id, sender_id, kind, body, file_path, file_name, file_size, mime_type)
  on public.messages to authenticated;
grant delete on public.notifications to authenticated;

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;

create policy conversations_read on public.conversations for select to authenticated
  using (app.is_conversation_member(id) or app.is_admin());
create policy conversation_members_read on public.conversation_members for select to authenticated
  using (app.is_conversation_member(conversation_id));
create policy messages_read on public.messages for select to authenticated
  using (app.is_conversation_member(conversation_id));
create policy messages_send on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and kind in ('text', 'file') and app.is_conversation_member(conversation_id)
              and (file_path is null or file_path like conversation_id::text || '/%'));

create policy notifications_read on public.notifications for select to authenticated using (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated using (user_id = auth.uid());

revoke execute on function app.notify(uuid, text, text, text, text, text, text, uuid), app.post_system_message(uuid, text),
  app.ensure_conversation(uuid, uuid) from public;
grant execute on function app.is_conversation_member(uuid, uuid) to authenticated, service_role;
