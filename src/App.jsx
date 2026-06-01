import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import CorkBoard from './components/CorkBoard.jsx';
import SyncIndicator from './components/SyncIndicator.jsx';
import ExportImport from './components/ExportImport.jsx';
import { useBoards } from './hooks/useBoards.js';
import { useReducedMotion } from './hooks/useReducedMotion.js';

export default function App() {
  const {
    state,
    activeBoardId,
    activeBoard,
    syncStatus,
    addBoard,
    renameBoard,
    deleteBoard,
    setActiveBoardId,
    addNote,
    updateNote,
    deleteNote,
    replaceState
  } = useBoards();

  const reducedMotion = useReducedMotion();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close mobile nav on board switch
  useEffect(() => {
    setMobileNavOpen(false);
  }, [activeBoardId]);

  const syncIndicator = <SyncIndicator status={syncStatus} />;
  const exportImport = <ExportImport state={state} onImport={replaceState} />;

  return (
    <div className="h-full w-full flex flex-col sm:flex-row overflow-hidden">
      {/* Mobile top bar */}
      <header className="sm:hidden flex items-center justify-between gap-2 px-3 h-14 bg-frame board-frame text-amber-50 shrink-0 border-b border-black/40">
        <button
          type="button"
          aria-label="Open boards menu"
          aria-expanded={mobileNavOpen}
          onClick={() => setMobileNavOpen((v) => !v)}
          className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-md hover:bg-white/10 focus-ring"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
            <path d="M3 5h16 M3 11h16 M3 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="font-display font-black text-base text-amber-100 truncate flex-1 text-center">
          {activeBoard?.name || 'Bulletin Board'}
        </h1>
        {syncIndicator}
      </header>

      {/* Sidebar — desktop = always; mobile = drawer */}
      <div className="hidden sm:block h-full shrink-0">
        <Sidebar
          boards={state.boards}
          activeBoardId={activeBoardId}
          onSelect={setActiveBoardId}
          onCreate={addBoard}
          onRename={renameBoard}
          onDelete={deleteBoard}
          syncIndicator={syncIndicator}
          exportImport={exportImport}
        />
      </div>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="sm:hidden fixed inset-0 z-40">
          <button
            aria-label="Close menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[88%] max-w-xs shadow-2xl">
            <Sidebar
              boards={state.boards}
              activeBoardId={activeBoardId}
              onSelect={setActiveBoardId}
              onCreate={addBoard}
              onRename={renameBoard}
              onDelete={deleteBoard}
              syncIndicator={syncIndicator}
              exportImport={exportImport}
            />
          </div>
        </div>
      )}

      {/* Main board area */}
      <main className="flex-1 relative min-w-0 flex flex-col">
        <div className="flex-1 relative">
          <div className="absolute inset-0 p-2 sm:p-3 lg:p-4">
            <div
              className="relative h-full w-full rounded-[10px] overflow-hidden"
              style={{
                boxShadow:
                  'inset 0 0 0 5px #2a1a0c, inset 0 0 0 9px #6b4528, inset 0 0 0 11px #2a1a0c, 0 28px 60px -12px rgba(0,0,0,0.65)'
              }}
            >
              <CorkBoard
                board={activeBoard}
                onAddNote={(opts) => addNote(activeBoardId, opts)}
                onUpdateNote={(id, patch) => updateNote(activeBoardId, id, patch)}
                onDeleteNote={(id) => deleteNote(activeBoardId, id)}
                isReducedMotion={reducedMotion}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
