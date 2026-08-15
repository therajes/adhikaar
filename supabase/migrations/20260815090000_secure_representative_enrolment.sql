-- One authenticated employee can own at most one representative credential per
-- institution. The active membership remains the source of authority.
create unique index representatives_auth_user_institution_idx
  on public.representatives(auth_user_id, institution_id);
