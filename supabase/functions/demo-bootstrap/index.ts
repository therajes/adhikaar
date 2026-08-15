import { json } from '../_shared/http.ts'

Deno.serve(() => {
  const enabled = Deno.env.get('DEMO_BOOTSTRAP_ENABLED') === 'true'
  // This function is intentionally never deployed. Local execution still requires
  // an explicit flag so an accidental function serve does not expose bootstrap state.
  if (!enabled) return json({ error: { code: 'disabled_outside_local_demo' } }, 403)
  return json({ schemaVersion: 1, ready: true, message: 'Use supabase/seed.sql for idempotent fictional demo data.' })
})
