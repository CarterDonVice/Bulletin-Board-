import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import EditorToolbar from './EditorToolbar.jsx';
import { Pin, Tape } from './Pin.jsx';

const COLOR_HEX = {
  yellow: '#fff59d',
  pink: '#ffc1cc',
  blue: '#bbdefb',
  green: '#c8e6c9',
  peach: '#ffd6b3',
  lavender: '#dcd1ff'
};

const FONT_SIZES = [13, 15, 18, 22, 28];
const DEFAULT_FONT_SIZE = 18;

function nextSmaller(size) {
  let candidate = null;
  for (const s of FONT_SIZES) if (s < size && (candidate === null || s > candidate)) candidate = s;
  return candidate;
}
function nextLarger(size) {
  for (const s of FONT_SIZES) if (s > size) return s;
  return null;
}

function colorVar(name) {
  return COLOR_HEX[name] || COLOR_HEX.yellow;
}

function seedFrom(id) {
  let s = 0;
  for (let i = 0; i < id.length; i++) s = (s * 31 + id.charCodeAt(i)) | 0;
  return s;
}

const DRAG_THRESHOLD = 4; // px of movement before drag starts

export default function Note({
  note,
  boardRef,
  trashRef,
  onMove,
  onChange,
  onDelete,
  onFocus,
  onConnectionStart,
  zoom = 1,
  pan = { x: 0, y: 0 },
  pinchTaintedRef,
  isPinchingRef,
  zIndex,
  isReducedMotion
}) {
  const noteRef = useRef(null);
  const dragState = useRef(null);
  const [editing, setEditing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [overTrash, setOverTrash] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [justCreated, setJustCreated] = useState(true);

  // Drop the pop-in flag after first paint cycle so subsequent renders don't re-trigger it
  useEffect(() => {
    const t = setTimeout(() => setJustCreated(false), 320);
    return () => clearTimeout(t);
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false
      }),
      Underline
    ],
    content: note.content || '<p></p>',
    editorProps: {
      attributes: {
        class: 'tt-content focus:outline-none w-full h-full',
        'data-placeholder': 'Tap to write…'
      }
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.({ content: ed.getHTML() });
    }
  });

  // If the note's content changes externally (e.g. remote sync), update editor.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if ((note.content || '<p></p>') !== current) {
      editor.commands.setContent(note.content || '<p></p>', false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.content, editor]);

  // Convert a screen-space pointer into world-space coords (accounts for pan + zoom).
  const screenToWorld = (clientX, clientY) => {
    const boardEl = boardRef.current;
    if (!boardEl) return { x: clientX, y: clientY };
    const r = boardEl.getBoundingClientRect();
    return {
      x: (clientX - r.left - pan.x) / zoom,
      y: (clientY - r.top  - pan.y) / zoom
    };
  };

  // ----- Drag handling (pointer events for mouse + touch + pen) -----
  const onPointerDown = (e) => {
    if (editing) return; // don't drag while editing
    if (e.button !== undefined && e.button !== 0) return;
    // ignore drags starting on interactive children (X button, connection points)
    if (e.target.closest('[data-no-drag]')) return;
    // a multi-touch gesture takes over — don't start a note drag
    if (pinchTaintedRef?.current) return;

    const noteEl = noteRef.current;
    if (!noteEl) return;
    const world = screenToWorld(e.clientX, e.clientY);
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      offsetX: world.x - note.x,
      offsetY: world.y - note.y,
      pointerId: e.pointerId,
      moved: false
    };
    onFocus?.();
    try { noteEl.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (e) => {
    const ds = dragState.current;
    if (!ds) return;
    // Freeze movement while a multi-touch gesture is active OR while the post-pinch
    // cooldown is still in effect (waiting for all fingers to lift).
    if (isPinchingRef?.current || pinchTaintedRef?.current) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (!ds.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    if (!ds.moved) {
      ds.moved = true;
      setDragging(true);
    }
    const world = screenToWorld(e.clientX, e.clientY);
    const nx = world.x - ds.offsetX;
    const ny = world.y - ds.offsetY;
    // Clamp loosely so notes don't fly off into infinity, but allow extending the canvas.
    const MIN = -2000;
    const MAX = 4000;
    const x = Math.max(MIN, Math.min(MAX, nx));
    const y = Math.max(MIN, Math.min(MAX, ny));
    onMove?.({ x, y });

    // trash hit-test (uses screen coords — trash is outside the world)
    const trashEl = trashRef?.current;
    if (trashEl) {
      const tr = trashEl.getBoundingClientRect();
      const within =
        e.clientX >= tr.left && e.clientX <= tr.right &&
        e.clientY >= tr.top && e.clientY <= tr.bottom;
      setOverTrash(within);
    }
  };

  const onPointerUp = (e) => {
    const ds = dragState.current;
    dragState.current = null;
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    setDragging(false);

    if (!ds) return;
    try { noteRef.current?.releasePointerCapture?.(ds.pointerId); } catch { /* ignore */ }

    if (overTrash) {
      setOverTrash(false);
      triggerDelete();
      return;
    }
    setOverTrash(false);

    // if not moved, treat as a click → enter editing mode
    if (!ds.moved) {
      setEditing(true);
      // focus editor on next tick to ensure it's mounted
      requestAnimationFrame(() => editor?.commands.focus('end'));
    }
  };

  // ----- Click-outside to exit editing -----
  useEffect(() => {
    if (!editing) return;
    const onDocPointerDown = (e) => {
      const noteEl = noteRef.current;
      if (!noteEl) return;
      if (noteEl.contains(e.target)) return;
      // also ignore clicks on the toolbar which lives outside the note
      const toolbar = document.querySelector('[role="toolbar"][aria-label="Note formatting"]');
      if (toolbar && toolbar.contains(e.target)) return;
      setEditing(false);
      editor?.commands.blur();
    };
    document.addEventListener('pointerdown', onDocPointerDown, true);
    return () => document.removeEventListener('pointerdown', onDocPointerDown, true);
  }, [editing, editor]);

  // ESC exits editing
  useEffect(() => {
    if (!editing) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setEditing(false);
        editor?.commands.blur();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing, editor]);

  const triggerDelete = () => {
    if (isReducedMotion) {
      onDelete?.();
      return;
    }
    setRemoving(true);
    // wait for animation to finish, then unmount
    setTimeout(() => onDelete?.(), 520);
  };

  const seed = seedFrom(note.id);
  const bg = colorVar(note.color);

  const animClass = removing
    ? 'animate-crumple-toss'
    : justCreated && !isReducedMotion
      ? 'animate-note-pop'
      : '';

  const transitionStyle = dragging || removing
    ? 'none'
    : 'transform 220ms cubic-bezier(.2,1.1,.4,1), box-shadow 220ms ease, scale 220ms ease';

  return (
    <div
      ref={noteRef}
      data-note-id={note.id}
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        // prevent board double-click handler from also firing
        e.stopPropagation();
      }}
      role="group"
      aria-label="Sticky note"
      tabIndex={-1}
      className={[
        'absolute select-none rounded-[3px] curl-corner paper-texture',
        'touch-none', // disable browser touch scrolling/zoom on drag
        'will-change-transform',
        animClass,
        editing ? 'cursor-text' : dragging ? 'cursor-grabbing' : 'cursor-grab'
      ].join(' ')}
      style={{
        left: 0,
        top: 0,
        width: note.w || 200,
        height: note.h || 200,
        color: bg,
        backgroundColor: bg,
        transform: `translate3d(${note.x}px, ${note.y}px, 0) rotate(${note.rotation}deg) ${dragging ? 'scale(1.04)' : ''}`,
        transition: transitionStyle,
        zIndex: zIndex || 1,
        boxShadow: removing
          ? '0 1px 2px rgba(0,0,0,0.1)'
          : dragging
            ? 'var(--tw-shadow), 0 4px 4px rgba(0,0,0,0.15), 0 14px 22px rgba(0,0,0,0.28), 0 30px 50px -10px rgba(0,0,0,0.42)'
            : '0 1px 1px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.18), 0 8px 14px -6px rgba(0,0,0,0.30)',
        ['--rot']: `${note.rotation}deg`
      }}
    >
      {/* Pin or tape (decorative, sits above note at top edge) */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          top: note.pin === 'tape' ? -8 : -10,
          left: note.pin === 'tape'
            ? `calc(50% + ${note.pinOffset}px - 28px)`
            : `calc(50% + ${note.pinOffset}px - 11px)`,
          zIndex: 2
        }}
      >
        {note.pin === 'tape' ? <Tape seed={seed} /> : <Pin seed={seed} />}
      </div>

      {/* Delete X */}
      <button
        type="button"
        data-no-drag
        aria-label="Delete note"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); triggerDelete(); }}
        className="absolute top-1 right-1 z-10 w-7 h-7 inline-flex items-center justify-center rounded-full bg-black/0 hover:bg-black/10 active:bg-black/20 transition-colors text-ink/70 hover:text-ink focus-ring opacity-70 hover:opacity-100"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>

      {/* Body — editor */}
      <div
        className="absolute inset-0 px-3 pt-5 pb-3"
        onPointerDown={(e) => {
          // when editing, let pointer events go to editor (don't start drag)
          if (editing) e.stopPropagation();
        }}
      >
        <div
          className="w-full h-full leading-snug text-ink note-scroll overflow-y-auto"
          style={{
            fontSize: `${note.fontSize || DEFAULT_FONT_SIZE}px`,
            overflowWrap: 'anywhere',
            wordBreak: 'break-word'
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>

      {editing && (
        <EditorToolbar
          editor={editor}
          fontSize={note.fontSize || DEFAULT_FONT_SIZE}
          canDecreaseFontSize={nextSmaller(note.fontSize || DEFAULT_FONT_SIZE) !== null}
          canIncreaseFontSize={nextLarger(note.fontSize || DEFAULT_FONT_SIZE) !== null}
          onDecreaseFontSize={() => {
            const next = nextSmaller(note.fontSize || DEFAULT_FONT_SIZE);
            if (next !== null) onChange?.({ fontSize: next });
          }}
          onIncreaseFontSize={() => {
            const next = nextLarger(note.fontSize || DEFAULT_FONT_SIZE);
            if (next !== null) onChange?.({ fontSize: next });
          }}
        />
      )}

      {overTrash && (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-[3px] pointer-events-none ring-4 ring-red-500/70 animate-pulse-soft"
        />
      )}

      {/* Connection anchor points (top / right / bottom / left). Positioned half-outside the
          note's edges so they don't conflict with the note's draggable body. */}
      {!removing && !editing && onConnectionStart && (
        <>
          <ConnectionPoint side="top"    note={note} onConnectionStart={onConnectionStart} />
          <ConnectionPoint side="right"  note={note} onConnectionStart={onConnectionStart} />
          <ConnectionPoint side="bottom" note={note} onConnectionStart={onConnectionStart} />
          <ConnectionPoint side="left"   note={note} onConnectionStart={onConnectionStart} />
        </>
      )}
    </div>
  );
}

function ConnectionPoint({ side, note, onConnectionStart }) {
  const pos = {
    top:    { top: -9, left: 'calc(50% - 9px)' },
    right:  { right: -9, top: 'calc(50% - 9px)' },
    bottom: { bottom: -9, left: 'calc(50% - 9px)' },
    left:   { left: -9, top: 'calc(50% - 9px)' }
  }[side];
  return (
    <button
      type="button"
      data-no-drag
      data-connection-point
      aria-label={`Start a connection from ${side}`}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (e.button !== undefined && e.button !== 0) return;
        onConnectionStart?.(note.id, side, e);
      }}
      onClick={(e) => e.stopPropagation()}
      className="absolute w-[18px] h-[18px] rounded-full bg-emerald-700 ring-2 ring-white shadow-md opacity-50 hover:opacity-100 hover:scale-110 focus:opacity-100 transition-all duration-150 focus-ring"
      style={{ ...pos, touchAction: 'none', zIndex: 6 }}
    />
  );
}
