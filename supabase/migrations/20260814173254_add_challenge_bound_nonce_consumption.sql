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
  update public.mandates
    set first_verified_at = coalesce(first_verified_at, now()), verification_count = verification_count + 1
    where id = p_mandate_id;
  return jsonb_build_object('consumed', true, 'same_session', true, 'consumed_at', now());
exception when unique_violation then
  select * into existing from public.nonce_consumptions where nonce_hash = p_nonce_hash;
  return jsonb_build_object('consumed', true, 'same_session', existing.anonymous_session_hash = p_session_hash, 'consumed_at', existing.consumed_at);
end;
$$;

revoke all on function public.consume_mandate(text,uuid,text) from public, anon, authenticated;
grant execute on function public.consume_mandate(text,uuid,text) to service_role;
