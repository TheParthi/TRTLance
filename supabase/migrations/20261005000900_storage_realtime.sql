-- TrustLance v2 — storage buckets, storage access rules and realtime publication.
--
-- Object paths always start with the id of the record that owns them, so access can be
-- decided from the path:   avatars/<user_id>/…   project-files/<project_id>/…
--                          contract-files/<contract_id>/…   conversation-files/<conversation_id>/…
--                          dispute-evidence/<dispute_id>/…

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('project-files', 'project-files', false, 26214400, null),
  ('contract-files', 'contract-files', false, 52428800, null),
  ('conversation-files', 'conversation-files', false, 26214400, null),
  ('dispute-evidence', 'dispute-evidence', false, 52428800, null)
on conflict (id) do nothing;

create or replace function app.path_uuid(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;
grant execute on function app.path_uuid(text) to anon, authenticated, service_role;

-- Avatars: public read, owner writes inside their own folder.
create policy avatars_read on storage.objects for select to anon, authenticated using (bucket_id = 'avatars');
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and app.path_uuid(name) = auth.uid());
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and app.path_uuid(name) = auth.uid());
create policy avatars_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and app.path_uuid(name) = auth.uid());

-- Project files: readable by anyone who can read the project; written by its owner while draft/open.
create policy project_files_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'project-files' and exists (select 1 from public.projects p where p.id = app.path_uuid(name)));
create policy project_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and exists (
    select 1 from public.projects p where p.id = app.path_uuid(name) and p.client_id = auth.uid() and p.status in ('draft', 'open')));
create policy project_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and exists (
    select 1 from public.projects p where p.id = app.path_uuid(name) and p.client_id = auth.uid() and p.status in ('draft', 'open')));

-- Contract files: parties (and the assigned arbitrator) read; parties upload while the contract is live.
create policy contract_files_read on storage.objects for select to authenticated
  using (bucket_id = 'contract-files' and app.can_view_contract(app.path_uuid(name)));
create policy contract_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'contract-files' and exists (
    select 1 from public.contracts c where c.id = app.path_uuid(name)
       and auth.uid() in (c.client_id, c.freelancer_id) and c.status in ('active', 'disputed')));

-- Conversation files: members only.
create policy conversation_files_read on storage.objects for select to authenticated
  using (bucket_id = 'conversation-files' and app.is_conversation_member(app.path_uuid(name)));
create policy conversation_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'conversation-files' and app.is_conversation_member(app.path_uuid(name)));

-- Dispute evidence: parties, the assigned arbitrator and admins; uploads only while unresolved.
create policy dispute_evidence_files_read on storage.objects for select to authenticated
  using (bucket_id = 'dispute-evidence' and app.can_view_dispute(app.path_uuid(name)));
create policy dispute_evidence_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'dispute-evidence' and app.can_view_dispute(app.path_uuid(name)) and exists (
    select 1 from public.disputes d where d.id = app.path_uuid(name) and d.status <> 'resolved'));

-- Realtime: row changes the UI listens to (RLS still applies to every subscriber).
alter publication supabase_realtime add table
  public.notifications, public.messages, public.conversations, public.dispute_messages, public.disputes,
  public.contracts, public.milestones, public.escrow_transactions;
