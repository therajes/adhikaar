import { json } from '../_shared/http.ts'

Deno.serve((request) => {
  const respond = (payload: unknown, status = 200) => json(payload, status, request)
  const enabled = Deno.env.get('DEMO_BOOTSTRAP_ENABLED') === 'true'
  // This function is intentionally never deployed. Local execution still requires
  // an explicit flag so an accidental function serve does not expose bootstrap state.
  if (!enabled) return respond({ error: { code: 'disabled_outside_local_demo' } }, 403)
  return respond({ schemaVersion: 1, ready: true, message: 'Use supabase/seed.sql for idempotent fictional demo data.' })
})
