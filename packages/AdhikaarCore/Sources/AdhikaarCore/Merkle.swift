import Foundation

public protocol Digesting { func digest(_ data: Data) -> Data }

public enum MerkleTree {
    public static func root(leaves: [Data], digest: Digesting) -> Data? {
        guard !leaves.isEmpty else { return nil }
        var level = leaves.map { digest.digest(Data("ADHIKAAR:LEAF:V1".utf8) + $0) }
        while level.count > 1 {
            var next: [Data] = []
            for index in stride(from: 0, to: level.count, by: 2) {
                let left = level[index]
                let right = index + 1 < level.count ? level[index + 1] : left
                next.append(digest.digest(Data("ADHIKAAR:NODE:V1".utf8) + left + right))
            }
            level = next
        }
        return level[0]
    }

    public static func verify(leaf: Data, proof: [(sibling: Data, siblingOnLeft: Bool)], expectedRoot: Data, digest: Digesting) -> Bool {
        var current = digest.digest(Data("ADHIKAAR:LEAF:V1".utf8) + leaf)
        for item in proof {
            let joined = item.siblingOnLeft ? item.sibling + current : current + item.sibling
            current = digest.digest(Data("ADHIKAAR:NODE:V1".utf8) + joined)
        }
        return constantTimeEqual(current, expectedRoot)
    }

    public static func constantTimeEqual(_ a: Data, _ b: Data) -> Bool {
        guard a.count == b.count else { return false }
        return zip(a, b).reduce(UInt8(0)) { $0 | ($1.0 ^ $1.1) } == 0
    }
}

