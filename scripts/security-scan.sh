#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"
mkdir -p "$ROOT/.adhikaar"
npm audit --audit-level=high
if rg -n --hidden --glob '!node_modules/**' --glob '!scripts/security-scan.sh' '(service_role|SUPABASE_SERVICE_ROLE_KEY)\s*[=:]\s*[A-Za-z0-9._-]{20,}' apps packages; then
  print -u2 "A service-role-like credential was found in browser-facing source."
  exit 1
fi
if rg -n --glob 'dist/**' '(service_role|SUPABASE_SERVICE_ROLE_KEY|sb_secret_)' apps/web/dist; then
  print -u2 "A privileged secret marker was found in the production bundle."
  exit 1
fi
npx supabase db advisors --local -o json | tee "$ROOT/.adhikaar/local-advisors.json"
if command -v docker >/dev/null 2>&1 && curl -fsS http://127.0.0.1:5173 >/dev/null 2>&1; then
  docker run --rm --add-host=host.docker.internal:host-gateway -v "$ROOT/.adhikaar:/zap/wrk/:rw" -t zaproxy/zap-stable \
    zap-baseline.py -t http://host.docker.internal:5173 -m 1 -I -J zap-report.json
else
  print "ZAP baseline skipped: start ADHIKAAR on port 5173 and ensure Docker is available."
fi
print "Dependency audit, secret scan, database advisors and applicable ZAP baseline completed."
