import { body, json, preflight, rateLimit, serviceClient, sha256 } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  if (request.method !== 'POST') return respond({ error: { code: 'not_available', message: 'The proof could not be resolved.' } }, 405)
  try {
    const input = await body(request, 4096)
    const code = String(input.verificationCode ?? '').toUpperCase().replaceAll(' ', '')
    const sessionHash = String(input.anonymousSessionHash ?? '')
    if (!/^[A-HJ-NP-Z2-9]{6}$/u.test(code) || !/^[A-Za-z0-9_-]{32,100}$/u.test(sessionHash)) throw new Error('invalid_request')
    const requester = await sha256(`${sessionHash}:${new Date().toISOString().slice(0, 13)}`)
    if (!await rateLimit(`resolve:${requester}`)) return respond({ error: { code: 'try_later', message: 'Please wait before trying again.' } }, 429)
    const database = serviceClient()
    const { data: mandate } = await database.from('mandates').select('*').eq('verification_code', code).maybeSingle()
    if (!mandate) return respond({ error: { code: 'not_available', message: 'The proof could not be resolved.' } }, 404)
    const [{ data: representative }, { data: policy }, { data: institution }, { data: snapshots }, { data: revocations }, { data: callback }] = await Promise.all([
      database.from('representatives').select('id,institution_id,display_name,role_code,public_key_jwk,key_id,status,credential_id,credential_json,credential_hash,credential_signature,credential_issued_at,credential_expires_at').eq('id', mandate.representative_id).single(),
      database.from('policy_versions').select('*').eq('id', mandate.policy_version_id).single(),
      database.from('institutions').select('id,slug,display_name,official_domain,status,public_key_jwk,public_key_hash,key_id,registry_leaf_hash,current_registry_snapshot_version').eq('id', mandate.institution_id).single(),
      database.from('registry_snapshots').select('*').eq('status', 'active').order('version', { ascending: false }).limit(3),
      database.from('revocations').select('subject_type,subject_id,reason_code,effective_at,leaf_hash,root_version').or(`institution_id.eq.${mandate.institution_id},institution_id.is.null`),
      database.from('safe_callbacks').select('id,label_en,label_hi,phone_number,website_url,callback_type,verified_at').eq('institution_id', mandate.institution_id).eq('active', true).limit(1).maybeSingle(),
    ])
    return respond({ schemaVersion: 1, evidence: { mandate: mandate.mandate_json, signature: mandate.signature, canonicalHash: mandate.canonical_hash, representative, policy, institution, registrySnapshots: snapshots ?? [], revocations: revocations ?? [], safeCallback: callback, resolvedAt: new Date().toISOString() } })
  } catch {
    return respond({ error: { code: 'invalid_request', message: 'The proof could not be resolved.' } }, 400)
  }
})
