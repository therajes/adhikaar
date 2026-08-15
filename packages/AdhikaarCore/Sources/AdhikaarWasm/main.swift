import AdhikaarCore
import JavaScriptKit

@JS public func adhikaar_verify_bundle(json: String) -> String {
    AdhikaarVerifier.verifyJSON(json)
}

@JS public func adhikaar_normalize_challenge(value: String) -> String {
    AdhikaarVerifier.normalizeChallenge(value) ?? ""
}

@JS public func adhikaar_engine_version() -> String {
    AdhikaarVerifier.engineVersion
}

