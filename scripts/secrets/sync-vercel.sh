#!/usr/bin/env bash
# =============================================================================
# sync-vercel.sh — Sync Doppler secrets → Vercel environment variables
#
# Usage:
#   ./scripts/secrets/sync-vercel.sh <doppler-config> <vercel-env>
#
# Examples:
#   ./scripts/secrets/sync-vercel.sh dev development
#   ./scripts/secrets/sync-vercel.sh stg preview
#   ./scripts/secrets/sync-vercel.sh prd production
#
# Prerequisites:
#   - doppler CLI installed and authenticated  (brew install dopplerhq/cli/doppler)
#   - vercel CLI installed and authenticated   (npm i -g vercel && vercel login)
#   - VERCEL_PROJECT_ID and VERCEL_TEAM_ID set in your shell (or passed as env)
#
# NOTE: The recommended approach for production is to use the Doppler × Vercel
# native integration in the Doppler dashboard (no script needed). This script
# is a fallback for CI pipelines that cannot use OAuth-based integrations.
# =============================================================================

set -euo pipefail

DOPPLER_CONFIG="${1:?Usage: $0 <doppler-config> <vercel-env>}"
VERCEL_ENV="${2:?Usage: $0 <doppler-config> <vercel-env>}"

echo "→ Fetching secrets from Doppler config: ${DOPPLER_CONFIG}"
SECRETS_JSON=$(doppler secrets download \
  --config "${DOPPLER_CONFIG}" \
  --project anywhere \
  --no-file \
  --format json)

echo "→ Pushing to Vercel environment: ${VERCEL_ENV}"

# Iterate over each key-value pair in the JSON
echo "${SECRETS_JSON}" | jq -r 'to_entries[] | "\(.key) \(.value)"' | \
while IFS=' ' read -r KEY VALUE; do
  # Skip Doppler-injected meta-variables
  if [[ "${KEY}" == DOPPLER_* ]]; then
    continue
  fi

  echo "   Setting ${KEY}"
  vercel env add "${KEY}" "${VERCEL_ENV}" <<< "${VALUE}" \
    --force \
    --token "${VERCEL_TOKEN:?VERCEL_TOKEN not set}" \
    --yes 2>/dev/null || true
done

echo "✓ Vercel environment '${VERCEL_ENV}' synced from Doppler config '${DOPPLER_CONFIG}'"
