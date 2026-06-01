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

  // Mobile FAB add
  const onFabAdd = useCallback(() => {
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
      <div className="flex-1 relative flex items-center justify-center cork-surface">
        <div className="text-center text-ink/80 max-w-sm px-6">
          <h2 className="font-display font-black text-2xl mb-2">No board selected</h2>
          <p className="text-ink/70">Create a board from the sidebar to start pinning notes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative overflow-hidden">
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

      {/* Floating Add button (always visible — works on mobile + desktop) */}
      <button
        type="button"
        aria-label="Add a note"
        onClick={onFabAdd}
        className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 z-30 inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-xl ring-2 ring-emerald-900/40 transition-colors focus-ring"
        style={{ boxShadow: '0 6px 18px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)' }}
      >
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
          <path d="M13 5v16 M5 13h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>

      {/* Trash */}
      <Trash ref={trashRef} active={false} />

      {/* Hint pill — only when board is empty */}
      {board.notes.length === 0 && (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <div className="bg-black/40 text-amber-50 px-4 py-2 rounded-full text-sm sm:text-base font-medium backdrop-blur border border-white/10">
            Tap <span className="font-bold">+</span> or double-tap the board to add a note
          </div>
        </div>
      )}
    </div>
  );
}
