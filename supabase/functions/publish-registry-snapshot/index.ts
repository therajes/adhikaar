import { body, json, preflight, serviceClient, userClient } from '../_shared/http.ts'

Deno.serve(async (request) => {
  const options = preflight(request); if (options) return options
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  try {
    const session = userClient(request); const { data: { user } } = await session.auth.getUser()
    if (!user) return respond({ error: { code: 'authentication_required' } }, 401)
    const database = serviceClient()
    const { data: profile } = await database.from('profiles').select('platform_role').eq('id', user.id).single()
    if (!profile || !['validator','platform_admin'].includes(profile.platform_role)) return respond({ error: { code: 'not_authorised' } }, 403)
    const input = await body(request, 8192)
    const root = String(input.merkleRoot ?? '')
    if (!/^0x[0-9a-fA-F]{64}$/u.test(root)) throw new Error('invalid_root')
    const { data, error } = await database.from('registry_snapshots').insert({ snapshot_type: input.snapshotType, version: input.version, merkle_root: root, previous_root: input.previousRoot || null, leaf_count: input.leafCount, chain_id: input.chainId, contract_address: input.contractAddress, transaction_hash: input.transactionHash || null, block_number: input.blockNumber || null, status: 'active', published_at: new Date().toISOString() }).select().single()
    if (error) throw error
    return respond({ schemaVersion: 1, snapshot: data }, 201)
  } catch { return respond({ error: { code: 'invalid_request' } }, 400) }
})
