import express from 'express';
import { pool } from './db.js';

const router = express.Router();
const err = (res, status, msg) => res.status(status).json({ error: msg });

// ---------------------------------------------------------------------------
// Users (for assignee/owner pickers) — must be registered FIRST, before the
// generic /:entity wildcard, so /users resolves here and not as entity=users.
// ---------------------------------------------------------------------------
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, avatar_url FROM users ORDER BY name');
    res.json(rows);
  } catch (e) { err(res, 500, e.message); }
});

// ---------------------------------------------------------------------------
// Entity registry — one config per record type. All surfaces share one CRUD
// model (per spec: same search/filter/edit/inline patterns everywhere).
// ---------------------------------------------------------------------------
const ENTITIES = {
  tasks: {
    table: 'tasks',
    title: 'name',
    searchable: ['name', 'description'],
    list: [
      'id', 'name', 'status', 'priority', 'assignee_id', 'due_date',
      'project_id', 'account_id', 'contact_id', 'opportunity_id',
    ],
    joins: {
      assignee_id: ['users', 'name', 'assignee_name'],
      project_id: ['projects', 'name', 'project_name'],
      account_id: ['accounts', 'name', 'account_name'],
      contact_id: ['contacts', 'name', 'contact_name'],
    },
  },
  projects: {
    table: 'projects',
    title: 'name',
    searchable: ['name', 'description'],
    list: ['id', 'name', 'status', 'owner_id', 'due_date', 'description'],
    joins: { owner_id: ['users', 'name', 'owner_name'] },
  },
  contacts: {
    table: 'contacts',
    title: 'name',
    searchable: ['name', 'email', 'phone'],
    list: ['id', 'name', 'email', 'phone', 'account_id', 'status', 'owner_id'],
    joins: { account_id: ['accounts', 'name', 'account_name'], owner_id: ['users', 'name', 'owner_name'] },
  },
  accounts: {
    table: 'accounts',
    title: 'name',
    searchable: ['name', 'website', 'phone'],
    list: ['id', 'name', 'status', 'website', 'phone', 'owner_id'],
    joins: { owner_id: ['users', 'name', 'owner_name'] },
  },
  leads: {
    table: 'leads',
    title: 'name',
    searchable: ['name', 'email', 'phone', 'company'],
    list: ['id', 'name', 'email', 'phone', 'company', 'source', 'status', 'owner_id'],
    joins: { owner_id: ['users', 'name', 'owner_name'] },
  },
  opportunities: {
    table: 'opportunities',
    title: 'name',
    searchable: ['name'],
    list: ['id', 'name', 'account_id', 'contact_id', 'stage', 'amount', 'probability', 'close_date', 'owner_id'],
    joins: {
      account_id: ['accounts', 'name', 'account_name'],
      contact_id: ['contacts', 'name', 'contact_name'],
      owner_id: ['users', 'name', 'owner_name'],
    },
  },
};

const PIPELINE = {
  status: [],
  priority: ['low', 'normal', 'high', 'urgent'],
  stage: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
};

// Build a SELECT list with joined display columns. Every base column is
// qualified with the table name to avoid ambiguity from LEFT JOINs.
function selectFor(cfg) {
  const cols = cfg.list.map((c) => `${cfg.table}.${c}`);
  const joins = [];
  for (const [fk, [tbl, col, alias]] of Object.entries(cfg.joins || {})) {
    joins.push(`LEFT JOIN ${tbl} j_${fk} ON j_${fk}.id = ${cfg.table}.${fk}`);
    cols.push(`j_${fk}.${col} AS ${alias}`);
  }
  return { cols: cols.join(', '), joins: joins.join('\n') };
}

// ---------------------------------------------------------------------------
// Generic list
// GET /api/:entity?q=&status=&assignee_id=&...&limit=&offset=&sort=
// ---------------------------------------------------------------------------
const FILTER_KEYS = ['status', 'stage', 'priority', 'assignee_id', 'owner_id', 'project_id', 'account_id', 'contact_id', 'opportunity_id'];

