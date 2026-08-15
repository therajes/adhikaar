begin;
select plan(16);

select ok((select count(*) = 18 from pg_tables where schemaname = 'public' and rowsecurity), 'RLS enabled on all 18 application tables');
select ok(not has_table_privilege('anon', 'public.mandates', 'select'), 'anon cannot enumerate mandates');
select ok(not has_table_privilege('anon', 'public.representatives', 'select'), 'anon cannot enumerate representatives');
select ok(not has_table_privilege('authenticated', 'public.mandates', 'insert'), 'representative cannot directly insert mandates');
select ok(not has_table_privilege('authenticated', 'public.revocations', 'insert'), 'clients cannot directly create revocations');
select ok(not has_table_privilege('authenticated', 'public.audit_events', 'update'), 'clients cannot update audit events');
select ok(not has_table_privilege('authenticated', 'public.revocations', 'delete'), 'clients cannot delete revocations');
select ok(has_function_privilege('service_role', 'public.consume_mandate(text,uuid,text)', 'execute'), 'service role can consume nonces');
select ok(not has_function_privilege('anon', 'public.consume_mandate(text,uuid,text)', 'execute'), 'anon cannot call nonce function directly');
select ok((select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('public','private') and p.prosecdef and p.proconfig is null), 'security definer functions set explicit search paths');
select ok((select count(*) = 19 from public.action_definitions), 'canonical action catalog is complete');
select ok((select code = 'request-cvv' from public.action_definitions where code = 'request-cvv'), 'courier CVV action identifier is canonical');
select ok((select count(*) = 3 from auth.users where email like '%@example.com'), 'three fictional Supabase Auth demo identities are seeded');
select ok((select count(*) = 3 from public.profiles where id in ('60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000003')), 'every demo identity has a protected profile');
select ok((select count(*) = 2 from public.institution_memberships where institution_id = '20000000-0000-0000-0000-000000000001' and status = 'active'), 'employee and administrator memberships are institution-scoped');
select ok(not has_table_privilege('authenticated', 'public.institution_memberships', 'update'), 'employees cannot promote or move their own membership');

select * from finish();
rollback;
