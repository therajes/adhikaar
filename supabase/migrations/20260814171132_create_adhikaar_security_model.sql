create extension if not exists pgcrypto with schema extensions;
create extension if not exists pgtap with schema extensions;
create schema if not exists private;

create type public.platform_role as enum ('citizen','representative','institution_admin','validator','auditor','platform_admin');
create type public.record_status as enum ('draft','pending','active','suspended','revoked','expired','superseded','rejected');
create type public.verification_verdict as enum ('verified_authorised','authentic_unauthorised','unverified','revoked','expired','replay','tampered','challenge_mismatch','stale');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Demo user' check (char_length(display_name) between 1 and 100),
  platform_role public.platform_role not null default 'citizen',
  preferred_language text not null default 'en' check (preferred_language in ('en','hi')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.institutions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  legal_name text not null,
  display_name text not null,
  description text not null default '',
  official_domain text not null,
  status public.record_status not null default 'draft',
  public_key_jwk jsonb not null default '{}'::jsonb check (jsonb_typeof(public_key_jwk) = 'object'),
  public_key_hash text not null default '',
  key_id text not null default '',
  registry_leaf_hash text not null default '',
  current_registry_snapshot_version bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  membership_role public.platform_role not null check (membership_role in ('representative','institution_admin','auditor')),
  status public.record_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table public.consortium_validators (
  id uuid primary key default gen_random_uuid(),
  display_name text not null unique,
  chain_address text not null unique check (chain_address ~ '^0x[0-9a-fA-F]{40}$'),
  public_key_jwk jsonb not null default '{}'::jsonb,
  status public.record_status not null default 'active',
  created_at timestamptz not null default now()
);

create table public.institution_proposals (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  proposal_type text not null check (proposal_type in ('register','rotate_key','suspend','revoke','publish_root')),
  proposed_payload jsonb not null check (jsonb_typeof(proposed_payload) = 'object'),
  proposed_payload_hash text not null,
  threshold_required smallint not null default 2 check (threshold_required between 2 and 3),
  status public.record_status not null default 'pending',
  chain_proposal_id text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  executed_at timestamptz
);

create table public.validator_approvals (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.institution_proposals(id) on delete cascade,
  validator_id uuid not null references public.consortium_validators(id),
  decision text not null check (decision in ('approve','reject')),
  signed_payload_hash text not null,
  signature text not null,
  created_at timestamptz not null default now(),
  unique (proposal_id, validator_id)
);

create table public.action_definitions (
  code text primary key check (code ~ '^[a-z0-9-]{3,80}$'),
  label_en text not null,
  label_hi text not null,
  description_en text not null,
  description_hi text not null,
  risk_level text not null check (risk_level in ('low','medium','high','critical')),
  category text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.policy_versions (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  policy_code text not null,
  version integer not null check (version > 0),
  role_code text not null,
  purpose_code text not null,
  title_en text not null,
  title_hi text not null,
  policy_json jsonb not null check (jsonb_typeof(policy_json) = 'object'),
  canonical_hash text not null,
  signature text not null,
  signature_algorithm text not null default 'ES256' check (signature_algorithm = 'ES256'),
  institution_key_id text not null,
  status public.record_status not null default 'draft',
  valid_from timestamptz not null,
  valid_until timestamptz,
  published_at timestamptz,
  superseded_at timestamptz,
  registry_root text not null default '',
  chain_tx_hash text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  unique (institution_id, policy_code, version)
);

create table public.representatives (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  auth_user_id uuid references auth.users(id),
  employee_reference_masked text not null,
  display_name text not null,
  role_code text not null,
  public_key_jwk jsonb not null check (jsonb_typeof(public_key_jwk) = 'object'),
  public_key_hash text not null,
  key_id text not null,
  status public.record_status not null default 'pending',
  credential_id text not null unique,
  credential_json jsonb not null check (jsonb_typeof(credential_json) = 'object'),
  credential_hash text not null,
  credential_signature text not null,
  credential_issued_at timestamptz not null,
  credential_expires_at timestamptz not null,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (credential_expires_at > credential_issued_at)
);

create table public.mandates (
  id uuid primary key default gen_random_uuid(),
  mandate_id text not null unique,
  verification_code text not null unique check (verification_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  institution_id uuid not null references public.institutions(id),
  representative_id uuid not null references public.representatives(id),
  representative_credential_id text not null,
  policy_version_id uuid not null references public.policy_versions(id),
  mandate_json jsonb not null check (jsonb_typeof(mandate_json) = 'object'),
  canonical_hash text not null,
  signature text not null,
  citizen_challenge_digest text not null,
  nonce_hash text not null unique,
  status public.record_status not null default 'active',
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  first_verified_at timestamptz,
  verification_count integer not null default 0 check (verification_count >= 0),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > issued_at),
  check (expires_at <= issued_at + interval '5 minutes')
);

create table public.nonce_consumptions (
  nonce_hash text primary key,
  mandate_id uuid not null references public.mandates(id),
  consumed_at timestamptz not null default now(),
  anonymous_session_hash text not null
);

create table public.revocations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid references public.institutions(id),
  subject_type text not null check (subject_type in ('institution','representative','credential','policy','mandate','key')),
  subject_id text not null,
  reason_code text not null,
  reason_text text not null default '',
  effective_at timestamptz not null default now(),
  leaf_hash text not null,
  root_version bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.registry_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_type text not null check (snapshot_type in ('institution','policy','revocation')),
  version bigint not null check (version > 0),
  merkle_root text not null,
  previous_root text,
  leaf_count integer not null check (leaf_count >= 0),
  chain_id bigint not null,
  contract_address text not null,
  transaction_hash text,
  block_number bigint,
  status public.record_status not null default 'pending',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (snapshot_type, version)
);

create table public.safe_callbacks (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  label_en text not null,
  label_hi text not null,
  phone_number text,
  website_url text,
  callback_type text not null check (callback_type in ('phone','website','physical')),
  active boolean not null default true,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (phone_number is not null or website_url is not null)
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid references public.mandates(id),
  verification_code_hash text not null,
  verdict public.verification_verdict not null,
  reason_codes text[] not null default '{}',
  anonymous_session_hash text not null,
  registry_snapshot_version bigint,
  occurred_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  institution_id uuid references public.institutions(id),
  actor_user_id uuid references auth.users(id),
  event_type text not null,
  subject_type text not null,
  subject_id text not null,
  payload_hash text not null,
  previous_event_hash text,
  event_hash text not null unique,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.rate_limit_buckets (
  requester_hash text not null,
  bucket_start timestamptz not null,
  request_count integer not null default 1 check (request_count > 0),
  primary key (requester_hash, bucket_start)
);

create index mandates_expiry_status_idx on public.mandates (expires_at, status);
create index representatives_institution_status_idx on public.representatives (institution_id, status);
create index policies_active_idx on public.policy_versions (institution_id, role_code, purpose_code) where status = 'active';
create index revocations_subject_idx on public.revocations (subject_type, subject_id, effective_at desc);
create index registry_latest_idx on public.registry_snapshots (snapshot_type, version desc);
create index verification_events_time_idx on public.verification_events (occurred_at desc);
create index audit_institution_time_idx on public.audit_events (institution_id, created_at desc);
create index proposals_status_idx on public.institution_proposals (status, created_at);

create or replace function private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_touch before update on public.profiles for each row execute function private.touch_updated_at();
create trigger institutions_touch before update on public.institutions for each row execute function private.touch_updated_at();
create trigger memberships_touch before update on public.institution_memberships for each row execute function private.touch_updated_at();
create trigger representatives_touch before update on public.representatives for each row execute function private.touch_updated_at();
create trigger callbacks_touch before update on public.safe_callbacks for each row execute function private.touch_updated_at();

create or replace function private.is_institution_member(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.institution_memberships m where m.institution_id = target and m.user_id = (select auth.uid()) and m.status = 'active') $$;

create or replace function private.is_institution_admin(target uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.institution_memberships m where m.institution_id = target and m.user_id = (select auth.uid()) and m.membership_role = 'institution_admin' and m.status = 'active') $$;

create or replace function private.reject_mutation()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin raise exception 'immutable_record' using errcode = '42501'; end;
$$;

create trigger audit_immutable before update or delete on public.audit_events for each row execute function private.reject_mutation();
create trigger approvals_immutable before update or delete on public.validator_approvals for each row execute function private.reject_mutation();
create trigger revocations_immutable before update or delete on public.revocations for each row execute function private.reject_mutation();
create trigger nonce_immutable before update or delete on public.nonce_consumptions for each row execute function private.reject_mutation();

create or replace function private.protect_signed_record()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.status in ('active','superseded','revoked','expired') then
    raise exception 'signed_record_is_immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger policy_signed_immutable before update of policy_json, canonical_hash, signature on public.policy_versions for each row execute function private.protect_signed_record();
create trigger mandate_signed_immutable before update of mandate_json, canonical_hash, signature, citizen_challenge_digest, nonce_hash on public.mandates for each row execute function private.protect_signed_record();

create or replace function private.append_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  prior text;
  subject text;
  payload text;
  event_digest text;
begin
  subject := coalesce(new.id::text, '');
  payload := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(pg_catalog.row_to_json(new)::text, 'utf8'), 'sha256'), 'hex');
  select a.event_hash into prior from public.audit_events a where a.institution_id is not distinct from new.institution_id order by a.id desc limit 1;
  event_digest := pg_catalog.encode(extensions.digest(pg_catalog.convert_to(coalesce(prior,'') || tg_table_name || tg_op || subject || payload || pg_catalog.now()::text, 'utf8'), 'sha256'), 'hex');
  insert into public.audit_events(institution_id, actor_user_id, event_type, subject_type, subject_id, payload_hash, previous_event_hash, event_hash)
  values (new.institution_id, auth.uid(), lower(tg_op) || '_' || tg_table_name, tg_table_name, subject, payload, prior, event_digest);
  return new;