router.get('/:entity', async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return err(res, 404, `unknown entity: ${req.params.entity}`);
  try {
    const { cols, joins } = selectFor(cfg);

    const where = [];
    const params = [];
    let i = 1;

    const { q, limit = 100, offset = 0, sort } = req.query;

    if (q) {
      const like = `%${q.toLowerCase()}%`;
      const conds = cfg.searchable.map((c) => `LOWER(${cfg.table}.${c}) LIKE $${i++}`);
      where.push(`(${conds.join(' OR ')})`);
      cfg.searchable.forEach(() => params.push(like));
    }

    for (const key of FILTER_KEYS) {
      const v = req.query[key];
      if (v === undefined) continue;
      where.push(`${cfg.table}.${key} = $${i++}`);
      params.push(/^\d+$/.test(v) ? Number(v) : v);
    }

    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';
    const order = cfg.list.includes(sort) ? sort : 'id';
    const orderSql = `${cfg.table}.${order}`;

    const { rows } = await pool.query(
      `SELECT ${cols} FROM ${cfg.table}\n${joins}\n${whereSql}\nORDER BY ${orderSql} LIMIT $${i} OFFSET $${i + 1}`,
      [...params, Number(limit), Number(offset)]
    );
    const total = await pool.query(`SELECT count(*)::int AS n FROM ${cfg.table}${whereSql}`, params);
    res.json({ total: total.rows[0].n, rows });
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---------------------------------------------------------------------------
// Generic get one (with related display names via joins)
// GET /api/:entity/:id
// ---------------------------------------------------------------------------
router.get('/:entity/:id', async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return err(res, 404, `unknown entity: ${req.params.entity}`);
  try {
    const id = Number(req.params.id);
    const { cols, joins } = selectFor(cfg);
    const { rows } = await pool.query(
      `SELECT ${cols} FROM ${cfg.table}\n${joins}\nWHERE ${cfg.table}.id = $1`,
      [id]
    );
    if (rows.length === 0) return err(res, 404, `${req.params.entity}: not found`);
    res.json({ ...rows[0], pipeline: PIPELINE });
  } catch (e) {
    err(res, 500, e.message);
  }
});

// Generic POST create. Accept any scalar field the table allows.
// POST /api/:entity {name|field: val, ...}
const GUARD = new Set(['id', 'created_at', 'updated_at', 'version', 'created_by']);

router.post('/:entity', async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return err(res, 404, `unknown entity: ${req.params.entity}`);
  try {
    const body = req.body || {};
    if (!body[cfg.title]) return err(res, 400, `${cfg.title} is required`);
    const allowed = cfg.list;
    const fields = [];
    const params = [];
    let i = 1;
    for (const f of allowed) {
      if (f === 'id' || GUARD.has(f)) continue;
      if (body[f] !== undefined) {
        fields.push(f);
        params.push(body[f]);
      }
    }
    const colsSql = fields.join(', ');
    const ph = fields.map((_, idx) => `$${idx + 1}`).join(', ');
    const { rows } = await pool.query(
      `INSERT INTO ${cfg.table} (${colsSql}) VALUES (${ph}) RETURNING *`,
      params
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return err(res, 409, 'record conflicts with an existing one');
    err(res, 500, e.message);
  }
});

// Generic PATCH — autosave with optimistic concurrency.
// PATCH /api/:entity/:id {fields...}    => applies and bumps version
// PATCH /api/:entity/:id {fields, version} => 409 if version mismatch
// Returns {record, changedFields}
router.patch('/:entity/:id', async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return err(res, 404, `unknown entity: ${req.params.entity}`);
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const { rows: cur } = await client.query(
        `SELECT version FROM ${cfg.table} WHERE id = $1 FOR UPDATE`, [id]
      );
      if (cur.length === 0) { await client.query('ROLLBACK'); return err(res, 404, 'not found'); }
      const serverVersion = cur[0].version;
      const clientVersion = b.version;

      if (clientVersion !== undefined && Number(clientVersion) !== serverVersion) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'This record changed elsewhere. Review the latest version before applying your edit.',
          serverVersion,
        });
      }

      const allowed = cfg.list;
      const sets = [];
      const params = [];
      let i = 1;
      for (const f of allowed) {
        if (f === 'id' || GUARD.has(f)) continue;
        if (b[f] !== undefined) { sets.push(`${f} = $${i++}`); params.push(b[f]); }
      }
      if (sets.length === 0) { await client.query('ROLLBACK'); return err(res, 400, 'no fields to update'); }
      sets.push(`version = version + 1`);
      sets.push(`updated_at = now()`);
      params.push(id);
      const { rows } = await client.query(
        `UPDATE ${cfg.table} SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
        params
      );
      await client.query('COMMIT');
      res.json({ record: rows[0], changedFields: Object.keys(b).filter((k) => k !== 'version') });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (e) {
    err(res, 500, e.message);
  }
});

// DELETE /api/:entity/:id -> 204  (hard delete; spec prefers archive — client uses archive for records)
router.delete('/:entity/:id', async (req, res) => {
  const cfg = ENTITIES[req.params.entity];
  if (!cfg) return err(res, 404, `unknown entity: ${req.params.entity}`);
  try {
    const id = Number(req.params.id);
    const r = await pool.query(`DELETE FROM ${cfg.table} WHERE id = $1`, [id]);
    if (r.rowCount === 0) return err(res, 404, 'not found');
    res.status(204).end();
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---------------------------------------------------------------------------
// Shared: activities + comments (polymorphic by entity_type + entity_id)
// ---------------------------------------------------------------------------
const ENTITY_TYPES = ['task', 'project', 'contact', 'account', 'lead', 'opportunity'];

// GET /api/:entity/:id/activities
router.get('/:entity/:id/activities', async (req, res) => {
  const type = req.params.entity.replace(/s$/, '');
  if (!ENTITY_TYPES.includes(type)) return err(res, 400, 'invalid entity');
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u.name AS owner_name FROM activities a
       LEFT JOIN users u ON u.id = a.owner_id
       WHERE a.entity_type = $1 AND a.entity_id = $2 ORDER BY a.happened_at DESC`,
      [type, Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) { err(res, 500, e.message); }
});

