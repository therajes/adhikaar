# Security limitations

ADHIKAAR is tamper-evident and default-deny; it is not magical truth infrastructure.

- A signature proves key possession, not employee honesty.
- A compromised root key can authorize malicious evidence until rotation or revocation is witnessed.
- A compromised receiver browser can misrepresent results.
- Local Anvil is deterministic demonstration infrastructure, not a production consortium.
- Device enrolment is genuinely restricted to active representative memberships and validates the submitted P-256 public key, but the free hosted demo records a labelled lab issuer attestation. A production deployment must have the institution's HSM/KMS sign the employee credential and must validate that issuer signature against the consortium-witnessed institution key.
- Caller ID and telephone network routing are not authenticated.
- The app does not detect voice cloning or deepfakes.
- The hosted demo is not affiliated with a real institution or regulator.

The safe response to any unverified, stale, tampered, replayed, or unexpected request is to stop and use a callback obtained independently.
