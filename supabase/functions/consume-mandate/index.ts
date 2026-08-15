import { body, json, preflight, rateLimit, serviceClient, sha256 } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  if (request.method !== 'POST') return respond({ error: { code: 'method_not_allowed' } }, 405)
  try {
    const input = await body(request, 4096)
    const code = String(input.verificationCode ?? '').toUpperCase()
    const sessionHash = String(input.anonymousSessionHash ?? '')
    const challengeDigest = String(input.challengeDigest ?? '')
    if (!/^[A-HJ-NP-Z2-9]{6}$/u.test(code) || !/^[A-Za-z0-9_-]{32,100}$/u.test(sessionHash) || !/^[A-Za-z0-9_-]{40,100}$/u.test(challengeDigest)) throw new Error('invalid_request')
    if (!await rateLimit(`consume:${await sha256(sessionHash)}`, 8, 60)) return respond({ error: { code: 'try_later' } }, 429)
    const database = serviceClient()
    const { data: mandate } = await database.from('mandates').select('id,nonce_hash,citizen_challenge_digest,status,expires_at').eq('verification_code', code).maybeSingle()
    if (!mandate || mandate.citizen_challenge_digest !== challengeDigest || mandate.status !== 'active' || Date.parse(mandate.expires_at) <= Date.now()) return respond({ error: { code: 'not_consumable' } }, 400)
    const { data, error } = await database.rpc('consume_mandate', { p_nonce_hash: mandate.nonce_hash, p_mandate_id: mandate.id, p_session_hash: sessionHash })
    if (error) throw error
    return respond({ schemaVersion: 1, receipt: data })
  } catch {
    return respond({ error: { code: 'invalid_request', message: 'This proof could not be consumed.' } }, 400)
  }
})
