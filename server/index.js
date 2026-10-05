import express from 'express';
import cors from 'cors';
import { pool, waitForDb } from './db.js';

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json());

const err = (res, status, msg) => res.status(status).json({ error: msg });

// ---- Boards ----

// GET /boards -> [{id,name}]
app.get('/api/boards', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT id, name FROM boards ORDER BY id');
    res.json(rows);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// POST /boards {name} -> 201 {id,name}
app.post('/api/boards', async (req, res) => {
  try {
    const name = (req.body && req.body.name != null) ? String(req.body.name).trim() : '';
    if (!name) return err(res, 400, 'name is required');
    const { rows } = await pool.query(
      'INSERT INTO boards (name) VALUES ($1) RETURNING id, name',
      [name]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// DELETE /boards/:id -> 204
app.delete('/api/boards/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM boards WHERE id = $1', [id]);
    if (result.rowCount === 0) return err(res, 404, 'board not found');
    res.status(204).end();
  } catch (e) {
    err(res, 500, e.message);
  }
});

// GET /boards/:id -> nested {id,name,columns,items}
app.get('/api/boards/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { rows: boards } = await pool.query('SELECT id, name FROM boards WHERE id = $1', [id]);
    if (boards.length === 0) return err(res, 404, 'board not found');
    const board = boards[0];

    const { rows: columns } = await pool.query(
      'SELECT id, title, col_type, options FROM columns WHERE board_id = $1 ORDER BY id',
      [id]
    );
    const { rows: items } = await pool.query(
      'SELECT id, title FROM items WHERE board_id = $1 ORDER BY id',
      [id]
    );

    let values = [];
    if (items.length > 0) {
      const ids = items.map((i) => i.id);
      const { rows } = await pool.query(
        'SELECT item_id, column_id, value FROM item_values WHERE item_id = ANY($1::int[])',
        [ids]
      );
      values = rows;
    }

    const valuesByItem = {};
    for (const v of values) {
      (valuesByItem[v.item_id] = valuesByItem[v.item_id] || {})[String(v.column_id)] = v.value;
    }

    board.columns = columns.map((c) => ({ id: c.id, title: c.title, col_type: c.col_type, options: c.options }));
    board.items = items.map((it) => ({ id: it.id, title: it.title, values: valuesByItem[it.id] || {} }));
    res.json(board);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---- Columns ----

// POST /boards/:id/columns {title,col_type?,options?} -> 201
app.post('/api/boards/:id/columns', async (req, res) => {
  try {
    const boardId = Number(req.params.id);
    const title = (req.body && req.body.title != null) ? String(req.body.title).trim() : '';
    if (!title) return err(res, 400, 'title is required');
    const colType = (req.body && req.body.col_type != null) ? String(req.body.col_type) : 'text';
    const options = (req.body && req.body.options != null && typeof req.body.options === 'object' && !Array.isArray(req.body.options))
      ? req.body.options
      : {};

    const boardCheck = await pool.query('SELECT 1 FROM boards WHERE id = $1', [boardId]);
    if (boardCheck.rowCount === 0) return err(res, 404, 'board not found');

    const { rows } = await pool.query(
      `INSERT INTO columns (board_id, title, col_type, options) VALUES ($1,$2,$3,$4)
       RETURNING id, board_id, title, col_type, options`,
      [boardId, title, colType, JSON.stringify(options)]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// PATCH /columns/:id {title?, col_type?, options?}
app.patch('/api/columns/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    if (Object.keys(b).length === 0) return err(res, 400, 'no fields to update');

    if (b.options !== undefined && (typeof b.options !== 'object' || b.options === null || Array.isArray(b.options))) {
      return err(res, 400, 'options must be an object');
    }

    const sets = [];
    const params = [];
    let i = 1;
    if (b.title !== undefined) { sets.push(`title = $${i++}`); params.push(String(b.title)); }
    if (b.col_type !== undefined) { sets.push(`col_type = $${i++}`); params.push(String(b.col_type)); }
    if (b.options !== undefined) { sets.push(`options = $${i++}`); params.push(JSON.stringify(b.options)); }

    params.push(id);
    const { rows } = await pool.query(
      `UPDATE columns SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, board_id, title, col_type, options`,
      params
    );
    if (rows.length === 0) return err(res, 404, 'column not found');
    res.json(rows[0]);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// DELETE /columns/:id -> 204
app.delete('/api/columns/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM columns WHERE id = $1', [id]);
    if (result.rowCount === 0) return err(res, 404, 'column not found');
    res.status(204).end();
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---- Items ----

// POST /boards/:id/items {title} -> 201
app.post('/api/boards/:id/items', async (req, res) => {
  try {
    const boardId = Number(req.params.id);
    const title = (req.body && req.body.title != null) ? String(req.body.title).trim() : '';
    if (!title) return err(res, 400, 'title is required');

    const boardCheck = await pool.query('SELECT 1 FROM boards WHERE id = $1', [boardId]);
    if (boardCheck.rowCount === 0) return err(res, 404, 'board not found');

    const { rows } = await pool.query(
      'INSERT INTO items (board_id, title) VALUES ($1,$2) RETURNING id, title, board_id',
      [boardId, title]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// PATCH /items/:id {title} -> updated item
app.patch('/api/items/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    if (b.title === undefined) return err(res, 400, 'title is required');
    const { rows } = await pool.query(
      'UPDATE items SET title = $1 WHERE id = $2 RETURNING id, title, board_id',
      [String(b.title), id]
    );
    if (rows.length === 0) return err(res, 404, 'item not found');
    res.json(rows[0]);
  } catch (e) {
    err(res, 500, e.message);
  }
});

// DELETE /items/:id -> 204
app.delete('/api/items/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await pool.query('DELETE FROM items WHERE id = $1', [id]);
    if (result.rowCount === 0) return err(res, 404, 'item not found');
    res.status(204).end();
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---- Values ----

// PUT /items/:id/values {columnId: valueString,...}
// Upsert each value, validating that every requested column belongs to the
// item's board. Returns the item's full current values map.
app.put('/api/items/:id/values', async (req, res) => {
  try {
    const itemId = Number(req.params.id);
    const body = req.body || {};
    const keys = Object.keys(body);

    // item + its board
    const { rows: itemRows } = await pool.query('SELECT id, board_id FROM items WHERE id = $1', [itemId]);
    if (itemRows.length === 0) return err(res, 404, 'item not found');
    const { id: itId, board_id: boardId } = itemRows[0];

    if (keys.length === 0) {
      // nothing to set -> return current values map
      const cur = await pool.query(
        'SELECT column_id, value FROM item_values WHERE item_id = $1',
        [itemId]
      );
      const map = {};
      for (const r of cur.rows) map[String(r.column_id)] = r.value;
      return res.json({ itemId: itId, values: map });
    }

    // validate keys are real columns of the item's board
    const colIds = keys.map((k) => Number(k));
    if (colIds.some((n) => !Number.isInteger(n) || n <= 0)) {
      return err(res, 400, 'column ids must be positive integers');
    }
    const colsRes = await pool.query(
      'SELECT id FROM columns WHERE board_id = $1 AND id = ANY($2::int[])',
      [boardId, colIds]
    );
    const valid = new Set(colsRes.rows.map((r) => r.id));
    const unknown = keys.filter((k) => !valid.has(Number(k)));
    if (unknown.length > 0) {
      return err(res, 400, `unknown column(s) for item's board: ${unknown.join(', ')}`);
    }

    for (const key of keys) {
      const colId = Number(key);
      const value = body[key];
      await pool.query(
        `INSERT INTO item_values (item_id, column_id, value) VALUES ($1,$2,$3)
         ON CONFLICT (item_id, column_id) DO UPDATE SET value = EXCLUDED.value`,
        [itId, colId, value == null ? null : String(value)]
      );
    }

    // return full current values map
    const cur = await pool.query(
      'SELECT column_id, value FROM item_values WHERE item_id = $1',
      [itemId]
    );
    const map = {};
    for (const r of cur.rows) map[String(r.column_id)] = r.value;
    res.json({ itemId: itId, values: map });
  } catch (e) {
    err(res, 500, e.message);
  }
});

// ---- Boot ----

const PORT = process.env.PORT || 5000;
waitForDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CRM server listening on http://localhost:${PORT}`);
    });
  })
  .catch((e) => {
    console.error('DB not available:', e.message);
    process.exit(1);
  });
