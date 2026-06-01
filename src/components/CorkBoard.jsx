import React, { useCallback, useMemo, useRef, useState } from 'react';
import Note from './Note.jsx';
import Trash from './Trash.jsx';

export default function CorkBoard({
  board,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  isReducedMotion
}) {
  const boardRef = useRef(null);
  const trashRef = useRef(null);
  const [focusedNoteId, setFocusedNoteId] = useState(null);

  const noteOrder = useMemo(() => {
    if (!board) return new Map();
    const m = new Map();
    board.notes.forEach((n, i) => m.set(n.id, i + 1));
    if (focusedNoteId) m.set(focusedNoteId, board.notes.length + 50);
    return m;
  }, [board, focusedNoteId]);

  const onBoardDoubleClick = useCallback((e) => {
    if (!board) return;
    if (e.target !== boardRef.current && !e.target.classList.contains('cork-surface')) return;
    const rect = boardRef.current.getBoundingClientRect();
    const NOTE_W = 200;
    const NOTE_H = 200;
    const x = Math.max(8, Math.min(rect.width - NOTE_W - 8, e.clientX - rect.left - NOTE_W / 2));
    const y = Math.max(8, Math.min(rect.height - NOTE_H - 8, e.clientY - rect.top - NOTE_H / 2));
    const id = onAddNote({ x, y });
    setFocusedNoteId(id);
  }, [board, onAddNote]);

  const onAddCentered = useCallback(() => {
    if (!board || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const NOTE_W = 200;
    const NOTE_H = 200;
    const cx = rect.width / 2 - NOTE_W / 2 + (Math.random() * 80 - 40);
    const cy = rect.height / 2 - NOTE_H / 2 + (Math.random() * 80 - 40);
    const x = Math.max(8, Math.min(rect.width - NOTE_W - 8, cx));
    const y = Math.max(8, Math.min(rect.height - NOTE_H - 8, cy));
    const id = onAddNote({ x, y });
    setFocusedNoteId(id);
  }, [board, onAddNote]);

  if (!board) {
    return (
      <div className="h-full w-full relative flex items-center justify-center cork-surface">
        <div className="text-center text-ink/80 max-w-sm px-6">
          <h2 className="font-display font-black text-2xl mb-2">No board selected</h2>
          <p className="text-ink/70">Create a board from the sidebar to start pinning notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col">
      {/* Top toolbar — always visible, primary "Add note" action */}
      <div className="relative z-30 flex items-center justify-between gap-2 px-3 py-2 bg-ink/85 border-b border-white/10 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline-block text-amber-100/80 text-sm font-medium truncate max-w-[18rem]">
            {board.name}
          </span>
          <span className="text-amber-100/50 text-xs">
            {board.notes.length} {board.notes.length === 1 ? 'note' : 'notes'}
          </span>
        </div>
        <button
          type="button"
          onClick={onAddCentered}
          className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-semibold shadow-md transition-colors focus-ring"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M8 3v10 M3 8h10" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          New note
        </button>
      </div>

      {/* Board area */}
      <div className="relative flex-1 min-h-0">
        {/* The cork surface — note positions are relative to this */}
        <div
          ref={boardRef}
          className="absolute inset-0 cork-surface overflow-hidden touch-none"
          onDoubleClick={onBoardDoubleClick}
          onPointerDown={(e) => {
            if (e.target === boardRef.current) setFocusedNoteId(null);
          }}
        >
          {board.notes.map((note) => (
            <Note
              key={note.id}
              note={note}
              boardRef={boardRef}
              trashRef={trashRef}
              zIndex={noteOrder.get(note.id) || 1}
              isReducedMotion={isReducedMotion}
              onMove={(pos) => onUpdateNote(note.id, pos)}
              onChange={(patch) => onUpdateNote(note.id, patch)}
              onDelete={() => onDeleteNote(note.id)}
              onFocus={() => setFocusedNoteId(note.id)}
            />
          ))}
        </div>

        {/* Floating Add button (FAB) — secondary entry on mobile, always reachable */}
        <button
          type="button"
          aria-label="Add a note"
          onClick={onAddCentered}
          className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xl ring-2 ring-emerald-900/40 transition-colors focus-ring"
          style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)' }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
            <path d="M13 5v16 M5 13h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>

        {/* Trash */}
        <Trash ref={trashRef} active={false} />

        {/* Empty state — actionable, not just a hint */}
        {board.notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
            <div className="pointer-events-auto text-center max-w-sm bg-amber-50/95 text-ink rounded-2xl px-6 py-6 shadow-2xl border border-amber-300/60 paper-texture">
              <h2 className="font-display font-black text-xl sm:text-2xl mb-1 leading-tight">
                This board is empty
              </h2>
              <p className="text-ink/75 text-sm sm:text-base mb-4">
                Drop your first sticky note. You can also double-tap anywhere on the cork.
              </p>
              <button
                type="button"
                onClick={onAddCentered}
                className="inline-flex items-center gap-2 min-h-[44px] px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm sm:text-base font-semibold shadow-md transition-colors focus-ring"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3.5v11 M3.5 9h11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Add your first note
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
