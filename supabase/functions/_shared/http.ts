import { createClient } from 'npm:@supabase/supabase-js@2.57.4'

const defaultOrigins = [
  'https://adhikaar-web.vercel.app',
  'https://adhikaar.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].join(',')

const configuredOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? Deno.env.get('ALLOWED_ORIGIN') ?? defaultOrigins)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const allowedOriginFor = (request?: Request): string | undefined => {
  if (configuredOrigins.includes('*')) return '*'
  const origin = request?.headers.get('Origin')
  if (!origin) return configuredOrigins[0]
  return configuredOrigins.includes(origin) ? origin : undefined
}

export const securityHeaders = (request?: Request): Record<string, string> => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '600',
    'Cache-Control': 'no-store',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
    'Cross-Origin-Resource-Policy': 'same-site',
    'Referrer-Policy': 'no-referrer',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff',
  }
  const allowedOrigin = allowedOriginFor(request)
  if (allowedOrigin) headers['Access-Control-Allow-Origin'] = allowedOrigin
  return headers
}

export const json = (body: unknown, status = 200, request?: Request) =>
  new Response(JSON.stringify(body), { status, headers: { ...securityHeaders(request), 'Content-Type': 'application/json' } })

export const preflight = (request: Request): Response | undefined => {
  if (request.method !== 'OPTIONS') return undefined
  if (request.headers.get('Origin') && !allowedOriginFor(request)) {
    return json({ error: { code: 'origin_not_allowed' } }, 403, request)
  }
  return new Response(null, { status: 204, headers: securityHeaders(request) })
}

export function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) throw new Error('server_configuration_error')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function userClient(request: Request) {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')
  if (!url || !key) throw new Error('server_configuration_error')
  return createClient(url, key, {
    global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function body(request: Request, maximumBytes = 16_384): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > maximumBytes) throw new Error('payload_too_large')
  const value: unknown = await request.json()
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid_body')
  return value as Record<string, unknown>
}

export async function sha256(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))
  let binary = ''
  bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
}

export async function rateLimit(key: string, limit = 12, seconds = 60): Promise<boolean> {
  const database = serviceClient()
  const window = new Date(Math.floor(Date.now() / (seconds * 1000)) * seconds * 1000).toISOString()
  const { data } = await database.from('rate_limit_buckets').select('request_count').eq('requester_hash', key).eq('bucket_start', window).maybeSingle()
  if ((data?.request_count ?? 0) >= limit) return false
  if (data) {
    await database.from('rate_limit_buckets').update({ request_count: data.request_count + 1 }).eq('requester_hash', key).eq('bucket_start', window)
  } else {
    await database.from('rate_limit_buckets').insert({ requester_hash: key, bucket_start: window })
  }
  return true
}
