grant select on public.customer_complaints to authenticated;

create policy complaint_admin_realtime_select on public.customer_complaints
for select to authenticated using (exists (
  select 1 from public.institution_memberships m
  where m.institution_id = customer_complaints.institution_id
    and m.user_id = (select auth.uid())
    and m.membership_role = 'institution_admin'
    and m.status = 'active'
));

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'representatives') then
    alter publication supabase_realtime add table public.representatives;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'revocations') then
    alter publication supabase_realtime add table public.revocations;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'customer_complaints') then
    alter publication supabase_realtime add table public.customer_complaints;
  end if;
end $$;
