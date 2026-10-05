import React from 'react';

const TYPE_LABELS = {
  text: 'Text',
  number: 'Number',
  date: 'Date',
  status: 'Status',
  person: 'Person',
};

/** A single header cell for a column (or the leading "Item" / add-column cell). */
export default function ColumnHeader({ column, onDelete }) {
  if (column === null) {
    // leading empty header spacer for the title column
    return <div className="th th-item">Item</div>;
  }
  return (
    <div className="th">
      <span className="th-title">{column.title || 'Untitled'}</span>
      <span className="th-type">{TYPE_LABELS[column.col_type] || column.col_type}</span>
      {onDelete && (
        <button
          className="th-delete"
          title={`Delete ${column.title}`}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(column);
          }}
        >
          ×
        </button>
      )}
    </div>
  );
}