-- Follow-ups found while building the UI.

-- Read receipts ("Seen") update live.
alter publication supabase_realtime add table public.conversation_members;

-- Uploaders may remove their own conversation and dispute files (cleanup after a failed send).
-- Objects referenced by a message or evidence row stay: the UI only deletes orphans it just uploaded.
create policy conversation_files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'conversation-files' and owner = auth.uid()
         and not exists (select 1 from public.messages m where m.file_path = storage.objects.name));
create policy contract_files_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'contract-files' and owner = auth.uid()
         and not exists (select 1 from public.contract_files f where f.storage_path = storage.objects.name));
