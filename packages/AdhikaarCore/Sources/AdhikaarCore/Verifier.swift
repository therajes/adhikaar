import Foundation

public enum AdhikaarVerifier {
    public static let engineVersion = "0.1.0-swiftwasm"
    public static let challengeAlphabet = Set("ABCDEFGHJKLMNPQRSTUVWXYZ23456789")

    public static func normalizeChallenge(_ raw: String) -> String? {
        let normalized = raw.uppercased().filter { $0 != "-" && !$0.isWhitespace }
        guard normalized.count == 8, normalized.allSatisfy(challengeAlphabet.contains) else { return nil }
        return normalized
    }

    public static func evaluate(_ evidence: VerificationEvidenceV1) -> VerificationResultV1 {
        let mandate = evidence.mandate
        let policy = evidence.policy
        let verdict: VerificationVerdict
        let reasons: [VerificationReasonCode]

        if evidence.schemaVersion != 1 || mandate.schemaVersion != 1 || policy.schemaVersion != 1 {
            verdict = .unverified; reasons = [.unsupportedSchema]
        } else if !evidence.signatureValid {
            verdict = .tampered; reasons = [.invalidSignature]
        } else if !evidence.credentialSignatureValid {
            verdict = .unverified; reasons = [.invalidCredentialSignature]
        } else if !evidence.institutionKnown {
            verdict = .unverified; reasons = [.missingRegistryProof]
        } else if !evidence.registryProofValid {
            verdict = .unverified; reasons = [.brokenMerkleProof]
        } else if !evidence.registryRootMatches || mandate.registryRoot.isEmpty {
            verdict = .unverified; reasons = [.registryMismatch]
        } else if evidence.revoked {
            verdict = .revoked; reasons = [.credentialRevoked]
        } else if evidence.nonceConsumedByOtherSession {
            verdict = .replay; reasons = [.replayDetected]
        } else if evidence.evaluatedAt < mandate.issuedAt || evidence.evaluatedAt >= mandate.expiresAt || mandate.expiresAt - mandate.issuedAt > Int64(policy.maximumMandateLifetime) {
            verdict = .expired; reasons = [.mandateExpired]
        } else if !evidence.challengeMatches {
            verdict = .challengeMismatch; reasons = [.challengeMismatch]
        } else if policy.superseded || mandate.policyVersion != policy.version || mandate.policyId != policy.policyId {
            verdict = .unverified; reasons = [.policySuperseded]
        } else if evidence.trustAgeSeconds > evidence.maximumTrustAgeSeconds {
            verdict = .stale; reasons = [.trustInformationStale]
        } else {
            let permitted = Set(policy.permittedActionCodes)
            let prohibited = Set(policy.prohibitedActionCodes)
            let requested = Set(mandate.requestedActionCodes)
            let denied = requested.subtracting(permitted)
            let explicitlyProhibited = requested.intersection(prohibited)
            if !explicitlyProhibited.isEmpty || !denied.isEmpty || requested.isEmpty {
                verdict = .authenticUnauthorised
                reasons = (!explicitlyProhibited.isEmpty ? [.prohibitedAction] : []) + [.unauthorisedAction]
            } else {
                verdict = .verifiedAuthorised; reasons = [.ok]
            }
        }
        return result(verdict, reasons, mandate.requestedActionCodes)
    }

    public static func verifyJSON(_ json: String) -> String {
        do {
            let evidence = try JSONDecoder().decode(VerificationEvidenceV1.self, from: Data(json.utf8))
            let result = evaluate(evidence)
            let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
            return String(decoding: try encoder.encode(result), as: UTF8.self)
        } catch {
            return "{\"verdict\":\"UNVERIFIED\",\"reasonCodes\":[\"UNSUPPORTED_SCHEMA\"],\"titleEnglish\":\"UNVERIFIED REPRESENTATIVE\",\"titleHindi\":\"प्रतिनिधि सत्यापित नहीं\",\"explanationEnglish\":\"The proof bundle is malformed or unsupported.\",\"explanationHindi\":\"प्रमाण अमान्य या असमर्थित है।\",\"requestedActions\":[],\"verificationEngine\":\"Swift WebAssembly\",\"engineVersion\":\"(engineVersion)\"}"
        }
    }

    private static func result(_ verdict: VerificationVerdict, _ reasons: [VerificationReasonCode], _ actions: [String]) -> VerificationResultV1 {
        let copy: (String, String, String, String)
        switch verdict {
        case .verifiedAuthorised: copy = ("VERIFIED AND AUTHORISED", "सत्यापित और अधिकृत", "The representative is verified and every requested action is permitted.", "प्रतिनिधि सत्यापित है और हर अनुरोधित कार्रवाई की अनुमति है।")
        case .authenticUnauthorised: copy = ("AUTHENTIC REPRESENTATIVE — UNAUTHORISED REQUEST", "असली प्रतिनिधि — अनधिकृत अनुरोध", "The representative is genuine, but the signed policy does not permit this request.", "प्रतिनिधि असली है, लेकिन हस्ताक्षरित नीति इस अनुरोध की अनुमति नहीं देती।")
        case .revoked: copy = ("CREDENTIAL REVOKED", "प्रमाणपत्र रद्द", "This representative or credential has been revoked.", "यह प्रतिनिधि या प्रमाणपत्र रद्द किया गया है।")
        case .expired: copy = ("MANDATE EXPIRED", "अनुमति समाप्त", "This short-lived interaction proof is no longer valid.", "यह सीमित अवधि वाला प्रमाण अब मान्य नहीं है।")
        case .replay: copy = ("REPLAY DETECTED", "दोबारा उपयोग पकड़ा गया", "Another session already consumed this one-time proof.", "दूसरे सत्र ने इस एक-बार उपयोग वाले प्रमाण का उपयोग कर लिया है।")
        case .tampered: copy = ("TAMPERED PROOF", "प्रमाण से छेड़छाड़", "Signed contents no longer match the signature.", "हस्ताक्षरित सामग्री अब हस्ताक्षर से मेल नहीं खाती।")
        case .challengeMismatch: copy = ("CITIZEN CHALLENGE MISMATCH", "नागरिक चुनौती मेल नहीं खाती", "This proof was not issued for your verification session.", "यह प्रमाण आपके सत्यापन सत्र के लिए जारी नहीं हुआ था।")
        case .stale: copy = ("TRUST INFORMATION STALE", "विश्वास जानकारी पुरानी", "Current revocation state cannot be confirmed safely.", "वर्तमान रद्दीकरण स्थिति सुरक्षित रूप से पुष्टि नहीं की जा सकती।")
        case .unverified: copy = ("UNVERIFIED REPRESENTATIVE", "प्रतिनिधि सत्यापित नहीं", "A trusted authority chain could not be established.", "विश्वसनीय अधिकार श्रृंखला स्थापित नहीं हो सकी।")
        }
        return VerificationResultV1(verdict: verdict, reasonCodes: reasons, titleEnglish: copy.0, titleHindi: copy.1, explanationEnglish: copy.2, explanationHindi: copy.3, requestedActions: actions, verificationEngine: "Swift WebAssembly", engineVersion: engineVersion)
    }
}

