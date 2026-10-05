import React from 'react';

const DEFAULT_STATUS_LABELS = ['Done', 'In progress', 'Stuck'];

/**
 * Inline editor for a single cell.
 *
 * Props:
 *  - value      : string (the current cell value; source of truth from parent)
 *  - column     : { id, title, col_type, options }
 *  - onLocalChange(newValue): called on every edit (parent updates local state optimistically, no network)
 *  - onCommit(newValue)     : called when the edit should be persisted (Enter/blur/change/select)
 *
 * Controlled inputs: the parent owns `value`, so reverts on error render correctly.
 */
export default function CellEditor({ value, column, onLocalChange, onCommit }) {
  const type = column ? column.col_type : 'text';
  const options = (column && column.options) || {};
  const labels =
    (Array.isArray(options.labels) && options.labels.length) ? options.labels : DEFAULT_STATUS_LABELS;

  if (type === 'status') {
    const current = value || '';
    return (
      <div className="cell-editor" onClick={(e) => e.stopPropagation()}>
        <select
          className="cell-status"
          value={labels.includes(current) ? current : ''}
          onChange={(e) => onCommit(e.target.value)}
        >
          <option value="">—</option>
          {labels.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'date') {
    return (
      <div className="cell-editor" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          className="cell-date"
          value={value || ''}
          onChange={(e) => onCommit(e.target.value)}
        />
      </div>
    );
  }

  // text / number / person — freeform inline input, commit on Enter or blur
  return (
    <div className="cell-editor" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        className="cell-text"
        value={value || ''}
        onChange={(e) => onLocalChange(e.target.value)}
        onBlur={(e) => onCommit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        placeholder=""
      />
    </div>
  );
}