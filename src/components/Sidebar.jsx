import React, { useEffect, useRef, useState } from 'react';

function BoardItem({ board, active, onSelect, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(board.name);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
    } else {
      setDraft(board.name);
    }
  }, [editing, board.name]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== board.name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <div
      className={[
        'group flex items-center gap-1.5 rounded-lg pl-3 pr-1.5 py-2 cursor-pointer transition-colors',
        'min-h-[44px]',
        active
          ? 'bg-amber-100/95 text-ink shadow-inner ring-1 ring-amber-300/60'
          : 'bg-black/25 hover:bg-black/35 text-amber-50'
      ].join(' ')}
      onClick={() => !editing && onSelect()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (active) setEditing(true);
      }}
    >
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            else if (e.key === 'Escape') { setEditing(false); setDraft(board.name); }
          }}
          className="flex-1 min-w-0 bg-transparent border-b border-current outline-none text-sm sm:text-base font-display font-bold tracking-tight"
        />
      ) : (
        <span className="flex-1 min-w-0 truncate text-sm sm:text-base font-display font-bold tracking-tight">
          {board.name}
        </span>
      )}
      <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
        {active && !editing && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEditing(true); }}
            aria-label={`Rename ${board.name}`}
            className="min-h-[36px] min-w-[36px] rounded-md inline-flex items-center justify-center hover:bg-black/15 focus-ring"
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
              <path d="M2 11.5V13h1.5L11 5.5 9.5 4 2 11.5zM12.3 3.2l-.5.5L13.3 5.2l.5-.5a1 1 0 0 0 0-1.5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete board "${board.name}"? This removes all its notes.`)) {
              onDelete();
            }
          }}
          aria-label={`Delete board ${board.name}`}
          className="min-h-[36px] min-w-[36px] rounded-md inline-flex items-center justify-center hover:bg-red-500/30 focus-ring"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            <path d="M2.5 4h9 M5 4V2.5 a1 1 0 0 1 1-1h2 a1 1 0 0 1 1 1V4 M4 4l.6 7.6 a1 1 0 0 0 1 1h2.8 a1 1 0 0 0 1-1L10 4" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function Sidebar({
  boards,
  activeBoardId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  syncIndicator,
  exportImport
}) {
  return (
    <aside className="relative flex flex-col h-full w-full sm:w-72 sm:min-w-[18rem] bg-frame board-frame text-amber-50">
      <div className="px-4 pt-4 sm:pt-5 pb-2 flex items-center justify-between gap-2">
        <h1 className="font-display font-black text-lg sm:text-xl tracking-tight text-amber-100 leading-none">
          <span className="block">Bulletin</span>
          <span className="block text-amber-300/90">Board</span>
        </h1>
        {syncIndicator}
      </div>

      <div className="px-3 mt-1 mb-3">
        <button
          type="button"
          onClick={() => {
            const name = prompt('New board name:', `Board ${boards.length + 1}`);
            if (name === null) return;
            onCreate(name.trim() || `Board ${boards.length + 1}`);
          }}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[44px] rounded-lg bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white text-sm font-semibold shadow-md transition-colors focus-ring"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10 M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          New board
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 space-y-1.5 pb-3">
        {boards.length === 0 ? (
          <p className="text-amber-100/70 text-sm px-1 py-3">
            No boards yet. Create one to start pinning notes.
          </p>
        ) : (
          boards.map((b) => (
            <BoardItem
              key={b.id}
              board={b}
              active={b.id === activeBoardId}
              onSelect={() => onSelect(b.id)}
              onRename={(name) => onRename(b.id, name)}
              onDelete={() => onDelete(b.id)}
            />
          ))
        )}
      </div>

      <div className="px-3 pb-4 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between gap-2">
          {exportImport}
        </div>
        <p className="text-amber-100/50 text-[10px] mt-2 leading-snug">
          Backups are JSON. Notes auto-sync via the serverless API.
        </p>
      </div>
    </aside>
  );
}
