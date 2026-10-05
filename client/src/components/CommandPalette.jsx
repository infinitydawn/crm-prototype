import React from 'react';
import { getJSON } from '../api.js';
import { ENTITIES } from '../spec.js';

/** Cmd/Ctrl+K global command/search surface. */
export default function CommandPalette({ users, onClose, onOpenEntity, onOpenRecord, onQuickCreate }) {
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState({});

  React.useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // debounce search across entities
  React.useEffect(() => {
    if (!query.trim()) { setResults({}); return; }
    const t = setTimeout(() => searchAll(query.trim()), 150);
    return () => clearTimeout(t);
  }, [query]);

  async function searchAll(q) {
    const out = {};
    await Promise.all(
      Object.keys(ENTITIES).map(async (key) => {
        try {
          const d = await getJSON(`/api/${key}?q=${encodeURIComponent(q)}&limit=5`);
          out[key] = (d.rows || d).slice(0, 5);
        } catch { out[key] = []; }
      })
    );
    setResults(out);
  }

  function selectRecord(entity, id) {
    onOpenRecord(entity, id);
    onClose();
  }

  return (
    <div className="palette-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="palette" role="dialog" aria-label="Search or run a command">
        <div className="palette-input-row">
          <span className="search-icon">⌕</span>
          <input
            autoFocus
            className="palette-input"
            placeholder="Search or run a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
          <kbd>esc</kbd>
        </div>

        {!query.trim() && (
          <div className="palette-section">
            <div className="palette-label">Quick actions</div>
            {Object.keys(ENTITIES).map((k) => (
              <button key={k} className="palette-item" onClick={() => onQuickCreate(k)}>
                <span className="nav-icon">{ENTITIES[k].icon}</span>
                Create {ENTITIES[k].createLabel.toLowerCase()}
              </button>
            ))}
          </div>
        )}

        {query.trim() && (
          <div className="palette-results">
            {Object.entries(results).filter(([, v]) => v && v.length).map(([key, rows]) => (
              <div className="palette-section" key={key}>
                <div className="palette-label">{ENTITIES[key].label}</div>
                {rows.map((r) => (
                  <button key={r.id} className="palette-item" onClick={() => selectRecord(key, r.id)}>
                    <span className="nav-icon">{ENTITIES[key].icon}</span>
                    {r[ENTITIES[key].titleCol]}
                  </button>
                ))}
              </div>
            ))}
            {Object.keys(results).length > 0 && Object.values(results).every((v) => !v.length) && (
              <div className="palette-empty">No results for “{query}”.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}