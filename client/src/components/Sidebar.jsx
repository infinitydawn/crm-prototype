import React from 'react';
import { NAV, ENTITIES } from '../spec.js';

/** Primary navigation sidebar. */
export default function Sidebar({ view, onNavigate }) {
  const activeEntity = view.type === 'entity' ? view.entity : null;

  return (
    <nav className="sidebar" aria-label="Primary">
      <ul className="nav-list">
        {NAV.map((item) =>
          item.children ? (
            <li key={item.key} className="nav-group">
              <div className="nav-group-title">{item.section}</div>
              <ul>
                {item.children.map((c) => {
                  const e = ENTITIES[c.entity];
                  return (
                    <li key={c.entity}>
                      <button
                        className={`nav-item ${activeEntity === c.entity ? 'active' : ''}`}
                        onClick={() => onNavigate(c.entity)}
                        aria-current={activeEntity === c.entity ? 'page' : undefined}
                      >
                        <span className="nav-icon">{e ? e.icon : '•'}</span>
                        {c.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </li>
          ) : (
            <li key={item.key}>
              <button
                className="nav-item"
                onClick={() => onNavigate(item.key === 'dashboards' ? 'dashboards' : item.key)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.section}
              </button>
            </li>
          )
        )}
        <li>
          <button
            className={`nav-item ${view.type === 'boards' ? 'active' : ''}`}
            onClick={() => onNavigate('boards')}
            aria-current={view.type === 'boards' ? 'page' : undefined}
          >
            <span className="nav-icon">▤</span>
            Boards
          </button>
        </li>
      </ul>
    </nav>
  );
}