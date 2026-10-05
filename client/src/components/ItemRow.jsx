import React from 'react';
import { putJSON, patchJSON } from '../api.js';
import CellEditor from './CellEditor.jsx';

/**
 * Renders one row's cells into the board body CSS grid (returns a fragment of
 * <div> cells, NOT its own grid container — alignment relies on the parent grid).
 *
 * Props:
 *  - item        : { id, title, values }
 *  - columns     : column list
 *  - onValueSaved(itemId, colId, newValue): called after successful PUT (parent refreshes cache)
 *  - onTitleChanged(itemId, newTitle)
 *  - onDelete(itemId)
 */
export default function ItemRow({ item, columns, onValueSaved, onTitleChanged, onDelete }) {
  const colKey = (id) => String(id);

  // Optimistic local value management: keep a working copy of the cell values
  // so edits feel instant and revert cleanly on failure.
  const [values, setValues] = React.useState({ ...(item.values || {}) });

  function setLocal(colId, v) {
    const next = { ...values, [colKey(colId)]: v };
    setValues(next);
    return next;
  }

  function onLocalChange(colId, v) {
    setLocal(colId, v);
  }

  function onCommit(colId, v) {
    const prev = values[colKey(colId)];
    setLocal(colId, v);
    putJSON(`/items/${item.id}/values`, { [colKey(colId)]: v })
      .then(() => onValueSaved && onValueSaved(item.id, colKey(colId), v, prev))
      .catch((err) => {
        setValues({ ...values, [colKey(colId)]: prev });
        window.alert(`Could not save value: ${err.message || 'unknown error'}`);
      });
  }

  // Optimistic local title management (persist on blur/Enter).
    const [title, setTitle] = React.useState(item.title || '');
    const [titleDirty, setTitleDirty] = React.useState(false);

    function onTitleChange(v) {
      setTitle(v);
      setTitleDirty(v !== (item.title || ''));
    }

    function onTitleCommit() {
      const newTitle = title;
      if (!titleDirty) return;
      const prev = item.title;
      onTitleChanged(item.id, newTitle); // optimistic parent update
      patchJSON(`/items/${item.id}`, { title: newTitle })
        .then(() => setTitleDirty(false))
        .catch((err) => {
          setTitle(item.title || '');
          setTitleDirty(false);
          if (onTitleChanged) onTitleChanged(item.id, prev);
          window.alert(`Could not rename item: ${err.message || 'unknown error'}`);
        });
    }

    return (
      <React.Fragment>
        {/* Title cell — inline editable */}
        <div className="cell title-cell" onClick={(e) => e.stopPropagation()}>
          <input
            className="cell-title-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            onBlur={onTitleCommit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
            }}
          />
        </div>

      {/* One cell per column */}
      {columns.map((col) => (
        <div className="cell" key={col.id}>
          <CellEditor
            value={values[colKey(col.id)]}
            column={col}
            onLocalChange={(v) => onLocalChange(col.id, v)}
            onCommit={(v) => onCommit(col.id, v)}
          />
        </div>
      ))}

      {/* Row actions */}
      <div className="cell cell-actions">
        <button
          className="row-delete"
          title="Delete item"
          onClick={() => {
            if (window.confirm(`Delete "${item.title}"?`)) onDelete(item.id);
          }}
        >
          🗑
        </button>
      </div>
    </React.Fragment>
  );
}