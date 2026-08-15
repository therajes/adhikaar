import { body, json, preflight, serviceClient, sha256, stableStringify, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  if (request.method !== 'POST') return respond({ error: { code: 'method_not_allowed' } }, 405)
  try {
    const session = userClient(request)
    const { data: { user }, error: authError } = await session.auth.getUser()
    if (authError || !user) return respond({ error: { code: 'authentication_required' } }, 401)
    const input = await body(request, 4096)
    const publicKey = input.publicKeyJwk as JsonWebKey | undefined
    if (!publicKey || publicKey.kty !== 'EC' || publicKey.crv !== 'P-256' || typeof publicKey.x !== 'string' || typeof publicKey.y !== 'string' || publicKey.d) {
      return respond({ error: { code: 'invalid_public_key' } }, 400)
    }

    // Importing the key rejects malformed points before anything is persisted.
    await crypto.subtle.importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const database = serviceClient()
    const { data: membership } = await database.from('institution_memberships')
      .select('institution_id,membership_role,status')
      .eq('user_id', user.id).eq('membership_role', 'representative').eq('status', 'active').maybeSingle()
    if (!membership) return respond({ error: { code: 'active_membership_required' } }, 403)
    const { data: profile } = await database.from('profiles').select('display_name').eq('id', user.id).single()
    const keyHash = await sha256(stableStringify(publicKey))
    const now = new Date()
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const credentialId = `cred-${user.id.slice(0, 8)}-${keyHash.slice(0, 12)}`
    const credential = {
      schemaVersion: 1,
      credentialId,
      institutionId: membership.institution_id,
      subjectId: user.id,
      roleCode: 'kyc-officer',
      keyHash,
      issuedAt: Math.floor(now.getTime() / 1000),
      expiresAt: Math.floor(expires.getTime() / 1000),
    }
    const row = {
      institution_id: membership.institution_id,
      auth_user_id: user.id,
      employee_reference_masked: 'BTB-•••-2048',
      display_name: profile?.display_name ?? 'Fictional representative',
      role_code: 'kyc-officer',
      public_key_jwk: publicKey,
      public_key_hash: keyHash,
      key_id: `device-${keyHash.slice(0, 16)}`,
      status: 'active',
      credential_id: credentialId,
      credential_json: credential,
      credential_hash: await sha256(stableStringify(credential)),
      credential_signature: 'LAB_ISSUER_ATTESTATION',
      credential_issued_at: now.toISOString(),
      credential_expires_at: expires.toISOString(),
      created_by: user.id,
      revoked_at: null,
    }
    const { error } = await database.from('representatives').upsert(row, { onConflict: 'auth_user_id,institution_id' })
    if (error) throw error
    return respond({ schemaVersion: 1, enrolled: true, keyId: row.key_id, fingerprint: keyHash.slice(0, 20) })
  } catch {
    return respond({ error: { code: 'enrolment_failed', message: 'This device could not be enrolled.' } }, 400)
  }
})
