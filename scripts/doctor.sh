#!/bin/zsh
set -euo pipefail

typeset -a missing=()
for command_name in node npm docker colima forge cast anvil wasm-opt; do
  command -v "$command_name" >/dev/null 2>&1 || missing+=("$command_name")
done

SWIFTLY_SWIFT="${HOME}/.swiftly/bin/swift"
[[ -x "$SWIFTLY_SWIFT" ]] || missing+=("Swift 6.3.3 via swiftly")

if (( ${#missing[@]} )); then
  print -u2 "Missing: ${missing[*]}"
  print -u2 "Run: make bootstrap"
  exit 1
fi

print "Node $(node --version)"
print "npm $(npm --version)"
print "Supabase $(npx supabase --version)"
print "Foundry $(forge --version | head -1)"
print "Binaryen $(wasm-opt --version)"
print "$($SWIFTLY_SWIFT --version | head -1)"
$SWIFTLY_SWIFT sdk list | grep -q 'swift-6.3.3-RELEASE_wasm' || {
  print -u2 "Matching Swift Wasm SDK swift-6.3.3-RELEASE_wasm is missing."
  exit 1
}
print "Swift/Wasm toolchain match confirmed."
