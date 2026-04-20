#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${1:-anywhere}"

echo "Ensuring Doppler project '${PROJECT_NAME}' has required environments..."

for CONFIG in development staging production; do
  if doppler configs get "${CONFIG}" --project "${PROJECT_NAME}" >/dev/null 2>&1; then
    echo "  - ${CONFIG} already exists"
  else
    doppler configs create "${CONFIG}" --project "${PROJECT_NAME}"
    echo "  - created ${CONFIG}"
  fi
done

echo ""
echo "Populate required secrets in each config (interactive):"
echo "  doppler secrets set TEQUILA_API_KEY DUFFEL_TEST_TOKEN DUFFEL_LIVE_TOKEN GEODB_RAPIDAPI_KEY NEXT_PUBLIC_MAPBOX_TOKEN MAPBOX_SECRET_TOKEN DATABASE_URL REDIS_URL STRIPE_SECRET_KEY --project ${PROJECT_NAME} --config development"
echo "  doppler secrets set TEQUILA_API_KEY DUFFEL_TEST_TOKEN DUFFEL_LIVE_TOKEN GEODB_RAPIDAPI_KEY NEXT_PUBLIC_MAPBOX_TOKEN MAPBOX_SECRET_TOKEN DATABASE_URL REDIS_URL STRIPE_SECRET_KEY --project ${PROJECT_NAME} --config staging"
echo "  doppler secrets set TEQUILA_API_KEY DUFFEL_TEST_TOKEN DUFFEL_LIVE_TOKEN GEODB_RAPIDAPI_KEY NEXT_PUBLIC_MAPBOX_TOKEN MAPBOX_SECRET_TOKEN DATABASE_URL REDIS_URL STRIPE_SECRET_KEY --project ${PROJECT_NAME} --config production"
echo ""
echo "Next sync targets:"
echo "  ./scripts/secrets/sync-vercel.sh staging preview"
echo "  ./scripts/secrets/sync-vercel.sh production production"
echo "  ./scripts/secrets/sync-railway.sh staging staging search-service"
echo "  ./scripts/secrets/sync-railway.sh production production search-service"
