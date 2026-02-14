create table if not exists ai_project_risk_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null, -- references projects(id) - removing FK constraint to be safe if table names differ, but ideally should be there. Let's assume projects table exists as per prompts.
  generated_for_user uuid not null, -- references users(id)
  risk_level text check (risk_level in ('LOW', 'MEDIUM', 'HIGH')),
  risk_summary text,
  issues jsonb,
  confidence_score integer,
  created_at timestamp with time zone default now()
);

-- Add index for faster lookups
create index if not exists idx_ai_project_risk_reports_lookup 
on ai_project_risk_reports(project_id, generated_for_user);

-- RLS Policies (Optional but recommended)
alter table ai_project_risk_reports enable row level security;

create policy "Users can view their own reports"
  on ai_project_risk_reports for select
  using (auth.uid() = generated_for_user);

create policy "Service role can insert reports"
  on ai_project_risk_reports for insert
  with check (true);
