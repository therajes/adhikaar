# Consortium registry

`AdhikaarRegistry.sol` requires two distinct approvals from three validators for institution registration, key rotation, root publication, suspension, and revocation. Duplicate approvals and proposal re-execution are rejected.

Contract state and events contain only addresses, identifiers, versions, status, and hashes. Citizen challenges, names, phone numbers, mandate content, representative identities, and verification events are never accepted.

The guaranteed demonstration chain is local Anvil, chain ID `31337`. Blockchain is an independent witness of approved trust-state changes; it is not presented as proof that an institution is honest.
