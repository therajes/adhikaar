# Cryptographic protocol

- Representative keys: WebCrypto P-256 ECDSA, non-exportable private key, IndexedDB persistence.
- Signature format: JOSE-compatible raw 64-byte `r || s`, base64url without padding.
- Canonical form: typed RFC 8785-compatible JSON subset; unknown schema versions fail closed.
- Challenge: eight normalized characters excluding visually ambiguous symbols.
- Lookup: six characters; lookup errors are uniform.
- Nonce: at least 128 bits of randomness; consumed atomically after local verification.
- Default TTL: 90 seconds.
- Policy: requested actions are a strict allowlist. Absence means denial.
- Registry: Merkle proofs connect institution, policy, and revocation leaves to two-of-three witnessed roots.

Swift owns verdict precedence. TypeScript performs WebCrypto and transport operations but cannot substitute a verdict when Wasm is unavailable.
