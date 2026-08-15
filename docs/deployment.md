# Deployment

The repository publishes static frontend output but does not pretend a static host can provide the complete local-chain demo. Build with `make build`; serve `apps/web/dist` behind HTTPS with the documented security headers. Configure the public Supabase URL/key and a reachable consortium RPC endpoint through environment variables.

Only migrations tested locally should be applied to hosted Supabase. Deploy the six hosted Edge Functions and keep `demo-bootstrap` disabled. Production CORS must be set to the exact site origin. Never expose the service-role key, validator private keys, or institution signing keys to browser assets.
