# Database schema

The `public` schema contains profiles, institutions, protected memberships, consortium validators and approvals, action definitions, signed policy versions, representatives, mandates, nonce consumptions, immutable revocations, registry snapshots, safe callbacks, minimised verification events, append-only audit events, settings, and rate-limit buckets.

Every exposed table has RLS. Authorization derives from membership and protected app metadata—not user-editable profile metadata. Security-definer functions set an explicit empty search path and use schema-qualified identifiers. Signed payloads and audit rows are immutable; status changes use constrained transitions.

Run `npx supabase test db` for the pgTAP RLS and immutability suite.
