import { body, json, preflight, serviceClient, sha256, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  try {
    const session = userClient(request); const { data: { user } } = await session.auth.getUser()
    if (!user) return respond({ error: { code: 'authentication_required' } }, 401)
    const input = await body(request, 4096)
    const institutionId = String(input.institutionId ?? '')
    const subjectType = String(input.subjectType ?? '')
    const subjectId = String(input.subjectId ?? '')
    if (!/^[0-9a-f-]{36}$/u.test(institutionId) || !['representative','credential','policy','mandate','key'].includes(subjectType) || !subjectId) throw new Error('invalid_request')
    const database = serviceClient()
    const { data: membership } = await database.from('institution_memberships').select('id').eq('institution_id', institutionId).eq('user_id', user.id).eq('membership_role', 'institution_admin').eq('status', 'active').maybeSingle()
    if (!membership) return respond({ error: { code: 'not_authorised' } }, 403)
    const leafHash = await sha256(`ADHIKAAR:REVOCATION:V1:${institutionId}:${subjectType}:${subjectId}:${new Date().toISOString()}`)
    const { data, error } = await database.from('revocations').insert({ institution_id: institutionId, subject_type: subjectType, subject_id: subjectId, reason_code: String(input.reasonCode ?? 'security_action'), reason_text: String(input.reasonText ?? '').slice(0, 300), leaf_hash: leafHash, created_by: user.id }).select('id,effective_at,leaf_hash').single()
    if (error) throw error
    if (subjectType === 'representative') {
      const { error: statusError } = await database.from('representatives').update({ status: 'revoked', revoked_at: new Date().toISOString() }).eq('id', subjectId).eq('institution_id', institutionId)
      if (statusError) throw statusError
    }
    return respond({ schemaVersion: 1, revocation: data }, 201)
  } catch { return respond({ error: { code: 'invalid_request' } }, 400) }
})
