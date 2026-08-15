export type Verdict =
  | 'VERIFIED_AUTHORISED' | 'AUTHENTIC_UNAUTHORISED' | 'UNVERIFIED'
  | 'REVOKED' | 'EXPIRED' | 'REPLAY' | 'TAMPERED' | 'CHALLENGE_MISMATCH' | 'STALE'

export interface Policy {
  schemaVersion: 1; policyId: string; version: number; institutionId: string
  roleCode: string; purposeCode: string; permittedActionCodes: string[]
  prohibitedActionCodes: string[]; maximumMandateLifetime: number; superseded: boolean
}

export interface Mandate {
  schemaVersion: 1; mandateId: string; verificationCode: string; institutionId: string
  representativeId: string; representativeDisplayName: string; roleCode: string
  purposeCode: string; requestedActionCodes: string[]; citizenChallengeSalt: string
  citizenChallengeDigest: string; nonce: string; issuedAt: number; expiresAt: number
  policyId: string; policyVersion: number; registryRoot: string
}

export interface Evidence {
  schemaVersion: 1; mandate: Mandate; policy: Policy; signatureValid: boolean
  credentialSignatureValid: boolean; registryProofValid: boolean; registryRootMatches: boolean
  institutionKnown: boolean; revoked: boolean; nonceConsumedByOtherSession: boolean
  challengeMatches: boolean; trustAgeSeconds: number; maximumTrustAgeSeconds: number
  evaluatedAt: number; signature?: string; representativePublicKeyJwk?: JsonWebKey
}

export interface VerificationResult {
  verdict: Verdict; reasonCodes: string[]; titleEnglish: string; titleHindi: string
  explanationEnglish: string; explanationHindi: string; requestedActions: string[]
  verificationEngine: string; engineVersion: string
}

