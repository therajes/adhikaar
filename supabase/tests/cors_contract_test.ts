Deno.env.set('ALLOWED_ORIGINS', 'http://127.0.0.1:4173')

const { preflight } = await import('../functions/_shared/http.ts')

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, received ${String(actual)}`)
}

function requestFor(origin: string): Request {
  return new Request('http://127.0.0.1/functions/v1/enrol-device', {
    method: 'OPTIONS',
    headers: {
      Origin: origin,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization, apikey, content-type',
    },
  })
}

Deno.test('CORS preflight allows an exact configured origin and varies by Origin', () => {
  const response = preflight(requestFor('http://127.0.0.1:4173'))
  if (!response) throw new Error('Expected a preflight response')
  assertEqual(response.status, 204, 'Allowed preflight status')
  assertEqual(response.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4173', 'Allowed origin')
  assertEqual(response.headers.get('vary'), 'Origin', 'Cache variation')
})

Deno.test('CORS preflight rejects an untrusted origin without reflecting it', async () => {
  const response = preflight(requestFor('https://untrusted.example'))
  if (!response) throw new Error('Expected a preflight response')
  assertEqual(response.status, 403, 'Rejected preflight status')
  assertEqual(response.headers.get('access-control-allow-origin'), null, 'Rejected allow-origin header')
  assertEqual(response.headers.get('vary'), 'Origin', 'Cache variation')
  assertEqual(await response.text(), JSON.stringify({ error: { code: 'origin_not_allowed' } }), 'Error envelope')
})
