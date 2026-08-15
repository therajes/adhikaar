import { body, json, preflight, serviceClient, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  try {
    const session = userClient(request)
    const { data: { user } } = await session.auth.getUser()
    if (!user) return respond({ error: { code: 'authentication_required' } }, 401)
    const input = await body(request, 2048)
    const institutionId = String(input.institutionId ?? '')
    const representativeId = String(input.representativeId ?? '')
    if (!/^[0-9a-f-]{36}$/u.test(institutionId) || !/^[0-9a-f-]{36}$/u.test(representativeId)) throw new Error('invalid_request')

    const database = serviceClient()
    const { data: membership } = await database.from('institution_memberships').select('id')
      .eq('institution_id', institutionId).eq('user_id', user.id)
      .eq('membership_role', 'institution_admin').eq('status', 'active').maybeSingle()
    if (!membership) return respond({ error: { code: 'not_authorised' } }, 403)

    const { data: representative } = await database.from('representatives').select('id,display_name')
      .eq('id', representativeId).eq('institution_id', institutionId).maybeSingle()
    if (!representative || representative.display_name !== 'Aarav Sharma — DEMO') return respond({ error: { code: 'demo_subject_required' } }, 400)
    const { data: revocation } = await database.from('revocations').select('id')
      .eq('subject_type', 'representative').eq('subject_id', representativeId)
      .in('reason_code', ['judge_demo_revocation', 'customer_complaint_confirmed']).limit(1).maybeSingle()
    if (!revocation) return respond({ error: { code: 'immutable_revocation_required' } }, 409)

    const { error } = await database.from('representatives').update({
      status: 'revoked', revoked_at: new Date().toISOString(), auth_user_id: null
    }).eq('id', representativeId).eq('institution_id', institutionId)
    if (error) throw error
    return respond({ schemaVersion: 1, replacementAuthorised: true, oldRevocationPreserved: true })
  } catch {
    return respond({ error: { code: 'replacement_failed' } }, 400)
  }
})
