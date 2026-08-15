# Supabase security review

Hosted project: `ADHIKAAR` (`yjwwrainneuqpzcppurb`, `ap-south-1`).

- The inactive matching project was restored; no unrelated project was changed.
- Six hosted functions are active: `resolve-mandate`, `consume-mandate`, `enrol-device`, `submit-mandate`, `revoke-subject`, and `publish-registry-snapshot`.
- `demo-bootstrap` is local-only and was not deployed.
- Public resolve/consume routes implement strict validation, payload limits, rate limiting, uniform lookup errors, restricted CORS, and no-store security headers.
- Privileged mutations require gateway JWT validation and institution/validator authorization. A hosted negative test confirmed that a citizen receives HTTP 403 from `enrol-device`, while the protected employee membership succeeds.
- Three visibly fictional demo identities are active. Profiles and organisation roles are stored in protected application tables; user-editable metadata is not an authorization source.
- Hosted security advisors report no database/RLS finding. Supabase reports one project-level warning because leaked-password protection is not enabled on the current project plan/configuration; enable it before accepting non-demo users. [Supabase password security guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- Performance advisors report only informational unused-index notices, expected for a newly seeded demonstration with negligible traffic. Those indexes protect intended production query paths and were retained.