end;
$$;
create trigger policy_audit after insert on public.policy_versions for each row execute function private.append_audit();
create trigger representative_audit after insert on public.representatives for each row execute function private.append_audit();
create trigger mandate_audit after insert on public.mandates for each row execute function private.append_audit();
create trigger revocation_audit after insert on public.revocations for each row execute function private.append_audit();

create or replace function public.consume_mandate(
  p_nonce_hash text,
  p_mandate_id uuid,
  p_session_hash text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare existing public.nonce_consumptions;
begin
  select * into existing from public.nonce_consumptions where nonce_hash = p_nonce_hash;
  if found then
    return jsonb_build_object('consumed', true, 'same_session', existing.anonymous_session_hash = p_session_hash, 'consumed_at', existing.consumed_at);
  end if;
  insert into public.nonce_consumptions(nonce_hash, mandate_id, anonymous_session_hash)
  values (p_nonce_hash, p_mandate_id, p_session_hash);
  update public.mandates set first_verified_at = coalesce(first_verified_at, now()), verification_count = verification_count + 1 where id = p_mandate_id;
  return jsonb_build_object('consumed', true, 'same_session', true, 'consumed_at', now());
exception when unique_violation then
  select * into existing from public.nonce_consumptions where nonce_hash = p_nonce_hash;
  return jsonb_build_object('consumed', true, 'same_session', existing.anonymous_session_hash = p_session_hash, 'consumed_at', existing.consumed_at);
end;
$$;

revoke all on function public.consume_mandate(text,uuid,text) from public, anon, authenticated;
grant execute on function public.consume_mandate(text,uuid,text) to service_role;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_institution_member(uuid) to authenticated;
grant execute on function private.is_institution_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.consortium_validators enable row level security;
alter table public.institution_proposals enable row level security;
alter table public.validator_approvals enable row level security;
alter table public.action_definitions enable row level security;
alter table public.policy_versions enable row level security;
alter table public.representatives enable row level security;
alter table public.mandates enable row level security;
alter table public.nonce_consumptions enable row level security;
alter table public.revocations enable row level security;
alter table public.registry_snapshots enable row level security;
alter table public.safe_callbacks enable row level security;
alter table public.verification_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.app_settings enable row level security;
alter table public.rate_limit_buckets enable row level security;

create policy profiles_own_read on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy public_active_institutions on public.institutions for select to anon using (status = 'active');
create policy authenticated_institution_read on public.institutions for select to authenticated using (status = 'active' or (select private.is_institution_member(id)));
create policy memberships_own_read on public.institution_memberships for select to authenticated using ((select auth.uid()) = user_id or (select private.is_institution_admin(institution_id)));
create policy public_active_actions on public.action_definitions for select to anon, authenticated using (active);
create policy member_policy_read on public.policy_versions for select to authenticated using ((status = 'active' and (select private.is_institution_member(institution_id))) or (select private.is_institution_admin(institution_id)));
create policy representative_own_read on public.representatives for select to authenticated using (auth_user_id = (select auth.uid()) or (select private.is_institution_admin(institution_id)));
create policy representative_mandate_read on public.mandates for select to authenticated using (exists (select 1 from public.representatives r where r.id = representative_id and r.auth_user_id = (select auth.uid())));
create policy public_registry_read on public.registry_snapshots for select to anon, authenticated using (status = 'active');
create policy public_callback_read on public.safe_callbacks for select to anon, authenticated using (active and exists (select 1 from public.institutions i where i.id = institution_id and i.status = 'active'));
create policy member_revocation_read on public.revocations for select to authenticated using (institution_id is null or (select private.is_institution_member(institution_id)));
create policy admin_audit_read on public.audit_events for select to authenticated using (institution_id is not null and (select private.is_institution_admin(institution_id)));

revoke all on all tables in schema public from anon, authenticated;
grant select on public.institutions, public.action_definitions, public.registry_snapshots, public.safe_callbacks to anon, authenticated;
grant select on public.profiles, public.institution_memberships, public.policy_versions, public.representatives, public.mandates, public.revocations, public.audit_events to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

insert into public.app_settings(key, value) values
('default_mandate_ttl_seconds', '90'),
('maximum_registry_staleness_seconds', '300'),
('maximum_revocation_staleness_seconds', '120'),
('demo_mode', 'true'),
('supported_schema_versions', '[1]');

insert into public.action_definitions(code,label_en,label_hi,description_en,description_hi,risk_level,category) values
('confirm-masked-reference','Confirm masked reference','आंशिक संदर्भ की पुष्टि','Confirm only a partially hidden reference.','केवल आंशिक रूप से छिपे संदर्भ की पुष्टि।','low','verification'),
('explain-required-documents','Explain required documents','ज़रूरी दस्तावेज़ समझाएँ','Explain which official documents are required.','आधिकारिक आवश्यक दस्तावेज़ समझाएँ।','low','information'),
('schedule-physical-appointment','Schedule physical appointment','प्रत्यक्ष मुलाकात तय करें','Schedule an appointment at an official location.','आधिकारिक स्थान पर मुलाकात तय करें।','low','scheduling'),
('provide-official-callback','Provide official callback','आधिकारिक संपर्क दें','Provide a verified callback channel.','सत्यापित संपर्क माध्यम दें।','low','safety'),
('share-case-reference','Share case reference','मामला संदर्भ साझा करें','Share a non-secret case reference.','गैर-गोपनीय मामला संदर्भ साझा करें।','low','information'),
('confirm-delivery-window','Confirm delivery window','डिलीवरी समय की पुष्टि','Confirm a delivery time window.','डिलीवरी समय की पुष्टि करें।','low','delivery'),
('reschedule-delivery','Reschedule delivery','डिलीवरी फिर तय करें','Change the delivery window.','डिलीवरी समय बदलें।','low','delivery'),
('request-otp','Request OTP','OTP माँगना','Ask for a one-time password.','एक-बार पासवर्ड माँगना।','critical','credential'),
('request-pin','Request PIN','PIN माँगना','Ask for a PIN.','PIN माँगना।','critical','credential'),
('request-upi-pin','Request UPI PIN','UPI PIN माँगना','Ask for a UPI PIN.','UPI PIN माँगना।','critical','payment'),
('request-cvv','Request CVV','CVV माँगना','Ask for a card security code.','कार्ड सुरक्षा कोड माँगना।','critical','credential'),
('request-password','Request password','पासवर्ड माँगना','Ask for an account password.','खाता पासवर्ड माँगना।','critical','credential'),
('request-screen-sharing','Request screen sharing','स्क्रीन साझा करवाना','Ask the citizen to share their screen.','नागरिक से स्क्रीन साझा करवाना।','high','device'),
('request-remote-access-installation','Request remote access installation','रिमोट ऐप इंस्टॉल करवाना','Ask to install remote access software.','रिमोट एक्सेस सॉफ्टवेयर इंस्टॉल करवाना।','critical','device'),
('demand-personal-upi-transfer','Demand personal UPI transfer','निजी UPI भुगतान माँगना','Demand payment to a personal UPI account.','निजी UPI खाते में भुगतान माँगना।','critical','payment'),
('demand-immediate-security-deposit','Demand immediate deposit','तुरंत जमा माँगना','Demand an immediate security deposit.','तुरंत सुरक्षा जमा माँगना।','critical','payment'),
('threaten-digital-arrest','Threaten digital arrest','डिजिटल गिरफ्तारी की धमकी','Threaten arrest over a call.','कॉल पर गिरफ्तारी की धमकी देना।','critical','coercion'),
('request-crypto-transfer','Request cryptocurrency','क्रिप्टो भुगतान माँगना','Request cryptocurrency payment.','क्रिप्टो भुगतान माँगना।','critical','payment'),
('request-gift-card-payment','Request gift card','गिफ्ट कार्ड माँगना','Request payment through gift cards.','गिफ्ट कार्ड से भुगतान माँगना।','critical','payment');

create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id, display_name, platform_role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 'citizen')
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger auth_user_profile after insert on auth.users for each row execute function private.handle_new_user();
