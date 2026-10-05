import React from 'react';
import { getJSON, postJSON, delJSON } from '../api.js';

/** Home view: list boards, create one, open one, delete one. */
export default function BoardList({ onOpen, onCreated }) {
  const [boards, setBoards] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getJSON('/boards')
      .then((data) => setBoards(Array.isArray(data) ? data : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(load, []);

  function create() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    postJSON('/boards', { name: trimmed })
      .then((b) => {
        setName('');
        onCreated && onCreated(b);
        load();
      })
      .catch((e) => setError(e.message))
      .finally(() => setBusy(false));
  }

  function remove(board) {
    if (!window.confirm(`Delete board "${board.name}"? This cannot be undone.`)) return;
    delJSON(`/boards/${board.id}`)
      .then(load)
      .catch((e) => setError(e.message));
  }

  if (loading && boards.length === 0) return <div className="board-empty">Loading boards…</div>;

  return (
    <div className="board-list-view">
      <div className="list-toolbar">
        <h1 className="list-title">My Boards</h1>
      </div>

      <div className="create-card">
        <input
          type="text"
          placeholder="New board name…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') create(); }}
        />
        <button className="btn btn-primary" onClick={create} disabled={busy}>+ New board</button>
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="board-grid list-grid">
        {boards.length === 0 && !loading && (
          <div className="grid-empty">No boards yet. Create your first board above.</div>
        )}
        {boards.map((b) => (
          <div className="board-card" key={b.id} onClick={() => onOpen(b.id)} title={`Open ${b.name}`}>
            <div className="board-card-main">
              <span className="board-card-icon">📋</span>
              <span className="board-card-name">{b.name}</span>
            </div>
            <button
              className="board-card-delete"
              aria-label={`Delete ${b.name}`}
              onClick={(e) => {
                e.stopPropagation();
                remove(b);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}