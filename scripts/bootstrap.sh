#!/bin/zsh
set -euo pipefail

typeset -a formulae=(colima docker binaryen foundry k6)
for formula_name in "${formulae[@]}"; do
  if ! brew list "$formula_name" >/dev/null 2>&1; then
    brew install "$formula_name"
  fi
done

if ! colima status >/dev/null 2>&1; then
  colima start --cpu 4 --memory 8 --disk 40
fi

npm ci
npx playwright install chromium
npx supabase start
./scripts/doctor.sh
./scripts/build-wasm.sh
print "Bootstrap complete. Run: make dev"
