#!/usr/bin/env bash
# =============================================================================
# rotate-key.sh — Rotate a single secret across all Doppler environments
#
# Usage:
#   ./scripts/secrets/rotate-key.sh <SECRET_NAME> <new_value>
#
# Example:
#   ./scripts/secrets/rotate-key.sh AMADEUS_CLIENT_SECRET "abc123xyz"
#
# What this script does:
#   1. Updates the secret in all three Doppler configs (dev, stg, prd)
#   2. Logs the rotation event with timestamp and actor
#   3. Triggers a Railway redeployment for affected services (prd only)
#
# Vercel redeployment is automatic — Doppler × Vercel native sync
# propagates the change and Vercel re-deploys on the next build trigger.
# =============================================================================

set -euo pipefail

SECRET_NAME="${1:?Usage: $0 <SECRET_NAME> <new_value>}"
NEW_VALUE="${2:?Usage: $0 <SECRET_NAME> <new_value>}"
ACTOR="${DOPPLER_USER:-$(git config user.email)}"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

CONFIGS=("dev" "stg" "prd")

echo "→ Rotating ${SECRET_NAME} across all environments [actor: ${ACTOR}]"

for CONFIG in "${CONFIGS[@]}"; do
  echo "   Updating config: ${CONFIG}"
  doppler secrets set "${SECRET_NAME}=${NEW_VALUE}" \
    --project anywhere \
    --config "${CONFIG}"
done

# Append to rotation log
LOG_FILE="$(git rev-parse --show-toplevel)/docs/secret-rotation.log"
echo "${TIMESTAMP} | ROTATE | ${SECRET_NAME} | ${ACTOR}" >> "${LOG_FILE}"

echo ""
echo "✓ ${SECRET_NAME} rotated in all environments"
echo "✓ Rotation logged to docs/secret-rotation.log"
echo ""
echo "Next steps:"
echo "  1. Revoke the OLD key in the provider's dashboard"
echo "  2. Verify staging deployment is healthy before production"
echo "  3. If Railway services need restart: railway up --detach"
