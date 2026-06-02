import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Note from './Note.jsx';
import Trash from './Trash.jsx';
import ConnectionLayer from './ConnectionLayer.jsx';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 3;
const PAN_THRESHOLD = 4;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export default function CorkBoard({
  board,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddConnection,
  onDeleteConnection,
  isReducedMotion
}) {
  const boardRef = useRef(null);
  const trashRef = useRef(null);
  const [focusedNoteId, setFocusedNoteId] = useState(null);

  // Zoom + pan state. Pan is in screen pixels; zoom is unit-less.
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Live refs for pointer handlers to read fresh state without re-binding.
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const panRef = useRef(pan);   panRef.current = pan;

  // Pan-drag state — initiated by pointerdown on empty cork.
  const panDragRef = useRef(null);
  const [panning, setPanning] = useState(false);

  // Draft connection state — initiated by pointerdown on a note's connection point.
  const [draft, setDraft] = useState(null);
  const draftRef = useRef(null);
  draftRef.current = draft;

  const screenToWorld = useCallback((clientX, clientY) => {
    const el = boardRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: (clientX - r.left - panRef.current.x) / zoomRef.current,
      y: (clientY - r.top  - panRef.current.y) / zoomRef.current
    };
  }, []);

  const noteOrder = useMemo(() => {
    if (!board) return new Map();
    const m = new Map();
    board.notes.forEach((n, i) => m.set(n.id, i + 1));
    if (focusedNoteId) m.set(focusedNoteId, board.notes.length + 50);
    return m;
  }, [board, focusedNoteId]);

  // ---------- Wheel = zoom-to-cursor ----------
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.target.closest('[data-no-zoom]')) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const worldX = (cx - panRef.current.x) / zoomRef.current;
      const worldY = (cy - panRef.current.y) / zoomRef.current;
      // Smooth zoom: deltaY can be in lines, pixels, or pages — normalize.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const factor = Math.exp(-e.deltaY * unit * 0.0015);
      const newZoom = clamp(zoomRef.current * factor, ZOOM_MIN, ZOOM_MAX);
      const newPanX = cx - worldX * newZoom;
      const newPanY = cy - worldY * newZoom;
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // ---------- Cork pointer-down → pan, or deselect ----------
  const onCorkPointerDown = useCallback((e) => {
    if (e.target !== boardRef.current) return;
    if (e.button !== undefined && e.button !== 0 && e.button !== 1) return;
    panDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPanX: panRef.current.x,
      startPanY: panRef.current.y,
      pointerId: e.pointerId,
      moved: false
    };
    try { boardRef.current.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    window.addEventListener('pointermove', onPanMove);
    window.addEventListener('pointerup', onPanUp);
    window.addEventListener('pointercancel', onPanUp);
  }, []);

  const onPanMove = useCallback((e) => {
    const ds = panDragRef.current;
    if (!ds) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < PAN_THRESHOLD) return;
    if (!ds.moved) {
      ds.moved = true;
      setPanning(true);
    }
    setPan({ x: ds.startPanX + dx, y: ds.startPanY + dy });
  }, []);

  const onPanUp = useCallback((e) => {
    const ds = panDragRef.current;
    panDragRef.current = null;
    window.removeEventListener('pointermove', onPanMove);
    window.removeEventListener('pointerup', onPanUp);
    window.removeEventListener('pointercancel', onPanUp);
    setPanning(false);
    if (!ds) return;
    try { boardRef.current?.releasePointerCapture?.(ds.pointerId); } catch { /* ignore */ }
    // If we didn't move, treat as a deselect tap.
    if (!ds.moved) {
      setFocusedNoteId(null);
    }
  }, [onPanMove]);

  // ---------- Connection drag (initiated from a note's connection point) ----------
  const onConnectionStart = useCallback((noteId, side, evt) => {
    const fromNote = board?.notes.find((n) => n.id === noteId);
    if (!fromNote) return;
    const world = screenToWorld(evt.clientX, evt.clientY);
    setDraft({
      fromNote,
      fromSide: side,
      x: world.x,
      y: world.y,
      hoverNoteId: null
    });
    try { boardRef.current?.setPointerCapture?.(evt.pointerId); } catch { /* ignore */ }
    window.addEventListener('pointermove', onConnMove);
    window.addEventListener('pointerup', onConnUp);
    window.addEventListener('pointercancel', onConnUp);
  }, [board, screenToWorld]);

  const noteAtWorld = useCallback((wx, wy, excludeId) => {
    if (!board) return null;
    for (let i = board.notes.length - 1; i >= 0; i--) {
      const n = board.notes[i];
      if (n.id === excludeId) continue;
      if (wx >= n.x && wx <= n.x + n.w && wy >= n.y && wy <= n.y + n.h) return n;
    }
    return null;
  }, [board]);

  const onConnMove = useCallback((e) => {
    const d = draftRef.current;
    if (!d) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const target = noteAtWorld(world.x, world.y, d.fromNote.id);
    setDraft({ ...d, x: world.x, y: world.y, hoverNoteId: target?.id || null });
  }, [noteAtWorld, screenToWorld]);

  const onConnUp = useCallback((e) => {
    const d = draftRef.current;
    window.removeEventListener('pointermove', onConnMove);
    window.removeEventListener('pointerup', onConnUp);
    window.removeEventListener('pointercancel', onConnUp);
    if (!d) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const target = noteAtWorld(world.x, world.y, d.fromNote.id);
    setDraft(null);
    if (target) onAddConnection?.(d.fromNote.id, target.id);
  }, [noteAtWorld, onAddConnection, onConnMove, screenToWorld]);

  // ---------- Add-note actions ----------
  const onCorkDoubleClick = useCallback((e) => {
    if (!board) return;
    if (e.target !== boardRef.current) return;
    const world = screenToWorld(e.clientX, e.clientY);
    const NOTE_W = 200, NOTE_H = 200;
    const id = onAddNote({ x: world.x - NOTE_W / 2, y: world.y - NOTE_H / 2 });
    setFocusedNoteId(id);
  }, [board, onAddNote, screenToWorld]);

  const onAddCentered = useCallback(() => {
    if (!board || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    // Center of the visible viewport in world coords
    const cx = (rect.width / 2 - panRef.current.x) / zoomRef.current;
    const cy = (rect.height / 2 - panRef.current.y) / zoomRef.current;
    const jitterX = (Math.random() * 80 - 40);
    const jitterY = (Math.random() * 80 - 40);
    const id = onAddNote({ x: cx - 100 + jitterX, y: cy - 100 + jitterY });
    setFocusedNoteId(id);
  }, [board, onAddNote]);

  // ---------- Zoom controls ----------
  const adjustZoom = useCallback((next) => {
    if (!boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    const worldX = (cx - panRef.current.x) / zoomRef.current;
    const worldY = (cy - panRef.current.y) / zoomRef.current;
    const newZoom = clamp(next, ZOOM_MIN, ZOOM_MAX);
    setZoom(newZoom);
    setPan({ x: cx - worldX * newZoom, y: cy - worldY * newZoom });
  }, []);

  const onResetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Keyboard: ESC cancels a draft connection
  useEffect(() => {
    if (!draft) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraft(null);
        window.removeEventListener('pointermove', onConnMove);
        window.removeEventListener('pointerup', onConnUp);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [draft, onConnMove, onConnUp]);

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

  const zoomPct = Math.round(zoom * 100);
  const worldStyle = {
    transformOrigin: '0 0',
    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
    willChange: 'transform'
  };

  return (
    <div className="h-full w-full relative overflow-hidden flex flex-col">
      {/* Top toolbar */}
      <div
        data-no-zoom
        className="relative z-30 flex items-center justify-between gap-2 px-3 py-2 bg-ink/85 border-b border-white/10 backdrop-blur-sm shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="hidden sm:inline-block text-amber-100/80 text-sm font-medium truncate max-w-[14rem]">
            {board.name}
          </span>
          <span className="text-amber-100/50 text-xs">
            {board.notes.length} {board.notes.length === 1 ? 'note' : 'notes'}
            {board.connections?.length ? ` · ${board.connections.length} link${board.connections.length === 1 ? '' : 's'}` : ''}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Zoom group */}
          <div className="flex items-center rounded-md bg-black/30 border border-white/10 overflow-hidden">
            <button
              type="button"
              onClick={() => adjustZoom(zoomRef.current / 1.2)}
              aria-label="Zoom out"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-amber-100 hover:bg-white/10 focus-ring transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onResetView}
              aria-label={`Zoom level ${zoomPct}%. Click to reset view.`}
              title="Reset view"
              className="min-h-[36px] px-2 text-amber-100 text-xs font-semibold hover:bg-white/10 focus-ring transition-colors tabular-nums"
            >
              {zoomPct}%
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(zoomRef.current * 1.2)}
              aria-label="Zoom in"
              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center text-amber-100 hover:bg-white/10 focus-ring transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                <path d="M7 2v10 M2 7h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {/* New note */}
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
      </div>

      {/* Board area */}
      <div className="relative flex-1 min-h-0">
        {/* Cork captures wheel + pan, but its background stays viewport-fixed
            so zooming doesn't pixelate the texture. */}
        <div
          ref={boardRef}
          className="absolute inset-0 cork-surface overflow-hidden touch-none"
          onDoubleClick={onCorkDoubleClick}
          onPointerDown={onCorkPointerDown}
          style={{ cursor: panning ? 'grabbing' : draft ? 'crosshair' : 'default' }}
        >
          {/* World — everything that should zoom + pan lives here */}
          <div
            className="absolute"
            style={worldStyle}
          >
            <ConnectionLayer
              board={board}
              draft={draft}
              onDeleteConnection={onDeleteConnection}
            />
            {board.notes.map((note) => (
              <Note
                key={note.id}
                note={note}
                boardRef={boardRef}
                trashRef={trashRef}
                zoom={zoom}
                pan={pan}
                zIndex={noteOrder.get(note.id) || 1}
                isReducedMotion={isReducedMotion}
                onMove={(pos) => onUpdateNote(note.id, pos)}
                onChange={(patch) => onUpdateNote(note.id, patch)}
                onDelete={() => onDeleteNote(note.id)}
                onFocus={() => setFocusedNoteId(note.id)}
                onConnectionStart={onConnectionStart}
              />
            ))}
          </div>

          {/* Drop target highlight on the candidate note while drafting */}
          {draft && draft.hoverNoteId && (
            <div
              aria-hidden="true"
              className="absolute pointer-events-none rounded-[3px] ring-4 ring-emerald-500/70 animate-pulse-soft"
              style={(() => {
                const n = board.notes.find((nn) => nn.id === draft.hoverNoteId);
                if (!n) return { display: 'none' };
                return {
                  left: pan.x + n.x * zoom - 2,
                  top:  pan.y + n.y * zoom - 2,
                  width:  n.w * zoom + 4,
                  height: n.h * zoom + 4
                };
              })()}
            />
          )}
        </div>

        {/* Floating Add button — viewport-fixed */}
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

        {/* Empty state */}
        {board.notes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-6">
            <div className="pointer-events-auto text-center max-w-sm bg-amber-50/95 text-ink rounded-2xl px-6 py-6 shadow-2xl border border-amber-300/60 paper-texture">
              <h2 className="font-display font-black text-xl sm:text-2xl mb-1 leading-tight">
                This board is empty
              </h2>
              <p className="text-ink/75 text-sm sm:text-base mb-4">
                Drop your first sticky note. Then drag the green dots on a note's edge to link
                notes with arrows. Scroll to zoom.
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
