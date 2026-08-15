// swift-tools-version:6.0
import PackageDescription

let package = Package(
    name: "AdhikaarCore",
    platforms: [.macOS(.v14)],
    products: [
        .library(name: "AdhikaarCore", targets: ["AdhikaarCore"]),
        .executable(name: "AdhikaarWasm", targets: ["AdhikaarWasm"])
    ],
    dependencies: [
        .package(url: "https://github.com/swiftwasm/JavaScriptKit.git", exact: "0.56.1")
    ],
    targets: [
        .target(name: "AdhikaarCore"),
        .executableTarget(
            name: "AdhikaarWasm",
            dependencies: ["AdhikaarCore", "JavaScriptKit"],
            swiftSettings: [.enableExperimentalFeature("Extern")],
            plugins: [.plugin(name: "BridgeJS", package: "JavaScriptKit")]
        ),
        .testTarget(name: "AdhikaarCoreTests", dependencies: ["AdhikaarCore"])
    ]
)

