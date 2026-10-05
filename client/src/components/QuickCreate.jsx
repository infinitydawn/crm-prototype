import React from 'react';
import { postJSON } from '../api.js';
import { ENTITIES, STAGE_PIPELINE, STATUS_PIPELINE, PRIORITY_PIPELINE } from '../spec.js';

/**
 * Compact quick-create modal (spec: max 6 fields, required first, Cmd+Enter submit).
 * Creates the record, then offers to view it.
 */
export default function QuickCreate({ entityKey, users, onClose, onCreated, onCreate }) {
  const cfg = ENTITIES[entityKey];
  const [form, setForm] = React.useState({ name: '', owner: '' });
  const [error, setError] = React.useState(null);
  const [created, setCreated] = React.useState(null);
  const [busy, setBusy] = React.useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function submit() {
    const name = (form.name || '').trim();
    if (!name) { setError('Add a name to create this ' + cfg.singular + '.'); return; }
    setBusy(true); setError(null);
    const payload = { [cfg.titleCol]: name };
    if (form.owner) payload.owner_id = Number(form.owner);
    // sensible defaults per entity
    if (entityKey === 'opportunities') { payload.stage = 'new'; }
    if (entityKey === 'leads') { payload.status = 'new'; }
    if (entityKey === 'tasks') { payload.status = 'not_started'; }

    postJSON(`/api/${entityKey}`, payload)
      .then((rec) => {
        setCreated(rec);
        setBusy(false);
        if (onCreated) onCreated(rec, entityKey);
      })
      .catch((e) => { setError(e.message); setBusy(false); });
  }

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-card quick-create" role="dialog" aria-label={`Create ${cfg.singular}`}>
        <div className="modal-head">
          <h3>Create {cfg.singular}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {created ? (
          <div className="created-done">
            <p>Created {cfg.singular.toLowerCase()} “{created[cfg.titleCol]}”.</p>
            <div className="form-actions">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <div className="form">
            <label className="field">
              <span>{cfg.createLabel} name *</span>
              <input
                autoFocus
                className="panel-input"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) submit(); }}
              />
            </label>
            <label className="field">
              <span>Owner</span>
              <select className="panel-select" value={form.owner} onChange={(e) => set('owner', e.target.value)}>
                <option value="">—</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
            {entityKey === 'opportunities' && (
              <label className="field">
                <span>Stage</span>
                <select className="panel-select" value={form.stage || 'new'} onChange={(e) => set('stage', e.target.value)}>
                  {STAGE_PIPELINE.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
            )}
            <div className="field-note">Cmd/Enter to submit</div>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button className="btn btn-primary" onClick={submit} disabled={busy}>
                {busy ? 'Creating…' : `Create ${cfg.singular}`}
              </button>
              <button className="btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}