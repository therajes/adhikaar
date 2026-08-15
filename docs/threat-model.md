# Threat model

## Protected claims

- A valid signature proves possession of the enrolled representative key, not blanket permission.
- Requested actions are allowed only when explicitly present in a current signed policy.
- A citizen challenge binds the proof to the current interaction.
- Short expiry, nonce consumption, revocation, and witnessed trust roots reduce replay and stale-trust risk.

## Adversaries

- An impersonator without the representative key.
- A genuine or compromised representative client requesting an off-policy action.
- A network attacker altering an evidence bundle.
- Cross-tenant users attempting to enumerate mandates or administer another institution.
- A database-only institution absent from consortium-witnessed trust state.

## Out of scope

A fully compromised receiver device, dishonest consortium majority, compromised institution root key, telephone routing authenticity, coercion, malware controlling both endpoints, and deepfake detection.
