import Foundation

public enum CanonicalJSONError: Error { case invalidTopLevel, unsupportedNumber, invalidString }

public enum CanonicalJSON {
    public static func encode<T: Encodable>(_ value: T) throws -> Data {
        let raw = try JSONEncoder().encode(value)
        let object = try JSONSerialization.jsonObject(with: raw, options: [.fragmentsAllowed])
        return Data(try render(object).utf8)
    }

    private static func render(_ value: Any) throws -> String {
        switch value {
        case let dictionary as [String: Any]:
            let entries = try dictionary.keys.sorted().map { key in
                "\(try quote(key)):\(try render(dictionary[key]!))"
            }
            return "{\(entries.joined(separator: ","))}"
        case let array as [Any]: return "[\(try array.map(render).joined(separator: ","))]"
        case let string as String: return try quote(string)
        case let boolean as Bool: return boolean ? "true" : "false"
        case let number as NSNumber:
            let double = number.doubleValue
            guard double.isFinite, floor(double) == double else { throw CanonicalJSONError.unsupportedNumber }
            return String(number.int64Value)
        case is NSNull: return "null"
        default: throw CanonicalJSONError.invalidTopLevel
        }
    }

    private static func quote(_ string: String) throws -> String {
        guard !string.unicodeScalars.contains(where: { $0.value >= 0xD800 && $0.value <= 0xDFFF }) else { throw CanonicalJSONError.invalidString }
        let data = try JSONSerialization.data(withJSONObject: [string])
        let encoded = String(decoding: data, as: UTF8.self)
        return String(encoded.dropFirst().dropLast())
    }
}
