create table public.customer_complaints (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  representative_id uuid not null references public.representatives(id),
  mandate_id uuid not null references public.mandates(id),
  citizen_user_id uuid not null references public.profiles(id),
  message text not null check (char_length(message) between 10 and 1000),
  status text not null default 'pending' check (status in ('pending','dismissed','credential_revoked')),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (mandate_id, citizen_user_id)
);

create index customer_complaints_institution_status_idx
  on public.customer_complaints(institution_id, status, created_at desc);

alter table public.customer_complaints enable row level security;
revoke all on public.customer_complaints from anon, authenticated;
