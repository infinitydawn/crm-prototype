import React from 'react';
import { ENTITIES } from '../spec.js';

/** Top bar: brand, global search/command trigger, Create menu, user menu. */
export default function TopBar({ onOpenPalette, onQuickCreate, users }) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const createItems = ['task', 'project', 'contact', 'account', 'opportunity'];

  // Cmd/Ctrl+K opens the command palette
  React.useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenPalette();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onOpenPalette]);

  return (
    <header className="topbar">
      <div className="app-brand">
        <span className="brand-mark">◆</span> Nimbus
      </div>

      <button
        className="global-search"
        onClick={onOpenPalette}
        aria-label="Search or run a command"
      >
        <span className="search-icon">⌕</span>
        <span className="search-placeholder">Search or run a command…</span>
        <kbd>⌘K</kbd>
      </button>

      <div className="topbar-right">
        <button
          className="btn btn-primary create-btn"
          onClick={() => setCreateOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={createOpen}
        >
          + Create
        </button>
        {createOpen && (
          <div className="menu" role="menu">
            {createItems.map((k) => (
              <button
                key={k}
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  setCreateOpen(false);
                  onQuickCreate(ENTITIES[k] ? k : 'task');
                }}
              >
                {ENTITIES[k].createLabel}
              </button>
            ))}
          </div>
        )}
        <span className="user-chip" title="Maya Chen">M</span>
      </div>
    </header>
  );
}