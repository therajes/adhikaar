# Judge defence

**Is this just caller ID?** No. Caller identity and action authority are separate claims; the signed policy binds a representative role and purpose to explicit actions.

**Why blockchain?** It independently witnesses changes to institution keys and trust roots under multi-party governance. It does not store citizen data or replace the operational database.

**Can an admin alter Supabase?** Privileged operators can alter a database. ADHIKAAR therefore calls Supabase evidence tamper-evident, cross-checks witnessed roots, and never describes RLS as absolute immutability.

**Can malware sign a false request?** If it controls an enrolled representative client, it may obtain a genuine signature. The receiver still evaluates the requested actions against the independently signed allowlist; the attack lab demonstrates this exact case.

**Why Swift?** Swift is the single deterministic security core used by native tests and real browser Wasm. The UI fails closed if it cannot load.

**How does ADHIKAAR know what the employee may ask?** The institution—not the employee—publishes a signed, versioned policy mapping a protected role and call purpose to explicit action codes. Authorization is default-deny: an action that is not on the allowlist is rejected even when the employee signature is genuine.

**How are employees registered?** An institution administrator creates an invitation, assigns a protected membership/role, verifies the employee through the institution's existing HR or IAM process, and enrols a browser-generated non-exportable P-256 public key. Employees cannot edit their role, policy, membership or revocation status. The protocol requires the institution to sign the credential containing the public key, role, purpose, validity and institution ID. This free hosted prototype deliberately labels that issuer field as a lab attestation; production replaces it with an HSM/KMS signature anchored to the consortium-witnessed institution key.

**Can someone choose “Organisation” on the login screen and become an employee?** No. The tab only selects the sign-in experience. Supabase Auth verifies the password, then RLS-protected `institution_memberships` decides the role and tenant. The router is convenience; the database and authenticated Edge Functions enforce authority. The wrong-role browser test demonstrates this boundary.

**Can the citizen and employee really use separate phones?** Yes. Mandates are submitted and resolved through rate-limited Supabase Edge Functions. Browser storage only holds each device's own session and key; it is not the proof transport. The end-to-end suite creates isolated browser contexts to prove the cross-device flow.

**How is the proof tied to this exact phone call?** The receiver generates a fresh random eight-character challenge and reads it during the call. The employee's device signs that challenge digest together with the purpose, requested actions, policy version, 90-second expiry and one-time nonce. A proof copied from another call has the wrong challenge; a second session consuming the nonce receives replay.

**Does it listen to or analyse the call?** No. The prototype deliberately avoids call recording, speech recognition and AI. The caller reads a challenge and receives a six-character code or QR. In production the same protocol can sit beside a call-centre dialler, bind to a CRM call ID, arrive through registered SMS/RCS, or integrate into IVR/softphone SDKs.

**What if the employee verbally asks for something they did not declare?** The proof does not authorize it. The receiver sees the exact approved actions and is instructed to refuse anything else. ADHIKAAR proves declared, policy-permitted authority; it does not claim to understand every spoken word. This is an explicit limitation, not a hidden assumption.
