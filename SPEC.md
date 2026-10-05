# Monday-Like CRM — Prototype Spec

Goal: a working CRUD prototype of a CRM/task board similar to Monday.com.
Stack (fixed):
- **Database:** PostgreSQL
- **Backend:** Node.js (Express) + `pg`
- **Frontend:** Latest React (18/19) via Vite
- Postgres runs via Docker for local dev.

Layout:
```
/home/mn/crm-prototype/
  SPEC.md            <- this file (single source of truth for all agents)
  db/
    schema.sql       <- full schema + seed data (AGENT A)
    init.sh          <- optional; not required
    docker-compose.yml  <- postgres service (AGENT A)
  server/
    package.json     <- Express + pg + cors (AGENT B)
    db.js            <- pg Pool
    index.js         <- Express app + routes
  client/
    package.json     <- Vite + React 18/19 (AGENT C)
    index.html
    vite.config.js   <- proxy /api -> http://localhost:5000
    src/
      main.jsx
      App.jsx
      api.js         <- fetch wrappers
      components/BoardList.jsx, BoardView.jsx, ColumnHeader.jsx, ItemRow.jsx, CellEditor.jsx, Modal.jsx
      styles.css
```

## Database schema (AUTHORITATIVE)

```sql
CREATE TABLE boards (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A column defines one field per board. TYPES stay normalized so they are
-- easy to add/remove (this is the Monday.com model: dynamic columns per board).
CREATE TABLE columns (
  id          SERIAL PRIMARY KEY,
  board_id    INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  col_type    TEXT NOT NULL DEFAULT 'text',  -- text | number | date | status | person
  options     JSONB NOT NULL DEFAULT '{}',   -- e.g. status: {"labels":["Done","In progress","Stuck"]}
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- An item = one row on a board (a task/card/company).
CREATE TABLE items (
  id          SERIAL PRIMARY KEY,
  board_id    INT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cell values. One row per (item, column). Sparse: only filled cells exist.
-- value stored as TEXT; the client parses by col_type (number -> number, date -> ISO).
CREATE TABLE item_values (
  id          SERIAL PRIMARY KEY,
  item_id     INT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  column_id   INT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  value       TEXT,
  UNIQUE (item_id, column_id)
);
```

Seed: 2 boards. "Product Roadmap" with columns: Task(text), Status(status, labels ["Done","In progress","Stuck"]), Priority(number), Due(date), Owner(person). 2 items filled with sample values. "Customer Pipeline" with columns Company(text), Stage(status), Deal size(number), 2 items.

## REST API contract (AUTHORITATIVE)

Base URL: `http://localhost:5000/api`. All JSON. CORS enabled.

- `GET  /boards`                        -> `[{id,name}]` (list boards; keep light, no children)
- `POST /boards`  {name}                -> created board `{id,name}`
- `DELETE /boards/:id`                  -> 204
- `GET  /boards/:id`                    -> full board:
  `{ id, name, columns:[{id,title,col_type,options}], items:[{id,title, values:{<columnId>: <valueString>}}] }`
  where `values` is an object keyed by column id (string keys).
- `POST /boards/:id/columns`  {title,col_type,options} -> created column `{id,...}`
- `PATCH /columns/:id`  {title?,col_type?,options?}    -> updated column
- `DELETE /columns/:id`                 -> 204
- `POST /boards/:id/items`  {title}     -> created item `{id,title,board_id}`
- `PATCH /items/:id`  {title?}          -> updated item title
- `DELETE /items/:id`                   -> 204
- `PUT /items/:id/values`  {columnId: valueString,...} -> upsert those cell values; returns `{itemId, values}`
  (bulk set: for each key that is a real column of the item's board, upsert item_values.)

Error shape on failure: `{error: "message"}` with appropriate 4xx/5xx status.

## Backend details (AGENT B)
- Port **5000**. Use `cors()` and `express.json()`.
- db.js: `pg` Pool connecting to `postgres://crm:crm@localhost:5432/crm`.
- Return clean JSON; set proper status codes (201 on create, 204 on delete).
- GET /boards/:id must assemble nested object with a single query flow (query board+columns, then items, then values; combine in JS). Use async/await.
- PUT /items/:id/values: verify item exists, verify each columnId belongs to item's board. Upsert with `ON CONFLICT (item_id,column_id) DO UPDATE SET value=EXCLUDED.value`. Ignore/400 unknown columns (return 400 listing them). After write, return the item's full current values map.

## Frontend details (AGENT C)
- Vite React app. Two views swapped in App via simple state (no router needed).
- **BoardList**: fetch `/boards`, create new board (name input + button), click to open a board, delete board button. Clean cards.
- **BoardView**: fetch `/boards/:id`. Render as a table/grid:
  - Header row: one th per column (title + type) + "+ Add column" affordance (name + type select + optional status labels input -> POST).
  - Body: one row per item. First cell = item title (click to edit inline or via small prompt/input). Remaining cells = cell value, click to edit (CellEditor).
  - A "+ Add row" button (POST item).
  - Per-row delete button.
  - Cell editing by type:
    - text/number: inline input, commit on Enter/blur via PUT values.
    - date: `<input type="date">`, store ISO date string (e.g. "2026-09-01").
    - status: a `<select>` over options.labels (fallback default labels), commit on change.
    - person: free-text input (keep simple).
  - Editing a cell updates local state optimistically, then PUT; on error revert + show alert.
- Styling: clean modern CSS, Monday-like pastel accents, sticky header row, hover states. No UI library required — plain CSS is fine.
- vite.config.js: `server: { proxy: { '/api': 'http://localhost:5000' } }` so the client can call `/api/...` relative and avoid CORS in dev.
- api.js: small async fetch helpers: getJSON(url), postJSON(url, body), patchJSON, putJSON, delJSON(url). Reject/non-2xx -> throw with parsed error message.

## Acceptance (integration check, done by orchestrator after all agents)
1. `docker compose -f db/docker-compose.yml up -d` starts Postgres.
2. `psql` runs db/schema.sql into it (or agent provides a script).
3. `npm install && node index.js` in server/ -> API responds on 5000.
4. Full board GET returns nested structure with seed data.
5. CRUD on a board works: create board, add column, add item, set a value, patch title, delete item/column/board.
6. `npm install && npm run dev` in client/ -> Vite serves; proxy works; UI loads boards, shows a board grid, edits a cell, adds a row.