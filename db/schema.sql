-- ============================================================================
-- Combined Work Management + CRM — unified record model (per product spec)
-- Extends the original board/column/item prototype. Keeps boards intact and
-- adds the typed, normalized record model every surface shares.
-- Re-runnable for dev: drops all tables first.
-- ============================================================================

DROP TABLE IF EXISTS taggings CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS activities CASCADE;
DROP TABLE IF EXISTS files CASCADE;
DROP TABLE IF EXISTS saved_views CASCADE;
DROP TABLE IF EXISTS automations CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS opportunities CASCADE;
DROP TABLE IF EXISTS leads CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;

-- Board prototype tables (kept for the Monday-style capability)
DROP TABLE IF EXISTS item_values CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS boards CASCADE;

-- ============================================================================
-- Workspace / People
-- ============================================================================
CREATE TABLE workspaces (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE teams (
  id          SERIAL PRIMARY KEY,
  workspace_id INT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE team_members (
  team_id  INT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id  INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_id, user_id)
);

-- ============================================================================
-- Work
-- ============================================================================
CREATE TABLE projects (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'not_started',
  owner_id    INT REFERENCES users(id) ON DELETE SET NULL,
  due_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     INT NOT NULL DEFAULT 1
);

-- ============================================================================
-- Sales (created before tasks because tasks have FKs to these tables)
-- ============================================================================
CREATE TABLE accounts (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',   -- active | inactive | lead
  website     TEXT,
  phone       TEXT,
  owner_id    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     INT NOT NULL DEFAULT 1
);

CREATE TABLE contacts (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  account_id  INT REFERENCES accounts(id) ON DELETE SET NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  owner_id    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     INT NOT NULL DEFAULT 1
);

CREATE TABLE leads (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT,
  phone       TEXT,
  company     TEXT,
  source      TEXT,
  status      TEXT NOT NULL DEFAULT 'new',      -- new | contacted | qualified | proposal | won | lost
  owner_id    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  version     INT NOT NULL DEFAULT 1
);

CREATE TABLE opportunities (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  account_id     INT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id     INT REFERENCES contacts(id) ON DELETE SET NULL,
  stage          TEXT NOT NULL DEFAULT 'new',   -- new | contacted | qualified | proposal | won | lost
  amount         NUMERIC(14,2),
  probability    INT,                            -- 0-100, stage-derived default, manually overridable
  close_date     DATE,
  owner_id       INT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  version        INT NOT NULL DEFAULT 1
);

-- A task may relate to one primary business record (project/account/contact/opportunity)
CREATE TABLE tasks (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'not_started',
  priority       TEXT,                       -- low | normal | high | urgent
  assignee_id    INT REFERENCES users(id) ON DELETE SET NULL,
  due_date       DATE,
  project_id     INT REFERENCES projects(id) ON DELETE SET NULL,
  account_id     INT REFERENCES accounts(id) ON DELETE SET NULL,
  contact_id     INT REFERENCES contacts(id) ON DELETE SET NULL,
  opportunity_id INT REFERENCES opportunities(id) ON DELETE SET NULL,
  description    TEXT,
  created_by     INT REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  version        INT NOT NULL DEFAULT 1
);

-- ============================================================================
-- Shared: Activities, Comments, Files, Tags, Saved views, Automations
-- ============================================================================
-- An activity belongs to one primary record via entity_type + entity_id
-- (contact | account | lead | opportunity | task | project)
CREATE TABLE activities (
  id          SERIAL PRIMARY KEY,
  act_type    TEXT NOT NULL DEFAULT 'note',      -- call | meeting | note | email
  subject     TEXT,
  body        TEXT,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  entity_type TEXT NOT NULL,                     -- contact | account | lead | opportunity | task | project
  entity_id   INT NOT NULL,
  owner_id    INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE comments (
  id          SERIAL PRIMARY KEY,
  body        TEXT NOT NULL,
  entity_type TEXT NOT NULL,                     -- task | contact | account | opportunity | lead | project
  entity_id   INT NOT NULL,
  author_id   INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE files (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  url         TEXT,
  size_bytes  BIGINT,
  entity_type TEXT,                              -- task | contact | account | ...
  entity_id   INT,
  uploader_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tags (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE
);

CREATE TABLE taggings (
  id          SERIAL PRIMARY KEY,
  tag_id      INT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id   INT NOT NULL,
  UNIQUE (tag_id, entity_type, entity_id)
);

CREATE TABLE saved_views (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  entity_type TEXT NOT NULL,                     -- task | contact | account | opportunity | lead | project
  view_type   TEXT NOT NULL DEFAULT 'table',     -- table | kanban | calendar
  columns     JSONB NOT NULL DEFAULT '[]',
  column_order JSONB NOT NULL DEFAULT '[]',
  sort        JSONB,
  grouping    JSONB,
  filters     JSONB,
  density     TEXT NOT NULL DEFAULT 'standard',
  owner_id    INT REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE automations (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  trigger     JSONB NOT NULL,
  actions     JSONB NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  workspace_id INT REFERENCES workspaces(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for polymorphic lookups and common list queries
CREATE INDEX idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_project ON tasks(project_id);
CREATE INDEX idx_activities_entity ON activities(entity_type, entity_id);
CREATE INDEX idx_comments_entity ON comments(entity_type, entity_id);
CREATE INDEX idx_taggings_entity ON taggings(entity_type, entity_id);
CREATE INDEX idx_opps_owner ON opportunities(owner_id);
CREATE INDEX idx_opps_stage ON opportunities(stage);
CREATE INDEX idx_contacts_account ON contacts(account_id);

-- ============================================================================
-- Seed data
-- ============================================================================
INSERT INTO workspaces (id, name) VALUES (1, 'Default Workspace');

INSERT INTO users (id, name, email) VALUES
  (1, 'Maya Chen', 'maya@example.com'),
  (2, 'Sam Ortiz', 'sam@example.com'),
  (3, 'Jordan Lee', 'jordan@example.com');

INSERT INTO workspace_members (workspace_id, user_id) VALUES (1,1),(1,2),(1,3);

INSERT INTO teams (id, workspace_id, name) VALUES (1,1,'Engineering'),(2,1,'Sales');
INSERT INTO team_members (team_id, user_id) VALUES (1,1),(1,2),(2,3);

-- Accounts + contacts
INSERT INTO accounts (id, name, status, owner_id) VALUES
  (1, 'Acme Corp',  'active', 3),
  (2, 'Northwind',  'active', 3),
  (3, 'Globex',     'lead',   2);

INSERT INTO contacts (id, name, email, phone, account_id, owner_id) VALUES
  (1, 'Alice Johnson', 'alice@acme.com',    '555-0101', 1, 3),
  (2, 'Bob Smith',     'bob@northwind.com', '555-0102', 2, 3),
  (3, 'Carol White',   'carol@globex.com',  '555-0103', 3, 2);

-- Opportunities + leads
INSERT INTO opportunities (id, name, account_id, contact_id, stage, amount, probability, close_date, owner_id) VALUES
  (1, 'Acme expansion', 1, 1, 'proposal', 25000.00, 60, '2026-10-15', 3),
  (2, 'Northwind renew', 2, 2, 'qualified', 15000.00, 40, '2026-11-01', 3),
  (3, 'Globex pilot',   3, 3, 'new',       8000.00, 20, '2026-12-01', 2);

INSERT INTO leads (id, name, email, phone, company, source, status, owner_id) VALUES
  (1, 'David Kim',  'david@initech.com', '555-0201', 'Initech',  'Website',  'new', 2),
  (2, 'Eve Torres', 'eve@umbrella.com',  '555-0202', 'Umbrella', 'Referral', 'contacted', 3);

-- Projects + tasks
INSERT INTO projects (id, name, description, status, owner_id, due_date) VALUES
  (1, 'Website redesign', 'New marketing site with CMS', 'in_progress', 1, '2026-11-30'),
  (2, 'Mobile app v2',    'Q4 mobile release',          'not_started', 1, '2026-12-15');

INSERT INTO tasks (id, name, status, priority, assignee_id, due_date, project_id, account_id, contact_id, opportunity_id) VALUES
  (1, 'Design landing page',   'in_progress', 'normal', 1, '2026-10-10', 1, NULL, NULL, NULL),
  (2, 'Wire CMS content model','not_started', 'high',   2, '2026-10-14', 1, NULL, NULL, NULL),
  (3, 'Call Acme about scope', 'blocked',     'high',   3, '2026-10-08', NULL, 1, 1, 1),
  (4, 'Draft renewal proposal','not_started', 'normal', 3, '2026-10-20', NULL, 2, 2, 2);

-- Activities + comments
INSERT INTO activities (act_type, subject, body, happened_at, entity_type, entity_id, owner_id) VALUES
  ('call',    'Kickoff call',        'Reviewed scope, budget ~25k', now() - interval '2 days', 'account', 1, 3),
  ('meeting', 'Proposal walkthrough','Presented proposal, next step: sign', now() - interval '1 day', 'opportunity', 1, 3),
  ('note',    'Scope note',          'Client wants SSO by Nov.', now() - interval '3 hours', 'contact', 1, 3);

INSERT INTO comments (body, entity_type, entity_id, author_id) VALUES
  ('Assignee confirmed for landing page.', 'task', 1, 1),
  ('Waiting on legal for the contract.',   'opportunity', 1, 3);

INSERT INTO tags (id, name) VALUES (1,'priority'),(2,'follow-up'),(3,'design');
INSERT INTO taggings (tag_id, entity_type, entity_id) VALUES
  (2,'task',3),(3,'task',1),(1,'opportunity',1);

-- Reset sequences
SELECT setval('workspaces_id_seq', 1, true);
SELECT setval('users_id_seq', 3, true);
SELECT setval('teams_id_seq', 2, true);
SELECT setval('accounts_id_seq', 3, true);
SELECT setval('contacts_id_seq', 3, true);
SELECT setval('opportunities_id_seq', 3, true);
SELECT setval('leads_id_seq', 2, true);
SELECT setval('projects_id_seq', 2, true);
SELECT setval('tasks_id_seq', 4, true);
SELECT setval('activities_id_seq', 3, true);
SELECT setval('comments_id_seq', 2, true);
SELECT setval('tags_id_seq', 3, true);