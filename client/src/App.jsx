import React from 'react';
import BoardList from './components/BoardList.jsx';
import BoardView from './components/BoardView.jsx';

/** Top-level app: swaps between the board list and a single board view. No router. */
export default function App() {
  const [activeBoardId, setActiveBoardId] = React.useState(null);

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <span className="brand-mark">◆</span> Boardly CRM
        </div>
        {activeBoardId && (
          <button className="btn btn-ghost back-link" onClick={() => setActiveBoardId(null)}>
            ← All boards
          </button>
        )}
      </header>
      <main className="app-main">
        {activeBoardId === null ? (
          <BoardList onOpen={(id) => setActiveBoardId(id)} />
        ) : (
          <BoardView boardId={activeBoardId} onBack={() => setActiveBoardId(null)} />
        )}
      </main>
    </div>
  );
}