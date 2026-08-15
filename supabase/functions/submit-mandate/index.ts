import { body, json, preflight, serviceClient, stableStringify, userClient } from '../_shared/http.ts'

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  if (request.method !== 'POST') return respond({ error: { code: 'method_not_allowed' } }, 405)
  try {
    const input = await body(request)
    const session = userClient(request)
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user) return respond({ error: { code: 'authentication_required' } }, 401)
    const mandate = input.mandate as Record<string, unknown>
    const signature = String(input.signature ?? '')
    const canonicalHash = String(input.canonicalHash ?? '')
    if (!mandate || typeof mandate !== 'object' || !/^[A-Za-z0-9_-]{80,100}$/u.test(signature) || !/^[A-Za-z0-9_-]{40,100}$/u.test(canonicalHash)) throw new Error('invalid_payload')
    const database = serviceClient()
    const { data: representative } = await database.from('representatives').select('*').eq('auth_user_id', user.id).eq('status', 'active').single()
    if (!representative) return respond({ error: { code: 'active_credential_required' } }, 403)
    const { data: revocation } = await database.from('revocations').select('id')
      .eq('subject_type', 'representative').eq('subject_id', representative.id).limit(1).maybeSingle()
    if (revocation) return respond({ error: { code: 'credential_revoked' } }, 403)
    const policyId = String(mandate.policyId ?? '')
    const policyVersion = Number(mandate.policyVersion ?? 0)
    const { data: policy } = await database.from('policy_versions').select('*').eq('institution_id', representative.institution_id).eq('policy_code', policyId).eq('version', policyVersion).eq('status', 'active').single()
    if (!policy) return respond({ error: { code: 'active_policy_required' } }, 403)
    const requested = Array.isArray(mandate.requestedActionCodes) ? mandate.requestedActionCodes.map(String) : []
    const permitted = new Set<string>((policy.policy_json.permittedActionCodes ?? []).map(String))
    if (!requested.length || requested.some(action => !permitted.has(action))) return respond({ error: { code: 'action_not_permitted' } }, 403)
    const issuedAt = Number(mandate.issuedAt); const expiresAt = Number(mandate.expiresAt)
    if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt) || expiresAt <= issuedAt || expiresAt - issuedAt > Number(policy.policy_json.maximumMandateLifetime ?? 90)) throw new Error('invalid_ttl')
    const publicKey = await crypto.subtle.importKey('jwk', representative.public_key_jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const validSignature = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, decodeBase64Url(signature).buffer as ArrayBuffer, new TextEncoder().encode(stableStringify(mandate)))
    if (!validSignature) return respond({ error: { code: 'invalid_signature' } }, 400)
    const { error } = await database.from('mandates').insert({
      mandate_id: String(mandate.mandateId), verification_code: String(mandate.verificationCode),
      institution_id: representative.institution_id, representative_id: representative.id,
      representative_credential_id: representative.credential_id, policy_version_id: policy.id,
      mandate_json: mandate, canonical_hash: canonicalHash, signature,
      citizen_challenge_digest: String(mandate.citizenChallengeDigest),
      nonce_hash: String(input.nonceHash), issued_at: new Date(issuedAt * 1000).toISOString(), expires_at: new Date(expiresAt * 1000).toISOString(),
    })
    if (error) throw error
    return respond({ schemaVersion: 1, accepted: true, verificationCode: mandate.verificationCode }, 201)
  } catch {
    return respond({ error: { code: 'invalid_request', message: 'The signed proof was not accepted.' } }, 400)
  }
})
