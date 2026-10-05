import React from 'react';
import { getJSON } from './api.js';
import { NAV, ENTITIES } from './spec.js';
import EntityList from './components/EntityList.jsx';
import Sidebar from './components/Sidebar.jsx';
import TopBar from './components/TopBar.jsx';
import CommandPalette from './components/CommandPalette.jsx';
import QuickCreate from './components/QuickCreate.jsx';
import BoardList from './components/BoardList.jsx';
import BoardView from './components/BoardView.jsx';

/** Top-level app shell: top bar + sidebar + view-state routing. */
export default function App() {
  const [view, setView] = React.useState({ type: 'entity', entity: 'tasks' });
  const [users, setUsers] = React.useState([]);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [quickCreate, setQuickCreate] = React.useState(null); // entity key or null

  React.useEffect(() => {
    getJSON('/users').then(setUsers).catch(() => {});
  }, []);

  function openEntity(entity) {
    setView({ type: 'entity', entity, selectedId: undefined });
  }

  function openRecord(entity, id) {
    setView((v) => ({
      ...v,
      type: 'entity',
      entity: v.type === 'entity' ? v.entity : entity,
      selectedId: id,
    }));
  }

  return (
    <div className="app">
      <TopBar
        onOpenPalette={() => setPaletteOpen(true)}
        onQuickCreate={(entity) => setQuickCreate(entity)}
        users={users}
      />
      <div className="app-body">
        <Sidebar view={view} onNavigate={openEntity} />
        <main className="app-main" id="main">
          {view.type === 'boards' ? (
            view.selectedBoardId ? (
              <BoardView
                boardId={view.selectedBoardId}
                onBack={() => setView({ type: 'boards' })}
              />
            ) : (
              <BoardList onOpen={(id) => setView({ type: 'boards', selectedBoardId: id })} />
            )
          ) : (
            <EntityList
              entityKey={view.entity}
              users={users}
              selectedId={view.selectedId}
              onOpenRecord={openRecord}
              onCloseRecord={() => setView((v) => ({ ...v, selectedId: undefined }))}
            />
          )}
        </main>
      </div>

      {paletteOpen && (
        <CommandPalette
          users={users}
          onClose={() => setPaletteOpen(false)}
          onOpenEntity={openEntity}
          onOpenRecord={openRecord}
          onQuickCreate={(entity) => { setPaletteOpen(false); setQuickCreate(entity); }}
        />
      )}
      {quickCreate && (
        <QuickCreate
          entityKey={quickCreate}
          users={users}
          onClose={() => setQuickCreate(null)}
          onCreate={() => { setQuickCreate(null); }}
        />
      )}
    </div>
  );
}