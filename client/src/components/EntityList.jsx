import React from 'react';
import { getJSON, postJSON, patchJSON, delJSON } from '../api.js';
import { ENTITIES, STATUS_TONE, STATUS_ICON, userName,
         fmtCurrency, fmtPercent } from '../spec.js';
import RecordPanel from './RecordPanel.jsx';

/**
 * Spec table view: toolbar (search / filters / density / column-set) + grid.
 * Rows inline-edit via AutosaveCell; selecting a row opens the right-side RecordPanel.
 */

export default function EntityList({ entityKey, users, selectedId, onOpenRecord, onCloseRecord }) {
  const cfg = ENTITIES[entityKey];
  const [rows, setRows] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [q, setQ] = React.useState('');
  const [filters, setFilters] = React.useState({});
  const [statusFilter, setStatusFilter] = React.useState('');
  const [density, setDensity] = React.useState('standard');
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  async function load() {
    const base = `/api/${entityKey}`;
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (statusFilter) {
      const fk = cfg.columns.find((c) => c.type === 'status');
      if (fk) params.set(fk.key, statusFilter);
    }
    const qs = params.toString();
    try {
      const d = await getJSON(qs ? `${base}?${qs}` : base);
      setRows(Array.isArray(d) ? d : d.rows || []);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => { setLoading(true); load(); }, [entityKey]);

  function create() {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    postJSON(`/api/${entityKey}`, { [cfg.titleCol]: name, owner_id: 1 })
      .then(() => { setNewName(''); load(); })
      .catch((e) => setError(e.message))
      .finally(() => setCreating(false));
  }

  // Optimistic inline update -> patch; revert on failure
  function onFieldChange(fieldKey, row, value) {
    const prev = rows;
    const next = rows.map((r) => (r.id === row.id ? { ...r, [fieldKey]: value, _opt: true } : r));
    setRows(next);
    patchJSON(`/api/${entityKey}/${row.id}`, { [fieldKey]: value, version: row.version })
      .then((res) => {
        const updated = res.record;
        setRows((r) => r.map((x) => (x.id === row.id ? { ...x, ...updated } : x)));
      })
      .catch((e) => {
        setRows(prev);
        window.alert(`Could not save: ${e.message}`);
      });
  }

  const selRow = selectedId ? rows.find((r) => r.id === selectedId) : null;

  return (
    <div className="entity-page" data-density={density}>
      <div className="entity-toolbar">
        <div className="entity-head">
          <h1 className="list-title">{cfg.label}</h1>
          <button className="btn btn-primary" onClick={create} disabled={creating}>
            + Add {cfg.singular}
          </button>
        </div>

        <div className="toolbar-row">
          <input
            className="toolbar-search"
            placeholder={`Search ${cfg.label.toLowerCase()}…`}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
            aria-label={`Search ${cfg.label}`}
          />
          {(cfg.columns.some((c) => c.type === 'status')) && (
            <select
              className="toolbar-filter"
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); }}
              aria-label="Filter by status"
            >
              <option value="">All</option>
              {cfg.columns.find((c) => c.type === 'status').pipeline.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          )}
          <select
            className="toolbar-filter"
            value={density}
            onChange={(e) => setDensity(e.target.value)}
            aria-label="Row density"
          >
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="comfortable">Comfortable</option>
          </select>
        </div>

        {error && <p className="board-error">{error}</p>}
      </div>

      <div className="entity-table-wrap">
        <table className="entity-table">
          <thead>
            <tr>
              {cfg.columns.map((c) => (
                <th key={c.key} style={c.width ? { width: c.width } : { minWidth: c.min || 160 }}>
                  {c.label}
                </th>
              ))}
              <th className="th-actions" style={{ width: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && (
              <tr><td colSpan={cfg.columns.length + 1} className="grid-empty">Loading…</td></tr>
            )}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={cfg.columns.length + 1} className="grid-empty">
                No {cfg.label.toLowerCase()} yet.
              </td></tr>
            )}
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`entity-row ${selectedId === row.id ? 'selected' : ''}`}
                onClick={() => onOpenRecord(entityKey, row.id)}
              >
                {cfg.columns.map((c) => (
                  <td
                    key={c.key}
                    onClick={(e) => e.stopPropagation()}
                    className={c.key === cfg.titleCol ? 'cell-title' : ''}
                  >
                    <AutosaveCell
                      field={c}
                      row={row}
                      users={users}
                      isTitle={c.key === cfg.titleCol && row.title !== undefined}
                      onCommit={(v) => onFieldChange(c.key, row, v)}
                      showProjectName={c.type === 'ref' && c.refEntity === 'projects'}
                    />
                  </td>
                ))}
                <td className="th-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="row-delete"
                    title="Delete"
                    aria-label={`Delete ${row.name || row.id}`}
                    onClick={() => {
                      if (window.confirm(`Delete ${cfg.singular} "${row.name || row.title}"?`)) {
                        delJSON(`/api/${entityKey}/${row.id}`).then(load).catch((e) => window.alert(e.message));
                      }
                    }}
                  >🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <form
          className="quick-add-row"
          onSubmit={(e) => { e.preventDefault(); create(); }}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            placeholder={`+ Add ${cfg.singular}…`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label={`New ${cfg.singular} name`}
          />
        </form>
      </div>

      {selRow && (
        <RecordPanel
          entityKey={entityKey}
          cfg={cfg}
          record={selRow}
          users={users}
          onClose={onCloseRecord}
          onUpdated={(updated) => {
            setRows((r) => r.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
          }}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- *
 * Inline editable cell. Which control depends on the column type.
 * ---------------------------------------------------------------- */
function AutosaveCell({ field, row, users, onCommit }) {
  const display = displayFor(field, row, users);
  const [editing, setEditing] = React.useState(false);

  if (field.type === 'status' || field.type === 'priority') {
    const val = row[field.key] || field.pipeline[0];
    const tone = field.type === 'status' ? STATUS_TONE[val] || 'neutral' : toneForPriority(val);
    const icon = field.type === 'status' ? STATUS_ICON[val] || '○' : iconForPriority(val);
    return (
      <select
        className="status-pill"
        value={val}
        onChange={(e) => onCommit(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        aria-label={`${field.label}: ${val}`}
        style={{ ['--pill']: `var(--pill-${tone})` }}
      >
        {field.pipeline.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
    );
  }

  if (field.type === 'user') {
    return (
      <select
        className="cell-select"
        value={row[field.key] || ''}
        onChange={(e) => onCommit(e.target.value === '' ? null : Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">—</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }

  if (field.type === 'date') {
    return (
      <input
        type="date"
        className="cell-date"
        value={row[field.key] ? String(row[field.key]).slice(0, 10) : ''}
        onChange={(e) => onCommit(e.target.value || null)}
        onClick={(e) => e.stopPropagation()}
        aria-label={field.label}
      />
    );
  }

  if (field.type === 'currency') {
    return (
      <input
        type="text"
        className="cell-text cur"
        defaultValue={fmtCurrency(row[field.key])}
        onBlur={(e) => {
          const n = Number(String(e.target.value).replace(/[^0-9.]/g, ''));
          if (Number.isFinite(n)) onCommit(n);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={field.label}
      />
    );
  }

  if (field.type === 'percent') {
    return (
      <input
        type="number"
        className="cell-text"
        defaultValue={row[field.key] ?? ''}
        onBlur={(e) => onCommit(e.target.value === '' ? null : Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        aria-label={field.label}
      />
    );
  }

  if (field.type === 'ref') {
    return (
      <span className="cell-readonly" onClick={(e) => e.stopPropagation()}>
        {display}
      </span>
    );
  }

  // text: inline edit on click
  if (editing) {
    return (
      <input
        autoFocus
        className="cell-text-title"
        defaultValue={display}
        onBlur={(e) => { setEditing(false); const v = e.target.value.trim(); if (v !== display) onCommit(v); }}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') setEditing(false); }}
        onClick={(e) => e.stopPropagation()}
      />
    );
  }
  return (
    <span className="cell-clickable" onClick={(e) => { e.stopPropagation(); setEditing(true); }}>
      {display || <em className="empty">—</em>}
    </span>
  );
}

function toneForPriority(p) {
  return { low: 'neutral', normal: 'neutral', high: 'warning', urgent: 'error' }[p] || 'neutral';
}
function iconForPriority(p) {
  return { low: '↓', normal: '—', high: '↑', urgent: '‼' }[p] || '—';
}

function displayFor(field, row, users) {
  const raw = row[field.key];
  const displayCol = field.key.replace(/_id$/, '_name');
  if (field.type === 'user') return userName(users, raw);
  if (field.type === 'ref') return row[displayCol] || '';
  if (field.type === 'currency') return fmtCurrency(raw);
  if (field.type === 'percent') return fmtPercent(raw);
  if (field.type === 'date') return raw ? String(raw).slice(0, 10) : '';
  return raw ?? '';
}