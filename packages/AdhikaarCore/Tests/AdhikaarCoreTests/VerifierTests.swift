import Foundation
import Testing
@testable import AdhikaarCore

private func sample(actions: [String] = ["confirm-masked-reference"], now: Int64 = 1_700_000_010) -> VerificationEvidenceV1 {
    let policy = ActionPolicyV1(policyId: "bank-kyc", version: 1, institutionId: "bank", roleCode: "kyc", purposeCode: "kyc-review", permittedActionCodes: ["confirm-masked-reference", "schedule-physical-appointment"], prohibitedActionCodes: ["request-otp", "request-cvv"])
    let mandate = MandateV1(mandateId: "m1", verificationCode: "ABC234", institutionId: "bank", representativeId: "r1", representativeDisplayName: "Aarav Sharma — DEMO", roleCode: "kyc", purposeCode: "kyc-review", requestedActionCodes: actions, citizenChallengeSalt: "salt", citizenChallengeDigest: "digest", nonce: "00112233445566778899aabbccddeeff", issuedAt: 1_700_000_000, expiresAt: 1_700_000_090, policyId: "bank-kyc", policyVersion: 1, registryRoot: "root")
    return VerificationEvidenceV1(mandate: mandate, policy: policy, evaluatedAt: now)
}

@Test func authorised() { #expect(AdhikaarVerifier.evaluate(sample()).verdict == .verifiedAuthorised) }
@Test func genuineButUnauthorised() { #expect(AdhikaarVerifier.evaluate(sample(actions: ["request-otp"])).verdict == .authenticUnauthorised) }
@Test func defaultDeny() { #expect(AdhikaarVerifier.evaluate(sample(actions: ["unknown-action"])).reasonCodes.contains(.unauthorisedAction)) }
@Test func tamperPrecedesPolicy() {
    var evidence = sample(actions: ["request-otp"])
    evidence = VerificationEvidenceV1(mandate: evidence.mandate, policy: evidence.policy, signatureValid: false, evaluatedAt: 1_700_000_010)
    #expect(AdhikaarVerifier.evaluate(evidence).verdict == .tampered)
}
@Test func expired() { #expect(AdhikaarVerifier.evaluate(sample(now: 1_700_000_091)).verdict == .expired) }
@Test func normalisesChallenge() {
    #expect(AdhikaarVerifier.normalizeChallenge("abcd-2345") == "ABCD2345")
    #expect(AdhikaarVerifier.normalizeChallenge("O0000000") == nil)
}
@Test func canonicalEncodingStable() throws {
    let first = try CanonicalJSON.encode(sample().mandate)
    let second = try CanonicalJSON.encode(sample().mandate)
    #expect(first == second)
}

private struct TestDigest: Digesting {
    func digest(_ data: Data) -> Data { Data(data.reversed()) + Data([UInt8(data.count % 251)]) }
}
@Test func merkleRootStable() {
    let digest = TestDigest()
    #expect(MerkleTree.root(leaves: [Data("a".utf8), Data("b".utf8)], digest: digest) == MerkleTree.root(leaves: [Data("a".utf8), Data("b".utf8)], digest: digest))
}
