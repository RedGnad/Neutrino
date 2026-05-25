#!/usr/bin/env bash
# Neutrino pre-submission preflight.
# Run from the repo root. Exits 1 on any failure.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ok()   { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }

echo "=== Neutrino preflight ==="

# 1. Web build
echo ""
echo "--- web build ---"
(cd web && pnpm build) && ok "web build" || fail "web build failed"

# 2. Web tests
echo ""
echo "--- web tests ---"
(cd web && pnpm test) && ok "web tests" || fail "web tests failed"

# 3. Web typecheck
echo ""
echo "--- web typecheck ---"
(cd web && pnpm typecheck) && ok "web typecheck" || fail "web typecheck failed"

# 4. Agent typecheck
echo ""
echo "--- agent typecheck ---"
(cd agent && pnpm typecheck) && ok "agent typecheck" || fail "agent typecheck failed"

# 5. Contracts (forge test) — skip gracefully if forge not installed
echo ""
echo "--- forge test ---"
if command -v forge &>/dev/null; then
  (cd contracts && forge test) && ok "forge tests" || fail "forge tests failed"
else
  warn "forge not found — skipping contract tests"
fi

# 6. Schema version integrity — no v1 references in production paths
echo ""
echo "--- schema integrity ---"
if grep -R "neutrino\.decision\.v1" README.md web/src 2>/dev/null; then
  fail "Found 'neutrino.decision.v1' in README.md or web/src — update to v2"
fi
ok "no v1 schema references"

# 7. Dead alias check
if grep -R "neutrino-ebon" README.md web/src 2>/dev/null; then
  fail "Found 'neutrino-ebon' in README.md or web/src — remove dead alias"
fi
ok "no neutrino-ebon references"

# 8. Pending Vercel marker check
if grep -R "pending Vercel" README.md web/src 2>/dev/null; then
  fail "Found 'pending Vercel' in README.md or web/src — update before shipping"
fi
ok "no 'pending Vercel' markers"

echo ""
echo -e "${GREEN}=== Preflight PASSED ===${NC}"