// POST /api/:entity/:id/activities {act_type, subject?, body?, happened_at?}
router.post('/:entity/:id/activities', async (req, res) => {
  const type = req.params.entity.replace(/s$/, '');
  if (!ENTITY_TYPES.includes(type)) return err(res, 400, 'invalid entity');
  try {
    const b = req.body || {};
    const actType = b.act_type || 'note';
    const { rows } = await pool.query(
      `INSERT INTO activities (act_type, subject, body, happened_at, entity_type, entity_id, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [actType, b.subject || null, b.body || null, b.happened_at || new Date().toISOString(), type, Number(req.params.id), b.owner_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { err(res, 500, e.message); }
});

// GET /api/:entity/:id/comments
router.get('/:entity/:id/comments', async (req, res) => {
  const type = req.params.entity.replace(/s$/, '');
  if (!ENTITY_TYPES.includes(type)) return err(res, 400, 'invalid entity');
  try {
    const { rows } = await pool.query(
      `SELECT c.*, u.name AS author_name FROM comments c
       LEFT JOIN users u ON u.id = c.author_id
       WHERE c.entity_type = $1 AND c.entity_id = $2 ORDER BY c.created_at`,
      [type, Number(req.params.id)]
    );
    res.json(rows);
  } catch (e) { err(res, 500, e.message); }
});

// POST /api/:entity/:id/comments {body, author_id?}
router.post('/:entity/:id/comments', async (req, res) => {
  const type = req.params.entity.replace(/s$/, '');
  if (!ENTITY_TYPES.includes(type)) return err(res, 400, 'invalid entity');
  try {
    const b = req.body || {};
    if (!b.body || !String(b.body).trim()) return err(res, 400, 'body is required');
    const { rows } = await pool.query(
      `INSERT INTO comments (body, entity_type, entity_id, author_id) VALUES ($1,$2,$3,$4) RETURNING *`,
      [String(b.body).trim(), type, Number(req.params.id), b.author_id || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) { err(res, 500, e.message); }
});

// ---------------------------------------------------------------------------
// Users (for assignee/owner pickers)
// ---------------------------------------------------------------------------
router.get('/users', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name, email, avatar_url FROM users ORDER BY name');
    res.json(rows);
  } catch (e) { err(res, 500, e.message); }
});

export default router;