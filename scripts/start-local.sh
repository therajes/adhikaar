#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
STATE="$ROOT/.adhikaar"
FUNCTIONS_PID_FILE="$STATE/functions.pid"
FUNCTIONS_LOG_FILE="$STATE/functions.log"
FUNCTIONS_ENV_FILE="$ROOT/supabase/functions.local.env"
EDGE_READINESS_URL="http://127.0.0.1:54321/functions/v1/resolve-mandate"
mkdir -p "$STATE"

edge_functions_ready() {
  local readiness_code
  readiness_code="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' \
    --request POST \
    --header 'Origin: http://localhost:5173' \
    --header 'Content-Type: application/json' \
    --data '{}' \
    "$EDGE_READINESS_URL" 2>/dev/null)" || return 1
  [[ "$readiness_code" == 400 ]]
}

terminate_process_tree() {
  local target_pid="$1" child_pid children
  children="$(pgrep -P "$target_pid" 2>/dev/null || true)"
  for child_pid in ${(f)children}; do
    [[ -n "$child_pid" ]] && terminate_process_tree "$child_pid"
  done
  kill "$target_pid" >/dev/null 2>&1 || true
}

colima status >/dev/null 2>&1 || colima start --cpu 4 --memory 8 --disk 40
cd "$ROOT"
npx supabase status >/dev/null 2>&1 || npx supabase start

if ! edge_functions_ready; then
  if [[ -f "$FUNCTIONS_PID_FILE" ]]; then
    FUNCTIONS_PID="$(<"$FUNCTIONS_PID_FILE")"
    if [[ "$FUNCTIONS_PID" == <-> ]] && kill -0 "$FUNCTIONS_PID" >/dev/null 2>&1 &&
      [[ "$(ps -p "$FUNCTIONS_PID" -o command= 2>/dev/null)" == *"supabase functions serve"* ]]; then
      terminate_process_tree "$FUNCTIONS_PID"
    fi
  fi
  nohup npx supabase functions serve --env-file "$FUNCTIONS_ENV_FILE" >"$FUNCTIONS_LOG_FILE" 2>&1 &
  print $! > "$FUNCTIONS_PID_FILE"
fi

FUNCTIONS_READY=false
for attempt in {1..80}; do
  if edge_functions_ready; then
    FUNCTIONS_READY=true
    break
  fi
  sleep 0.25
done
if [[ "$FUNCTIONS_READY" != true ]]; then
  print -u2 "Edge Functions did not become ready."
  [[ -f "$FUNCTIONS_LOG_FILE" ]] && tail -100 "$FUNCTIONS_LOG_FILE" >&2
  exit 1
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
exec npm run dev -w @adhikaar/web -- --host 0.0.0.0 --port 5173
