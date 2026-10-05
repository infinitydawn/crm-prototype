import React from 'react';
import { getJSON, patchJSON, postJSON } from '../api.js';
import { STATUS_TONE, STATUS_ICON, userName, fmtCurrency, fmtPercent, ACT_TYPES } from '../spec.js';

/** Right-side record detail panel. Keeps parent list visible. Esc closes. */
export default function RecordPanel({ entityKey, cfg, record, users, onClose, onUpdated }) {
  const [tab, setTab] = React.useState('overview');
  const [activities, setActivities] = React.useState([]);
  const [comments, setComments] = React.useState([]);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // field editor mapping
  function Field({ k }) {
    const f = cfg.columns.find((c) => c.key === k) || { key: k, label: k, type: 'text' };
    const value = record[k];
    return (
      <label className="panel-field">
        <span className="field-label">{fieldLabel(f, cfg)}</span>
        <FieldInput f={f} k={k} value={value} onSave={(v) => saveField(k, v)} users={users} />
      </label>
    );
  }

  function saveField(k, v) {
    setSaving(true);
    patchJSON(`/api/${entityKey}/${record.id}`, { [k]: v, version: record.version })
      .then((res) => onUpdated(res.record))
      .catch((e) => window.alert(`Could not save: ${e.message}`))
      .finally(() => setSaving(false));
  }

  function loadActivities() {
    getJSON(`/api/${entityKey}/${record.id}/activities`).then(setActivities).catch(() => {});
    getJSON(`/api/${entityKey}/${record.id}/comments`).then(setComments).catch(() => {});
  }
  React.useEffect(() => { loadActivities(); }, [record.id, entityKey]);

  function addActivity(act_type, subject, body) {
    postJSON(`/api/${entityKey}/${record.id}/activities`, { act_type, subject, body, owner_id: 1 })
      .then(loadActivities).catch((e) => window.alert(e.message));
  }

  const title = record[cfg.titleCol] || record.title || 'Untitled';

  return (
    <div className="record-panel" role="dialog" aria-label={title} aria-modal="false">
      <div className="panel-head">
        <div>
          <div className="panel-breadcrumb">{entityKey} / {record.id}</div>
          <h2 className="panel-title">
            <input
              className="panel-title-input"
              defaultValue={title}
              onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== title) saveField(cfg.titleCol, v); }}
              aria-label={`${cfg.singular} title`}
            />
          </h2>
        </div>
        <button className="panel-close" onClick={onClose} aria-label="Close panel">✕</button>
      </div>

      <div className="panel-tabs" role="tablist">
        {['overview', 'activity', 'related', 'more'].map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`panel-tab ${tab === t ? 'active' : ''}`}
            onClick={() => setTab(t)}
          >{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
        {saving && <span className="saving-state">Saving…</span>}
      </div>

      <div className="panel-body">
        {tab === 'overview' && (
          <div className="panel-overview">
            {cfg.panelFields.map((k) => <Field key={k} k={k} />)}
            {record.description !== undefined && (
              <label className="panel-field">
                <span className="field-label">Description</span>
                <textarea
                  className="panel-textarea"
                  defaultValue={record.description || ''}
                  onBlur={(e) => { const v = e.target.value; if (v !== (record.description || '')) saveField('description', v || null); }}
                />
              </label>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="panel-activity">
            <ActivityComposer onLog={addActivity} />
            <div className="activity-list">
              {activities.length === 0 && <p className="empty-note">No activity yet.</p>}
              {activities.map((a) => (
                <div className="activity-item" key={a.id}>
                  <div className="activity-meta">
                    <span className={`act-badge act-${a.act_type}`}>{a.act_type}</span>
                    <span className="activity-owner">{a.owner_name || '—'}</span>
                    <span className="act-time">{new Date(a.happened_at).toLocaleString()}</span>
                  </div>
                  {a.subject && <div className="activity-subject">{a.subject}</div>}
                  {a.body && <div className="activity-body">{a.body}</div>}
                </div>
              ))}
            </div>

            <div className="comment-section">
              <CommentComposer onSubmit={(body) => {
                postJSON(`/api/${entityKey}/${record.id}/comments`, { body, author_id: 1 })
                  .then(loadActivities).catch((e) => window.alert(e.message));
              }} />
              {comments.map((c) => (
                <div className="comment-item" key={c.id}>
                  <div className="activity-meta">
                    <span className="comment-author">{c.author_name || '—'}</span>
                    <span className="act-time">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="comment-body">{c.body}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'related' && <div className="panel-empty">Related records appear here (contacts, tasks, activities).</div>}
        {tab === 'more' && (
          <div className="panel-more">
            <div className="meta-line">Created: {record.created_at ? new Date(record.created_at).toLocaleString() : '—'}</div>
            <div className="meta-line">Version: {record.version}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function fieldLabel(f, cfg) {
  if (f.label) return f.label;
  return f.key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

function FieldInput({ f, k, value, onSave, users }) {
  if (f.type === 'status' || f.type === 'priority') {
    const pipeline = f.pipeline || (f.type === 'priority' ? ['low', 'normal', 'high', 'urgent'] : []);
    return (
      <select className="panel-select" value={value || ''} onChange={(e) => onSave(e.target.value)}>
        {pipeline.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
      </select>
    );
  }
  if (f.type === 'user') {
    return (
      <select className="panel-select" value={value || ''} onChange={(e) => onSave(e.target.value === '' ? null : Number(e.target.value))}>
        <option value="">—</option>
        {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
    );
  }
  if (f.type === 'date') {
    return <input type="date" className="panel-input" value={value ? String(value).slice(0, 10) : ''} onChange={(e) => onSave(e.target.value || null)} />;
  }
  if (f.type === 'currency') {
    return <input type="number" step="0.01" className="panel-input" defaultValue={value ?? ''} onBlur={(e) => onSave(e.target.value === '' ? null : Number(e.target.value))} />;
  }
  if (f.type === 'percent') {
    return <input type="number" className="panel-input" defaultValue={value ?? ''} onBlur={(e) => onSave(e.target.value === '' ? null : Number(e.target.value))} />;
  }
  if (f.type === 'ref') {
    return <div className="panel-ref">{recordRefDisplay(k, value)}</div>;
  }
  return <input type="text" className="panel-input" defaultValue={value ?? ''} onBlur={(e) => onSave(e.target.value === '' ? null : e.target.value)} />;
}

function recordRefDisplay(k, value) {
  return value || '—';
}

function ActivityComposer({ onLog }) {
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState('call');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  if (!open) {
    return (
      <button className="btn btn-ghost add-activity-btn" onClick={() => setOpen(true)}>+ Log activity</button>
    );
  }
  return (
    <div className="activity-composer">
      <select value={type} onChange={(e) => setType(e.target.value)} className="panel-select">
        {ACT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input className="panel-input" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
      <textarea className="panel-textarea" placeholder="Notes (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
      <div className="composer-actions">
        <button
          className="btn btn-primary"
          onClick={() => { if (subject || body) { onLog(type, subject, body); setOpen(false); setSubject(''); setBody(''); } }}
        >Log {type}</button>
        <button className="btn" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

function CommentComposer({ onSubmit }) {
  const [v, setV] = React.useState('');
  return (
    <div className="comment-composer">
      <textarea
        className="panel-textarea"
        placeholder="Write a comment…"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            if (v.trim()) { onSubmit(v.trim()); setV(''); }
          }
        }}
      />
      <div className="composer-actions">
        <button
          className="btn btn-primary"
          disabled={!v.trim()}
          onClick={() => { if (v.trim()) { onSubmit(v.trim()); setV(''); } }}
        >Add comment <kbd>⌘⏎</kbd></button>
      </div>
    </div>
  );
}