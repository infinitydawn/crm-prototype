#!/usr/bin/env bash
# Start postgres via docker compose, wait for it to be healthy, then apply schema.sql.
set -euo pipefail

cd "$(dirname "$0")"

echo "==> Starting postgres (docker compose up -d)"
docker compose up -d

echo "==> Waiting for postgres to be healthy"
until [ "$(docker inspect -f '{{.State.Health.Status}}' crm_postgres 2>/dev/null)" = "healthy" ]; do
  sleep 1
  printf '.'
done
echo " postgres is healthy"

echo "==> Applying schema.sql"
docker exec -i crm_postgres psql -U crm -d crm -v ON_ERROR_STOP=1 < schema.sql

echo "==> Done. Connection: postgres://crm:crm@localhost:5432/crm"