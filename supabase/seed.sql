-- Fictional sandbox data only. Idempotent and safe to rerun locally.
-- These three public demo accounts exist only so judges can exercise each protected
-- role. They contain no real person or institution data and must never be reused in
-- a production tenant.
insert into auth.users(
  instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at,
  confirmation_token,recovery_token,email_change_token_new,email_change_token_current,
  email_change,phone_change_token,reauthentication_token,is_sso_user,is_anonymous
) values
(
  '00000000-0000-0000-0000-000000000000','60000000-0000-0000-0000-000000000001','authenticated','authenticated',
  'citizen.demo@example.com',extensions.crypt('Citizen@2026',extensions.gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{"display_name":"Priya Nair — DEMO"}'::jsonb,now(),now(),
  '','','','','','','',false,false
),
(
  '00000000-0000-0000-0000-000000000000','60000000-0000-0000-0000-000000000002','authenticated','authenticated',
  'aarav.employee@example.com',extensions.crypt('Employee@2026',extensions.gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{"display_name":"Aarav Sharma — DEMO"}'::jsonb,now(),now(),
  '','','','','','','',false,false
),
(
  '00000000-0000-0000-0000-000000000000','60000000-0000-0000-0000-000000000003','authenticated','authenticated',
  'meera.admin@example.com',extensions.crypt('Admin@2026',extensions.gen_salt('bf')),now(),
  '{"provider":"email","providers":["email"]}'::jsonb,'{"display_name":"Meera Rao — DEMO"}'::jsonb,now(),now(),
  '','','','','','','',false,false
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities(provider_id,user_id,identity_data,provider,last_sign_in_at,created_at,updated_at) values
('60000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000001','{"sub":"60000000-0000-0000-0000-000000000001","email":"citizen.demo@example.com","email_verified":true,"phone_verified":false}'::jsonb,'email',now(),now(),now()),
('60000000-0000-0000-0000-000000000002','60000000-0000-0000-0000-000000000002','{"sub":"60000000-0000-0000-0000-000000000002","email":"aarav.employee@example.com","email_verified":true,"phone_verified":false}'::jsonb,'email',now(),now(),now()),
('60000000-0000-0000-0000-000000000003','60000000-0000-0000-0000-000000000003','{"sub":"60000000-0000-0000-0000-000000000003","email":"meera.admin@example.com","email_verified":true,"phone_verified":false}'::jsonb,'email',now(),now(),now())
on conflict (provider_id,provider) do update set
  identity_data = excluded.identity_data,
  updated_at = now();

insert into public.profiles(id,display_name,platform_role,preferred_language) values
('60000000-0000-0000-0000-000000000001','Priya Nair — DEMO','citizen','en'),
('60000000-0000-0000-0000-000000000002','Aarav Sharma — DEMO','representative','en'),
('60000000-0000-0000-0000-000000000003','Meera Rao — DEMO','institution_admin','en')
on conflict (id) do update set
  display_name = excluded.display_name,
  platform_role = excluded.platform_role,
  preferred_language = excluded.preferred_language,
  updated_at = now();

insert into public.consortium_validators(id, display_name, chain_address, status) values
('10000000-0000-0000-0000-000000000001','Financial Safety Validator — DEMO','0x1111111111111111111111111111111111111111','active'),
('10000000-0000-0000-0000-000000000002','Digital Communications Validator — DEMO','0x2222222222222222222222222222222222222222','active'),
('10000000-0000-0000-0000-000000000003','National Cyber Trust Validator — DEMO','0x3333333333333333333333333333333333333333','active')
on conflict (id) do nothing;

insert into public.institutions(
  id, slug, legal_name, display_name, description, official_domain, status,
  public_key_jwk, public_key_hash, key_id, registry_leaf_hash, current_registry_snapshot_version, approved_at
) values
(
  '20000000-0000-0000-0000-000000000001','adhikaar-bank-lab-demo','Bharat Trust Bank — DEMO',
  'Bharat Trust Bank — DEMO','Fictional institution for KYC safety demonstrations.','bharattrust.demo','active',
  '{"kty":"EC","crv":"P-256","x":"DEMO_PUBLIC_X","y":"DEMO_PUBLIC_Y","key_ops":["verify"],"ext":true}'::jsonb,
  'demo-bank-key-hash','bank-institution-key-v1','demo-bank-registry-leaf',7,now()
),
(
  '20000000-0000-0000-0000-000000000002','metro-university-services-demo','Metro University Services — DEMO',
  'Metro University Services — DEMO','Fictional institution for admissions safety demonstrations.','metrouniversity.demo','active',
  '{"kty":"EC","crv":"P-256","x":"DEMO_PUBLIC_X","y":"DEMO_PUBLIC_Y","key_ops":["verify"],"ext":true}'::jsonb,
  'demo-university-key-hash','university-key-v1','demo-university-registry-leaf',7,now()
),
(
  '20000000-0000-0000-0000-000000000003','bharat-parcel-network-demo','Bharat Parcel Network — DEMO',
  'Bharat Parcel Network — DEMO','Fictional institution for delivery safety demonstrations.','bharatparcel.demo','active',
  '{"kty":"EC","crv":"P-256","x":"DEMO_PUBLIC_X","y":"DEMO_PUBLIC_Y","key_ops":["verify"],"ext":true}'::jsonb,
  'demo-parcel-key-hash','parcel-key-v1','demo-parcel-registry-leaf',7,now()
)
on conflict (id) do nothing;

insert into public.institution_memberships(id,institution_id,user_id,membership_role,status) values
('70000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000002','representative','active'),
('70000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','60000000-0000-0000-0000-000000000003','institution_admin','active')
on conflict (institution_id,user_id) do update set membership_role = excluded.membership_role, status = 'active';

insert into public.safe_callbacks(id,institution_id,label_en,label_hi,phone_number,website_url,callback_type,active,verified_at) values
('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','Fictional demonstration number','काल्पनिक प्रदर्शन नंबर','1800-000-2026','https://bharattrust.demo/safety','phone',true,now()),
('30000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000002','Fictional admissions desk','काल्पनिक प्रवेश संपर्क','1800-000-2027','https://metrouniversity.demo/safety','phone',true,now()),
('30000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000003','Fictional delivery desk','काल्पनिक डिलीवरी संपर्क','1800-000-2028','https://bharatparcel.demo/safety','phone',true,now())
on conflict (id) do nothing;

insert into public.policy_versions(
  id,institution_id,policy_code,version,role_code,purpose_code,title_en,title_hi,policy_json,
  canonical_hash,signature,institution_key_id,status,valid_from,published_at,registry_root
) values (
  '40000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001',
  'bank-kyc-review',1,'kyc-officer','bank-kyc-review','Bank KYC Review','बैंक KYC समीक्षा',
  '{"schemaVersion":1,"policyId":"bank-kyc-review","version":1,"institutionId":"bharat-trust-bank-demo","roleCode":"kyc-officer","purposeCode":"bank-kyc-review","permittedActionCodes":["confirm-masked-reference","explain-required-documents","schedule-physical-appointment","provide-official-callback"],"prohibitedActionCodes":["request-otp","request-pin","request-upi-pin","request-cvv","request-password","request-screen-sharing","request-remote-access-installation","demand-personal-upi-transfer"],"maximumMandateLifetime":90,"superseded":false}'::jsonb,
  'demo-policy-canonical-hash','DEMO_SIGNATURE_NOT_PRODUCTION','bank-institution-key-v1','active',now(),now(),'0x4f7c2e7d8f3ademoregistryroot'
) on conflict (id) do nothing;

insert into public.registry_snapshots(
  id,snapshot_type,version,merkle_root,previous_root,leaf_count,chain_id,contract_address,transaction_hash,block_number,status,published_at
) values
('50000000-0000-0000-0000-000000000001','institution',7,'0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',null,3,31337,'0x5FbDB2315678afecb367f032d93F642f64180aa3','0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',1,'active',now()),
('50000000-0000-0000-0000-000000000002','policy',1,'0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',null,1,31337,'0x5FbDB2315678afecb367f032d93F642f64180aa3','0xdddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',2,'active',now()),
('50000000-0000-0000-0000-000000000003','revocation',1,'0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',null,0,31337,'0x5FbDB2315678afecb367f032d93F642f64180aa3','0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',3,'active',now())
on conflict (id) do nothing;
