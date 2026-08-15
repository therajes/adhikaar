#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
for service_name in anvil functions; do
  PID_FILE="$ROOT/.adhikaar/${service_name}.pid"
  if [[ -f "$PID_FILE" ]]; then
    SERVICE_PID="$(<"$PID_FILE")"
    if [[ "$SERVICE_PID" == <-> ]] && kill -0 "$SERVICE_PID" >/dev/null 2>&1; then kill "$SERVICE_PID"; fi
    rm -f "$PID_FILE"
  fi
done
cd "$ROOT"
npx supabase stop
print "Local Supabase, Edge Functions and managed Anvil services stopped."
