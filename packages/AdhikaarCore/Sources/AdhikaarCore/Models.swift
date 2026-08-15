import Foundation

public enum VerificationVerdict: String, Codable, CaseIterable, Sendable {
    case verifiedAuthorised = "VERIFIED_AUTHORISED"
    case authenticUnauthorised = "AUTHENTIC_UNAUTHORISED"
    case unverified = "UNVERIFIED"
    case revoked = "REVOKED"
    case expired = "EXPIRED"
    case replay = "REPLAY"
    case tampered = "TAMPERED"
    case challengeMismatch = "CHALLENGE_MISMATCH"
    case stale = "STALE"
}

public enum VerificationReasonCode: String, Codable, Sendable {
    case ok = "OK"
    case unsupportedSchema = "UNSUPPORTED_SCHEMA"
    case invalidSignature = "INVALID_SIGNATURE"
    case invalidCredentialSignature = "INVALID_CREDENTIAL_SIGNATURE"
    case missingRegistryProof = "MISSING_REGISTRY_PROOF"
    case brokenMerkleProof = "BROKEN_MERKLE_PROOF"
    case registryMismatch = "REGISTRY_ROOT_MISMATCH"
    case credentialRevoked = "CREDENTIAL_REVOKED"
    case representativeRevoked = "REPRESENTATIVE_REVOKED"
    case mandateExpired = "MANDATE_EXPIRED"
    case replayDetected = "REPLAY_DETECTED"
    case challengeMismatch = "CITIZEN_CHALLENGE_MISMATCH"
    case policySuperseded = "POLICY_SUPERSEDED"
    case unauthorisedAction = "UNAUTHORISED_ACTION"
    case prohibitedAction = "PROHIBITED_ACTION"
    case trustInformationStale = "TRUST_INFORMATION_STALE"
}

public struct ActionPolicyV1: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let policyId: String
    public let version: Int
    public let institutionId: String
    public let roleCode: String
    public let purposeCode: String
    public let permittedActionCodes: [String]
    public let prohibitedActionCodes: [String]
    public let maximumMandateLifetime: Int
    public let superseded: Bool

    public init(schemaVersion: Int = 1, policyId: String, version: Int, institutionId: String, roleCode: String, purposeCode: String, permittedActionCodes: [String], prohibitedActionCodes: [String], maximumMandateLifetime: Int = 90, superseded: Bool = false) {
        self.schemaVersion = schemaVersion; self.policyId = policyId; self.version = version
        self.institutionId = institutionId; self.roleCode = roleCode; self.purposeCode = purposeCode
        self.permittedActionCodes = permittedActionCodes; self.prohibitedActionCodes = prohibitedActionCodes
        self.maximumMandateLifetime = maximumMandateLifetime; self.superseded = superseded
    }
}

public struct MandateV1: Codable, Equatable, Sendable {
    public let schemaVersion: Int
    public let mandateId: String
    public let verificationCode: String
    public let institutionId: String
    public let representativeId: String
    public let representativeDisplayName: String
    public let roleCode: String
    public let purposeCode: String
    public let requestedActionCodes: [String]
    public let citizenChallengeSalt: String
    public let citizenChallengeDigest: String
    public let nonce: String
    public let issuedAt: Int64
    public let expiresAt: Int64
    public let policyId: String
    public let policyVersion: Int
    public let registryRoot: String

    public init(schemaVersion: Int = 1, mandateId: String, verificationCode: String, institutionId: String, representativeId: String, representativeDisplayName: String, roleCode: String, purposeCode: String, requestedActionCodes: [String], citizenChallengeSalt: String, citizenChallengeDigest: String, nonce: String, issuedAt: Int64, expiresAt: Int64, policyId: String, policyVersion: Int, registryRoot: String) {
        self.schemaVersion = schemaVersion; self.mandateId = mandateId; self.verificationCode = verificationCode
        self.institutionId = institutionId; self.representativeId = representativeId; self.representativeDisplayName = representativeDisplayName
        self.roleCode = roleCode; self.purposeCode = purposeCode; self.requestedActionCodes = requestedActionCodes
        self.citizenChallengeSalt = citizenChallengeSalt; self.citizenChallengeDigest = citizenChallengeDigest; self.nonce = nonce
        self.issuedAt = issuedAt; self.expiresAt = expiresAt; self.policyId = policyId; self.policyVersion = policyVersion; self.registryRoot = registryRoot
    }
}

public struct VerificationEvidenceV1: Codable, Sendable {
    public let schemaVersion: Int
    public let mandate: MandateV1
    public let policy: ActionPolicyV1
    public let signatureValid: Bool
    public let credentialSignatureValid: Bool
    public let registryProofValid: Bool
    public let registryRootMatches: Bool
    public let institutionKnown: Bool
    public let revoked: Bool
    public let nonceConsumedByOtherSession: Bool
    public let challengeMatches: Bool
    public let trustAgeSeconds: Int
    public let maximumTrustAgeSeconds: Int
    public let evaluatedAt: Int64

    public init(schemaVersion: Int = 1, mandate: MandateV1, policy: ActionPolicyV1, signatureValid: Bool = true, credentialSignatureValid: Bool = true, registryProofValid: Bool = true, registryRootMatches: Bool = true, institutionKnown: Bool = true, revoked: Bool = false, nonceConsumedByOtherSession: Bool = false, challengeMatches: Bool = true, trustAgeSeconds: Int = 1, maximumTrustAgeSeconds: Int = 300, evaluatedAt: Int64) {
        self.schemaVersion = schemaVersion; self.mandate = mandate; self.policy = policy
        self.signatureValid = signatureValid; self.credentialSignatureValid = credentialSignatureValid
        self.registryProofValid = registryProofValid; self.registryRootMatches = registryRootMatches; self.institutionKnown = institutionKnown
        self.revoked = revoked; self.nonceConsumedByOtherSession = nonceConsumedByOtherSession; self.challengeMatches = challengeMatches
        self.trustAgeSeconds = trustAgeSeconds; self.maximumTrustAgeSeconds = maximumTrustAgeSeconds; self.evaluatedAt = evaluatedAt
    }
}

public struct VerificationResultV1: Codable, Equatable, Sendable {
    public let verdict: VerificationVerdict
    public let reasonCodes: [VerificationReasonCode]
    public let titleEnglish: String
    public let titleHindi: String
    public let explanationEnglish: String
    public let explanationHindi: String
    public let requestedActions: [String]
    public let verificationEngine: String
    public let engineVersion: String
}

