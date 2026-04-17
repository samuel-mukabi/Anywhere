#!/usr/bin/env bash
# =============================================================================
# sync-railway.sh — Sync Doppler secrets → Railway service variables
#
# Usage:
#   ./scripts/secrets/sync-railway.sh <doppler-config> <railway-environment> <service-name>
#
# Examples:
#   ./scripts/secrets/sync-railway.sh dev  development search-service
#   ./scripts/secrets/sync-railway.sh stg  staging     pricing-engine
#   ./scripts/secrets/sync-railway.sh prd  production  auth-service
#
# Prerequisites:
#   - doppler CLI installed and authenticated
#   - railway CLI installed and authenticated  (npm i -g @railway/cli && railway login)
#   - RAILWAY_TOKEN set (project service token from Railway dashboard)
#
# NOTE: The preferred approach is to use Doppler Service Tokens injected directly
# into Railway's "Start Command": `doppler run -- node dist/server.js`
# This script is for initial bootstrap or bulk secret updates.
# =============================================================================

set -euo pipefail

DOPPLER_CONFIG="${1:?Usage: $0 <doppler-config> <railway-environment> <service-name>}"
RAILWAY_ENV="${2:?Usage: $0 <doppler-config> <railway-environment> <service-name>}"
SERVICE_NAME="${3:?Usage: $0 <doppler-config> <railway-environment> <service-name>}"

echo "→ Fetching secrets from Doppler config: ${DOPPLER_CONFIG}"
SECRETS_JSON=$(doppler secrets download \
  --config "${DOPPLER_CONFIG}" \
  --project anywhere \
  --no-file \
  --format json)

echo "→ Building Railway variable set for service '${SERVICE_NAME}' in '${RAILWAY_ENV}'"

# Build a single `railway variables set` call with all KEY=VALUE pairs
VAR_ARGS=()
while IFS='=' read -r KEY VALUE; do
  if [[ "${KEY}" == DOPPLER_* ]]; then continue; fi
  VAR_ARGS+=("${KEY}=${VALUE}")
done < <(echo "${SECRETS_JSON}" | jq -r 'to_entries[] | "\(.key)=\(.value)"')

railway variables set \
  --environment "${RAILWAY_ENV}" \
  --service "${SERVICE_NAME}" \
  "${VAR_ARGS[@]}"

echo "✓ Railway service '${SERVICE_NAME}' (${RAILWAY_ENV}) synced from Doppler config '${DOPPLER_CONFIG}'"
