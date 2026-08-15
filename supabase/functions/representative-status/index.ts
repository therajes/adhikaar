import { json, preflight, serviceClient, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  try {
    const session = userClient(request)
    const { data: { user } } = await session.auth.getUser()
    if (!user) return respond({ error: { code: 'authentication_required' } }, 401)
    const database = serviceClient()
    const { data: membership } = await database.from('institution_memberships').select('institution_id,membership_role')
      .eq('user_id', user.id).eq('status', 'active').limit(1).maybeSingle()
    if (!membership) return respond({ error: { code: 'membership_required' } }, 403)
    const { data: representative } = await database.from('representatives').select('id,institution_id,status,auth_user_id,created_at')
      .eq('institution_id', membership.institution_id).eq('display_name', 'Aarav Sharma — DEMO')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!representative) return respond({ schemaVersion: 1, representative: null })
    const { data: revocation } = await database.from('revocations').select('id').eq('subject_type', 'representative').eq('subject_id', representative.id).limit(1).maybeSingle()
    const revoked = representative.status === 'revoked' || Boolean(revocation)
    return respond({ schemaVersion: 1, representative: { id: representative.id, institutionId: representative.institution_id, revoked, replacementPending: revoked && !representative.auth_user_id } })
  } catch { return respond({ error: { code: 'status_unavailable' } }, 400) }
})
