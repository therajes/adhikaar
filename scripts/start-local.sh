#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
STATE="$ROOT/.adhikaar"
mkdir -p "$STATE"

colima status >/dev/null 2>&1 || colima start --cpu 4 --memory 8 --disk 40
cd "$ROOT"
npx supabase status >/dev/null 2>&1 || npx supabase start

FUNCTIONS_PID_FILE="$STATE/functions.pid"
if [[ ! -f "$FUNCTIONS_PID_FILE" ]] || ! kill -0 "$(<"$FUNCTIONS_PID_FILE")" >/dev/null 2>&1; then
  nohup env ALLOWED_ORIGIN='*' DEMO_BOOTSTRAP_ENABLED=true npx supabase functions serve >"$STATE/functions.log" 2>&1 &
  print $! > "$FUNCTIONS_PID_FILE"
fi

if ! lsof -nP -iTCP:8545 -sTCP:LISTEN >/dev/null 2>&1; then
  nohup anvil --silent --host 127.0.0.1 --port 8545 --chain-id 31337 >"$STATE/anvil.log" 2>&1 &
  print $! > "$STATE/anvil.pid"
  sleep 1
fi

REGISTRY_ADDRESS="0x5FbDB2315678afecb367f032d93F642f64180aa3"
if [[ "$(cast code "$REGISTRY_ADDRESS" --rpc-url http://127.0.0.1:8545)" == "0x" ]]; then
  (cd contracts && forge script script/Deploy.s.sol:DeployAdhikaarRegistry --rpc-url http://127.0.0.1:8545 --sender 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --unlocked --broadcast >/dev/null)
fi

print "ADHIKAAR is ready at http://localhost:5173"
print "Supabase Studio: http://127.0.0.1:54323"
exec npm run dev -- --host 0.0.0.0
