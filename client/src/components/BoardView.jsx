import React from 'react';
import { getJSON, postJSON, delJSON, putJSON } from '../api.js';
import ColumnHeader from './ColumnHeader.jsx';
import ItemRow from './ItemRow.jsx';
import Modal from './Modal.jsx';

const STATUS_TYPES = ['text', 'number', 'date', 'status', 'person'];

export default function BoardView({ boardId, onBack }) {
  const [board, setBoard] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const [showAddColumn, setShowAddColumn] = React.useState(false);
  const [newItemTitle, setNewItemTitle] = React.useState('');
  const [addingItem, setAddingItem] = React.useState(false);

  function load() {
    setLoading(true);
    setError(null);
    getJSON(`/boards/${boardId}`)
      .then(setBoard)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  React.useEffect(load, [boardId]);

  // Append column (header affordance) -> modal -> POST
  function createColumn(columnData) {
    return postJSON(`/boards/${boardId}/columns`, columnData).then(() => {
      setShowAddColumn(false);
      load();
    });
  }

  function deleteColumn(col) {
    if (!window.confirm(`Delete column "${col.title}" and its values?`)) return;
    delJSON(`/columns/${col.id}`)
      .then(load)
      .catch((e) => window.alert(`Could not delete column: ${e.message}`));
  }

  function addItem() {
    const title = newItemTitle.trim();
    if (!title) return;
    setAddingItem(true);
    postJSON(`/boards/${boardId}/items`, { title })
      .then(() => {
        setNewItemTitle('');
        load();
      })
      .catch((e) => window.alert(`Could not add row: ${e.message}`))
      .finally(() => setAddingItem(false));
  }

  function deleteItem(itemId) {
    delJSON(`/items/${itemId}`)
      .then(load)
      .catch((e) => window.alert(`Could not delete item: ${e.message}`));
  }

  // Move a value change up the state tree: onUpdateItemValue(itemId, colId, newValue)
  // persists via PUT and reverts + alerts on error.
  function onItemValueSaved(itemId, colId, newValue) {
    // Local optimistic update already visible in ItemRow; no board-level cache to
    // update here. Persistence is done by ItemRow's PUT; the server returns full
    // values but not a nested board, so we rely on UI state. Nothing further needed.
    void itemId; void colId; void newValue;
  }

  function onTitleChanged(itemId, newTitle) {
    if (!board) return;
    const next = { ...board, items: board.items.map((it) => (it.id === itemId ? { ...it, title: newTitle } : it)) };
    setBoard(next);
  }

  if (loading) return <div className="board-empty">Loading board…</div>;
  if (error) {
    return (
      <div className="board-empty">
        <p className="board-error">{error}</p>
        <button className="btn btn-primary" onClick={load}>Retry</button>
        <button className="btn" onClick={onBack}>← Back to boards</button>
      </div>
    );
  }
  if (!board) return null;

  const columns = board.columns || [];
  const items = board.items || [];
  const gridCols = [`minmax(200px, 260px)`, ...columns.map(() => 'minmax(140px, 1fr)'), '56px'].join(' ');

  return (
    <div className="board-view">
      <div className="board-toolbar">
        <button className="btn btn-ghost" onClick={onBack}>← Boards</button>
        <h1 className="board-title">{board.name || 'Untitled board'}</h1>
        <div className="board-add-row">
          <input
            type="text"
            placeholder="New row title…"
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
          />
          <button className="btn btn-primary" onClick={addItem} disabled={addingItem}>+ Add row</button>
        </div>
      </div>

      <div className="board-grid-wrap">
        <div className="grid-header" style={{ gridTemplateColumns: gridCols }}>
          <ColumnHeader column={null} />
          {columns.map((col) => (
            <ColumnHeader key={col.id} column={col} onDelete={deleteColumn} />
          ))}
          <div className="th th-add">
            <button className="btn-add-col" onClick={() => setShowAddColumn(true)}>+ Add column</button>
          </div>
        </div>

        <div className="grid-body" style={{ gridTemplateColumns: gridCols }}>
          {items.length === 0 && (
            <div className="grid-empty">No rows yet. Add one with "+ Add row".</div>
          )}
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              columns={columns}
              onValueSaved={onItemValueSaved}
              onTitleChanged={onTitleChanged}
              onDelete={deleteItem}
            />
          ))}
        </div>
      </div>

      {showAddColumn && (
        <Modal title="Add column" onClose={() => setShowAddColumn(false)}>
          <AddColumnForm onSubmit={createColumn} onCancel={() => setShowAddColumn(false)} />
        </Modal>
      )}
    </div>
  );
}

function AddColumnForm({ onSubmit, onCancel }) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState('text');
  const [labels, setLabels] = React.useState('Done, In progress, Stuck');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  function submit() {
    if (!title.trim()) { setErr('Column needs a title.'); return; }
    const options = {};
    if (type === 'status') {
      const parsed = labels.split(',').map((s) => s.trim()).filter(Boolean);
      options.labels = parsed.length ? parsed : ['Done', 'In progress', 'Stuck'];
    }
    setBusy(true);
    setErr(null);
    onSubmit({ title: title.trim(), col_type: type, options })
      .then(() => {})
      .catch((e) => setErr(e.message))
      .finally(() => setBusy(false));
  }

  return (
    <div className="form">
      <label className="field">
        <span>Title</span>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span>Type</span>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {STATUS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </label>
      {type === 'status' && (
        <label className="field">
          <span>Labels (comma-separated)</span>
          <input type="text" value={labels} onChange={(e) => setLabels(e.target.value)} />
        </label>
      )}
      {err && <p className="form-error">{err}</p>}
      <div className="form-actions">
        <button className="btn btn-primary" onClick={submit} disabled={busy}>Create column</button>
        <button className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}