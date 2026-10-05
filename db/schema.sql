-- Monday-like CRM schema (AUTHORITATIVE — from SPEC.md) + seed data
-- Re-runnable: drops existing tables first (dev convenience).

DROP TABLE IF EXISTS item_values CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS boards CASCADE;

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

-- ===========================================================================
-- SEED DATA
-- ===========================================================================

-- Board 1: Product Roadmap
INSERT INTO boards (id, name) VALUES (1, 'Product Roadmap');

INSERT INTO columns (id, board_id, title, col_type, options) VALUES
  (1, 1, 'Task',     'text',   '{}'),
  (2, 1, 'Status',   'status', '{"labels":["Done","In progress","Stuck"]}'),
  (3, 1, 'Priority', 'number', '{}'),
  (4, 1, 'Due',      'date',   '{}'),
  (5, 1, 'Owner',    'person', '{}');

INSERT INTO items (id, board_id, title) VALUES
  (1, 1, 'Implement auth'),
  (2, 1, 'Build dashboard');

INSERT INTO item_values (item_id, column_id, value) VALUES
  (1, 1, 'Implement auth'),
  (1, 2, 'In progress'),
  (1, 3, '1'),
  (1, 4, '2026-09-15'),
  (1, 5, 'Alice'),
  (2, 1, 'Build dashboard'),
  (2, 2, 'Done'),
  (2, 3, '2'),
  (2, 4, '2026-08-30'),
  (2, 5, 'Bob');

-- Board 2: Customer Pipeline
INSERT INTO boards (id, name) VALUES (2, 'Customer Pipeline');

INSERT INTO columns (id, board_id, title, col_type, options) VALUES
  (6, 2, 'Company',    'text',   '{}'),
  (7, 2, 'Stage',      'status', '{"labels":["Lead","Discovery","Negotiation","Won"]}'),
  (8, 2, 'Deal size',  'number', '{}');

INSERT INTO items (id, board_id, title) VALUES
  (3, 2, 'Acme Corp'),
  (4, 2, 'Globex Ltd');

INSERT INTO item_values (item_id, column_id, value) VALUES
  (3, 6, 'Acme Corp'),
  (3, 7, 'Negotiation'),
  (3, 8, '50000'),
  (4, 6, 'Globex Ltd'),
  (4, 7, 'Discovery'),
  (4, 8, '120000');

-- reset sequences so future inserts keep incrementing
SELECT setval('boards_id_seq', (SELECT COALESCE(MAX(id),0) FROM boards));
SELECT setval('columns_id_seq', (SELECT COALESCE(MAX(id),0) FROM columns));
SELECT setval('items_id_seq', (SELECT COALESCE(MAX(id),0) FROM items));
SELECT setval('item_values_id_seq', (SELECT COALESCE(MAX(id),0) FROM item_values));