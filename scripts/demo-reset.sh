#!/bin/zsh
set -euo pipefail

ROOT="${0:A:h:h}"
cd "$ROOT"
npx supabase db reset --local --yes
print "Fictional local database reset. Browser demo keys can be reset from browser storage when desired."
