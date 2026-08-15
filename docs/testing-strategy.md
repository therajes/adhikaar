# Testing strategy

- Swift XCTest covers canonicalization, challenge normalization, verdict precedence, authorization, expiry, replay, revocation, tampering, and stale trust.
- Vitest shares deterministic attack fixtures with the browser lab.
- Foundry covers governance threshold, duplicate approvals, proposal execution, registration, rotation, roots, suspension/revocation, and hash-only events.
- pgTAP covers RLS, grants, immutable rows, transition controls, protected demo identities/memberships, and seeded action policy.
- Playwright covers role-separated Supabase login, wrong-role denial, the real cross-device receiver/employee flow, browser key creation, real Wasm verdicts, all 12 attacks, live revocation, Hindi, keyboard use, and mobile layouts.
- k6 measures the public resolver. OWASP ZAP baseline is run against the local web service before release when the scanner image is available.
