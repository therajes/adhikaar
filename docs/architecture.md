# Architecture

ADHIKAAR separates evidence transport from the security decision.

1. A receiver creates an eight-character challenge locally.
2. The employee dashboard binds that challenge to a 128-bit-or-greater nonce, a purpose, explicit requested actions, and a 90-second expiry.
3. A non-exportable P-256 browser key signs the canonical mandate.
4. Supabase resolves the evidence bundle but never returns a trusted verdict.
5. Swift WebAssembly verifies freshness, challenge binding, signatures, default-deny policy, revocation, registry consistency, and replay state in the receiver's browser.
6. The Solidity registry witnesses institution, policy, and revocation roots through two-of-three governance. It accepts no personal data.

The local demo stores newly issued proofs in same-origin browser storage so the complete flow works without production employee identities. Hosted Supabase contains the production-shaped schema and Edge Functions; authenticated issuance requires a deliberately enrolled fictional employee.

## Employee enrolment

An institution administrator invites an employee through the institution's existing identity/HR process, assigns a protected membership with role and allowed purpose, and initiates device enrolment. The browser generates a non-exportable P-256 key; only its public JWK leaves the device. The production protocol has the institution sign a credential binding that public key to the institution, employee record, role, permitted purpose, validity period and key identifier. The free demo uses a clearly labelled lab issuer attestation after the same protected membership check; an HSM/KMS-backed issuer is a production integration requirement. RLS derives authorization from the protected membership table and app metadata. User-editable metadata never grants authority.

## Phone-call binding and integration

The protocol does not require call interception. A fresh receiver challenge, 90-second expiry and one-time nonce bind the mandate to the current interaction. The prototype exchanges the challenge verbally and the proof through a six-character code or QR. A production integration can embed the representative view in a CRM/softphone, attach the mandate to the call-centre call ID, deliver a signed deep link through registered SMS/RCS, or surface the code through IVR. Call audio remains private.

The protocol proves only the actions declared in the signed mandate. If an employee verbally requests an extra action, the receiver must refuse it because it is absent from the displayed allowlist. ADHIKAAR does not claim to analyse or police speech.
