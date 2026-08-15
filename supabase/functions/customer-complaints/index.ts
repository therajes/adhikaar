import { body, json, preflight, serviceClient, sha256, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  try {
    const session = userClient(request)
    const { data: { user } } = await session.auth.getUser()
    if (!user) return respond({ error: { code: 'authentication_required' } }, 401)
    const input = await body(request, 4096)
    const action = String(input.action ?? '')
    const database = serviceClient()
    const { data: profile } = await database.from('profiles').select('display_name,platform_role').eq('id', user.id).single()

    if (action === 'submit') {
      if (profile?.platform_role !== 'citizen') return respond({ error: { code: 'citizen_required' } }, 403)
      const mandateId = String(input.mandateId ?? '')
      const message = String(input.message ?? '').trim()
      if (!/^[0-9a-f-]{36}$/u.test(mandateId) || message.length < 10 || message.length > 1000) return respond({ error: { code: 'invalid_complaint' } }, 400)
      const { data: mandate } = await database.from('mandates').select('id,institution_id,representative_id').eq('mandate_id', mandateId).maybeSingle()
      if (!mandate) return respond({ error: { code: 'proof_not_found' } }, 404)
      const { error } = await database.from('customer_complaints').insert({
        institution_id: mandate.institution_id, representative_id: mandate.representative_id,
        mandate_id: mandate.id, citizen_user_id: user.id, message
      })
      if (error) return respond({ error: { code: error.code === '23505' ? 'already_reported' : 'submission_failed' } }, error.code === '23505' ? 409 : 400)
      return respond({ schemaVersion: 1, submitted: true }, 201)
    }

    const { data: membership } = await database.from('institution_memberships').select('institution_id')
      .eq('user_id', user.id).eq('membership_role', 'institution_admin').eq('status', 'active').maybeSingle()
    if (!membership) return respond({ error: { code: 'administrator_required' } }, 403)

    if (action === 'list') {
      const { data: complaints, error } = await database.from('customer_complaints')
        .select('id,message,status,created_at,representative_id,citizen_user_id,representatives(display_name)')
        .eq('institution_id', membership.institution_id).order('created_at', { ascending: false }).limit(30)
      if (error) throw error
      const citizenIds = [...new Set((complaints ?? []).map(item => item.citizen_user_id))]
      const { data: citizens } = citizenIds.length ? await database.from('profiles').select('id,display_name').in('id', citizenIds) : { data: [] }
      const names = new Map((citizens ?? []).map(item => [item.id, item.display_name]))
      return respond({ schemaVersion: 1, complaints: (complaints ?? []).map(item => ({ ...item, citizenName: names.get(item.citizen_user_id) ?? 'Citizen' })) })
    }

    if (action === 'resolve') {
      const complaintId = String(input.complaintId ?? '')
      const decision = String(input.decision ?? '')
      if (!/^[0-9a-f-]{36}$/u.test(complaintId) || !['dismiss','revoke'].includes(decision)) throw new Error('invalid_decision')
      const { data: complaint } = await database.from('customer_complaints').select('id,representative_id,status')
        .eq('id', complaintId).eq('institution_id', membership.institution_id).maybeSingle()
      if (!complaint || complaint.status !== 'pending') return respond({ error: { code: 'complaint_not_pending' } }, 409)
      if (decision === 'revoke') {
        const subjectId = complaint.representative_id
        const { data: existing } = await database.from('revocations').select('id').eq('subject_type', 'representative').eq('subject_id', subjectId).limit(1).maybeSingle()
        if (!existing) {
          const leafHash = await sha256(`ADHIKAAR:REVOCATION:V1:${membership.institution_id}:representative:${subjectId}:${new Date().toISOString()}`)
          const { error } = await database.from('revocations').insert({ institution_id: membership.institution_id, subject_type: 'representative', subject_id: subjectId, reason_code: 'customer_complaint_confirmed', reason_text: 'Administrator confirmed a customer report.', leaf_hash: leafHash, created_by: user.id })
          if (error) throw error
        }
      }
      const { error } = await database.from('customer_complaints').update({
        status: decision === 'revoke' ? 'credential_revoked' : 'dismissed', resolved_by: user.id, resolved_at: new Date().toISOString()
      }).eq('id', complaintId).eq('institution_id', membership.institution_id)
      if (error) throw error
      return respond({ schemaVersion: 1, resolved: true, decision })
    }
    return respond({ error: { code: 'invalid_action' } }, 400)
  } catch {
    return respond({ error: { code: 'complaint_request_failed' } }, 400)
  }
})
