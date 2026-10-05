-- TrustLance v2 — marketplace: projects, attachments, proposals.

create or replace function app.text_array_to_string(p text[])
returns text
language sql
immutable
parallel safe
as $$
  select coalesce(array_to_string(p, ' '), '')
$$;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete restrict,
  title text not null default '' check (char_length(title) <= 120),
  description text not null default '' check (char_length(description) <= 10000),
  category text references public.categories (slug),
  skills text[] not null default '{}' check (cardinality(skills) <= 15),
  budget_amount numeric(38, 18) check (budget_amount > 0 and budget_amount = round(budget_amount, 6)),
  currency text not null default 'SHM' check (currency = 'SHM'),
  experience_level text check (experience_level in ('entry', 'intermediate', 'expert')),
  start_date date,
  due_date date,
  deliverables text[] not null default '{}' check (cardinality(deliverables) <= 20),
  -- Client's suggested milestone plan: [{ "title": text, "description": text, "amount": numeric }]
  milestone_plan jsonb not null default '[]'::jsonb check (jsonb_typeof(milestone_plan) = 'array'),
  visibility text not null default 'public' check (visibility in ('public', 'unlisted')),
  status text not null default 'draft' check (status in ('draft', 'open', 'in_contract', 'completed', 'cancelled')),
  hired_freelancer_id uuid references public.profiles (id),
  proposal_count int not null default 0,
  draft_step int not null default 1 check (draft_step between 1 and 9),
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', app.text_array_to_string(skills)), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  constraint projects_dates check (due_date is null or start_date is null or due_date >= start_date),
  constraint projects_published_complete check (
    status = 'draft' or (
      char_length(title) >= 10 and char_length(description) >= 30 and category is not null
      and cardinality(skills) >= 1 and budget_amount is not null and experience_level is not null
      and published_at is not null
    )
  )
);

create trigger projects_touch before update on public.projects
  for each row execute function app.touch_updated_at();

create index projects_client_idx on public.projects (client_id, created_at desc);
create index projects_discovery_idx on public.projects (status, visibility, published_at desc);
create index projects_search_idx on public.projects using gin (search);
create index projects_skills_idx on public.projects using gin (skills);
create index projects_hired_idx on public.projects (hired_freelancer_id);

create table public.project_attachments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id),
  storage_path text not null unique check (char_length(storage_path) <= 400),
  file_name text not null check (char_length(file_name) between 1 and 200),
  size_bytes bigint not null check (size_bytes between 1 and 26214400),
  mime_type text not null check (char_length(mime_type) <= 120),
  created_at timestamptz not null default now()
);
create index project_attachments_project_idx on public.project_attachments (project_id);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  freelancer_id uuid not null references public.profiles (id),
  cover_letter text not null check (char_length(cover_letter) between 50 and 5000),
  amount numeric(38, 18) not null check (amount > 0 and amount = round(amount, 6)),
  currency text not null default 'SHM' check (currency = 'SHM'),
  duration_days int not null check (duration_days between 1 and 730),
  relevant_skills text[] not null default '{}' check (cardinality(relevant_skills) <= 15),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, freelancer_id)
);
create trigger proposals_touch before update on public.proposals
  for each row execute function app.touch_updated_at();
create index proposals_freelancer_idx on public.proposals (freelancer_id, created_at desc);
create index proposals_project_idx on public.proposals (project_id, status);

create table public.proposal_milestones (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  position int not null check (position between 1 and 20),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  amount numeric(38, 18) not null check (amount > 0 and amount = round(amount, 6)),
  due_in_days int not null check (due_in_days between 1 and 730),
  unique (proposal_id, position)
);

-- Keep projects.proposal_count equal to the number of live proposals.
create or replace function app.refresh_proposal_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project uuid := coalesce(new.project_id, old.project_id);
begin
  update public.projects p
     set proposal_count = (select count(*) from public.proposals
                            where project_id = v_project and status in ('pending', 'accepted'))
   where p.id = v_project;
  return null;
end;
$$;
create trigger proposals_count after insert or update of status or delete on public.proposals
  for each row execute function app.refresh_proposal_count();

-- ---------------------------------------------------------------------------
-- Privileges and RLS
-- ---------------------------------------------------------------------------
revoke all on public.projects, public.project_attachments, public.proposals, public.proposal_milestones
  from anon, authenticated;

grant select on public.projects to anon, authenticated;
grant insert (client_id, title, description, category, skills, budget_amount, experience_level, start_date,
              due_date, deliverables, milestone_plan, visibility, draft_step)
  on public.projects to authenticated;
grant update (title, description, category, skills, budget_amount, experience_level, start_date, due_date,
              deliverables, milestone_plan, visibility, draft_step)
  on public.projects to authenticated;
grant delete on public.projects to authenticated;

grant select on public.project_attachments to anon, authenticated;
grant insert (project_id, uploaded_by, storage_path, file_name, size_bytes, mime_type)
  on public.project_attachments to authenticated;
grant delete on public.project_attachments to authenticated;

grant select on public.proposals, public.proposal_milestones to authenticated;

alter table public.projects enable row level security;
alter table public.project_attachments enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_milestones enable row level security;

-- Anyone can read published public projects; signed-in users can also open unlisted ones by link;
-- owners and hired freelancers always see their own.
create policy projects_read_public on public.projects for select to anon
  using (status <> 'draft' and visibility = 'public');
create policy projects_read on public.projects for select to authenticated
  using (status <> 'draft' or client_id = auth.uid() or hired_freelancer_id = auth.uid());

create policy projects_insert_draft on public.projects for insert to authenticated
  with check (client_id = auth.uid());
create policy projects_update_draft on public.projects for update to authenticated
  using (client_id = auth.uid() and status = 'draft')
  with check (client_id = auth.uid() and status = 'draft');
create policy projects_delete_draft on public.projects for delete to authenticated
  using (client_id = auth.uid() and status = 'draft');

create policy attachments_read on public.project_attachments for select to anon, authenticated
  using (exists (select 1 from public.projects p where p.id = project_id));
create policy attachments_insert on public.project_attachments for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (select 1 from public.projects p
                 where p.id = project_id and p.client_id = auth.uid() and p.status in ('draft', 'open'))
  );
create policy attachments_delete on public.project_attachments for delete to authenticated
  using (exists (select 1 from public.projects p
                  where p.id = project_id and p.client_id = auth.uid() and p.status in ('draft', 'open')));

create or replace function app.is_project_owner(p_project uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.projects where id = p_project and client_id = auth.uid())
$$;
grant execute on function app.is_project_owner(uuid) to authenticated;

create policy proposals_read on public.proposals for select to authenticated
  using (freelancer_id = auth.uid() or app.is_project_owner(project_id) or app.is_admin());

create policy proposal_milestones_read on public.proposal_milestones for select to authenticated
  using (exists (select 1 from public.proposals pr where pr.id = proposal_id));
