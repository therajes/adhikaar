# ADHIKAAR

**Authenticated Delegation for Human Interactions using Key-bound Action Authorization and Registry**

> Do not merely verify who is contacting you. Verify what they are authorised to ask.

ADHIKAAR is a role-separated, two-sided cybersecurity demonstration. A signed-in citizen creates a private challenge and verifies a short-lived interaction proof; an authenticated institution employee issues that proof from a separate device and dashboard. Supabase Auth and RLS-protected memberships control dashboard access. The final security verdict is made by Swift compiled to WebAssembly, using signed policy evidence, revocation state and a consortium-witnessed registry root.

## X-factor

Identity is not authority. A genuine representative requesting an OTP receives **AUTHENTIC REPRESENTATIVE — UNAUTHORISED REQUEST** because the organisation's signed policy does not permit that action.

## Architecture

- **SwiftWasm:** canonicalisation, policy evaluation, Merkle validation, freshness and deterministic verdicts.
- **Supabase:** password authentication, protected role/membership records, cross-device proof exchange, RLS, Edge Functions, revocations and privacy-minimised audit events.
- **Anvil/Solidity:** local two-of-three consortium registry that witnesses public-key, policy and revocation roots without storing personal data.
- **Vite/TypeScript:** accessible UI, routing, WebCrypto, IndexedDB, QR and network bridges only.

Blockchain does not prove that an organisation is honest. It makes changes to the consortium-approved trust state independently visible. Supabase RLS is defence in depth, not protection from a database owner.

## Quick start

```bash
make doctor
make bootstrap
make dev
```

Open `http://localhost:5173`. `make dev` keeps Vite, local Supabase, Edge Functions and deterministic Anvil services together. The login gateway redirects each account to its allowed dashboard.

### Fictional demo credentials

| Role | Email | Password | Dashboard |
|---|---|---|---|
| Citizen / receiver | `citizen.demo@example.com` | `Citizen@2026` | `/verify` |
| Organisation employee | `aarav.employee@example.com` | `Employee@2026` | `/representative` |
| Institution administrator | `meera.admin@example.com` | `Admin@2026` | `/institution` |

The login page also offers one-click judge access. These accounts contain no real identity or institution data. A citizen cannot open the employee dashboard, an employee cannot open institution administration, and role values are read from protected database membership—not editable browser or user metadata.

## How it works with a phone call

ADHIKAAR does not listen to, record or classify speech. During a call:

1. The citizen reads a fresh eight-character challenge.
2. The authenticated employee selects the declared purpose and only institution-approved actions.
3. Their enrolled, non-exportable P-256 key signs the challenge digest, actions, policy version, nonce and 90-second expiry.
4. Supabase exchanges the evidence between the employee and citizen devices.
5. SwiftWasm independently checks signature, challenge, policy, registry, revocation, freshness and replay state.

Production call-centre integration can add the mandate link to a CRM/softphone screen, send it through registered SMS/RCS, or expose it through IVR. The challenge remains the citizen-controlled binding to the exact interaction.

## Verification

```bash
make test
make test-e2e
make test-chain
make attack-suite
make build
make security-scan
```

## Safety and limitations

This is a fictional sandbox. It does not prevent every scam, authenticate telephone routing, detect deepfakes, understand undeclared spoken requests, guarantee institution honesty, or protect a fully compromised endpoint. See `docs/security-limitations.md` and `docs/project-claims.md`.

The browser creates and uses a real non-exportable P-256 employee key, while the free hosted enrolment function uses a labelled lab issuer attestation. A production institution must replace that field with an HSM/KMS signature anchored to its consortium-witnessed key.
