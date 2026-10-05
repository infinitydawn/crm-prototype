#!/usr/bin/env bash
# Dev launcher for the CRM prototype. Run from /home/mn/crm-prototype.
set -euo pipefail

echo "===> 1. Start Postgres (Docker)"
(cd db && docker compose up -d)
until docker exec crm_postgres pg_isready -U crm >/dev/null 2>&1; do sleep 1; done
echo "      Postgres up."

echo "===> 2. Apply schema (idempotent)"
# Re-running drops and recreates; for dev that's fine.
docker exec -i crm_postgres psql -U crm -d crm < db/schema.sql >/dev/null
echo "      Schema applied."

echo "===> 3. Start API on :5000"
(cd server && npm install --silent && nohup node index.js > /tmp/crm_server.log 2>&1 &)
sleep 2
curl -sf http://localhost:5000/api/boards >/dev/null && echo "      API up." || { echo "      API failed"; tail -5 /tmp/crm_server.log; exit 1; }

echo "===> 4. Start frontend on :5173"
(cd client && npm install --silent && nohup npm run dev > /tmp/crm_client.log 2>&1 &)
sleep 4
curl -sf http://localhost:5173/ >/dev/null && echo "      Frontend up." || { echo "      Frontend failed"; tail -5 /tmp/crm_client.log; exit 1; }

echo ""
echo "✓ CRM running:  http://localhost:5173"
echo "  (API: http://localhost:5000  |  Postgres: localhost:5432)"