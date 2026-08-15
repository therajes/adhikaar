import type { Evidence, Verdict } from '../types'
import { bankPolicy } from '../services/demoStore'

const base = (): Evidence => {
  const now = Math.floor(Date.now() / 1000)
  return {
    schemaVersion: 1,
    mandate: { schemaVersion: 1, mandateId: 'fixture-valid', verificationCode: 'SAFE24', institutionId: bankPolicy.institutionId, representativeId: 'aarav-sharma-demo', representativeDisplayName: 'Aarav Sharma — DEMO', roleCode: bankPolicy.roleCode, purposeCode: bankPolicy.purposeCode, requestedActionCodes: ['confirm-masked-reference'], citizenChallengeSalt: 'FIXTURE-SALT', citizenChallengeDigest: 'FIXTURE-DIGEST', nonce: '00112233445566778899aabbccddeeff', issuedAt: now - 10, expiresAt: now + 80, policyId: bankPolicy.policyId, policyVersion: 1, registryRoot: '0xfixture-root' },
    policy: { ...bankPolicy }, signatureValid: true, credentialSignatureValid: true, registryProofValid: true,
    registryRootMatches: true, institutionKnown: true, revoked: false, nonceConsumedByOtherSession: false,
    challengeMatches: true, trustAgeSeconds: 1, maximumTrustAgeSeconds: 300, evaluatedAt: now
  }
}

export interface AttackCase { id: string; title: string; change: string; expected: Verdict; evidence: Evidence }

export function attacks(): AttackCase[] {
  const fake = base(); fake.credentialSignatureValid = false
  const tampered = base(); tampered.signatureValid = false
  const unauthorised = base(); unauthorised.mandate = { ...unauthorised.mandate, requestedActionCodes: ['request-otp'] }
  const expired = base(); expired.mandate = { ...expired.mandate, expiresAt: expired.evaluatedAt - 1 }
  const revoked = base(); revoked.revoked = true
  const challenge = base(); challenge.challengeMatches = false
  const replay = base(); replay.nonceConsumedByOtherSession = true
  const unknown = base(); unknown.institutionKnown = false
  const dbOnly = base(); dbOnly.institutionKnown = false; dbOnly.mandate = { ...dbOnly.mandate, institutionId: 'database-only-fraud-demo' }
  const superseded = base(); superseded.policy = { ...superseded.policy, superseded: true }
  const stale = base(); stale.trustAgeSeconds = 901
  const merkle = base(); merkle.registryProofValid = false
  return [
    { id: 'fake-representative', title: 'Copied employee identity', change: 'Credential signature is missing.', expected: 'UNVERIFIED', evidence: fake },
    { id: 'payload-tampering', title: 'One-character payload change', change: 'Content changed after signing.', expected: 'TAMPERED', evidence: tampered },
    { id: 'unauthorised-action', title: 'Genuine employee asks for OTP', change: 'Identity remains valid; action violates policy.', expected: 'AUTHENTIC_UNAUTHORISED', evidence: unauthorised },
    { id: 'expired', title: 'Expired interaction proof', change: 'The 90-second window ended.', expected: 'EXPIRED', evidence: expired },
    { id: 'revoked', title: 'Revoked employee', change: 'Credential appears in the current revocation set.', expected: 'REVOKED', evidence: revoked },
    { id: 'wrong-challenge', title: 'Wrong receiver challenge', change: 'Proof belongs to another session.', expected: 'CHALLENGE_MISMATCH', evidence: challenge },
    { id: 'replay', title: 'Copied proof replay', change: 'Another session consumed the nonce.', expected: 'REPLAY', evidence: replay },
    { id: 'unknown-institution', title: 'Unknown institution', change: 'No approved institution record exists.', expected: 'UNVERIFIED', evidence: unknown },
    { id: 'database-only', title: 'Database-only fake institution', change: 'Supabase row exists without consortium proof.', expected: 'UNVERIFIED', evidence: dbOnly },
    { id: 'superseded-policy', title: 'Old policy reused', change: 'A newer signed policy is active.', expected: 'UNVERIFIED', evidence: superseded },
    { id: 'stale-state', title: 'Stale revocation information', change: 'Trust data exceeds the safety limit.', expected: 'STALE', evidence: stale },
    { id: 'broken-merkle', title: 'Broken registry proof', change: 'Merkle inclusion proof does not reach the witnessed root.', expected: 'UNVERIFIED', evidence: merkle }
  ]
}

