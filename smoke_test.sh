#!/usr/bin/env bash
# Integration smoke test for the CRM prototype.
# Run from /home/mn/crm-prototype after all agents finish.
set -euo pipefail
API="http://localhost:5000/api"
B=""

echo "=== 1. Boards list ==="; curl -s "$API/boards"; echo
echo "=== 2. Create board ==="; B=$(curl -s -X POST "$API/boards" -H 'Content-Type: application/json' -d '{"name":"Smoke Test Board"}'); echo "$B"
BID=$(echo "$B" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "BoardID: $BID"
echo "=== 3. Add column ==="; C=$(curl -s -X POST "$API/boards/$BID/columns" -H 'Content-Type: application/json' -d '{"title":"Status","col_type":"status","options":{"labels":["New","Done"]}}'); echo "$C"
echo "=== 4. Add item ==="; I=$(curl -s -X POST "$API/boards/$BID/items" -H 'Content-Type: application/json' -d '{"title":"Test item"}'); echo "$I"
IID=$(echo "$I" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
CID=$(echo "$C" | python3 -c "import sys,json;print(json.load(sys.stdin)['id'])")
echo "=== 5. Set value ==="; curl -s -X PUT "$API/items/$IID/values" -H 'Content-Type: application/json' -d "{\"$CID\":\"Done\"}"; echo
echo "=== 6. Patch item title ==="; curl -s -X PATCH "$API/items/$IID" -H 'Content-Type: application/json' -d '{"title":"Renamed"}'; echo
echo "=== 7. GET nested board ==="; curl -s "$API/boards/$BID"; echo
echo "=== 8. Delete item ==="; curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$API/items/$IID"
echo "=== 9. Delete column ==="; curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$API/columns/$CID"
echo "=== 10. Delete board ==="; curl -s -o /dev/null -w "%{http_code}\n" -X DELETE "$API/boards/$BID"
echo "=== DONE ==="