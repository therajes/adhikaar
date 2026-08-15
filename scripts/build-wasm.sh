#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
CORE="$ROOT/packages/AdhikaarCore"
OUTPUT="$ROOT/apps/web/public/swiftwasm"
SWIFTLY_SWIFT="${HOME}/.swiftly/bin/swift"

[[ -x "$SWIFTLY_SWIFT" ]] || { print -u2 "Swiftly Swift 6.3.3 is required."; exit 1; }
cd "$CORE"
"$SWIFTLY_SWIFT" package --build-system native --swift-sdk swift-6.3.3-RELEASE_wasm js -c release

mkdir -p "$OUTPUT"
rsync -a --delete "$CORE/.build/plugins/PackageToJS/outputs/Package/" "$OUTPUT/"
mkdir -p "$OUTPUT/vendor/browser_wasi_shim"
rsync -a --delete "$ROOT/node_modules/@bjorn3/browser_wasi_shim/dist/" "$OUTPUT/vendor/browser_wasi_shim/"
sed -i '' "s|from '@bjorn3/browser_wasi_shim'|from '../vendor/browser_wasi_shim/index.js'|g" "$OUTPUT/platforms/browser.js"
print "Swift WebAssembly package written to $OUTPUT"
