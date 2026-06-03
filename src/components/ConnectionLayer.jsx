import React, { useState } from 'react';

const SIDE_OFFSETS = {
  top:    { x:  0, y: -1 },
  bottom: { x:  0, y:  1 },
  left:   { x: -1, y:  0 },
  right:  { x:  1, y:  0 }
};

export function sidePoint(note, side) {
  const cx = note.x + note.w / 2;
  const cy = note.y + note.h / 2;
  switch (side) {
    case 'top':    return { x: cx, y: note.y };
    case 'bottom': return { x: cx, y: note.y + note.h };
    case 'left':   return { x: note.x, y: cy };
    case 'right':
    default:       return { x: note.x + note.w, y: cy };
  }
}

export function chooseSides(noteA, noteB) {
  const ax = noteA.x + noteA.w / 2;
  const ay = noteA.y + noteA.h / 2;
  const bx = noteB.x + noteB.w / 2;
  const by = noteB.y + noteB.h / 2;
  const dx = bx - ax;
  const dy = by - ay;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { fromSide: 'right',  toSide: 'left' }
      : { fromSide: 'left',   toSide: 'right' };
  }
  return dy >= 0
    ? { fromSide: 'bottom', toSide: 'top' }
    : { fromSide: 'top',    toSide: 'bottom' };
}

function arrowPath(start, end, fromSide, toSide) {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const offset = Math.max(40, Math.min(160, (dx + dy) / 3));
  const so = SIDE_OFFSETS[fromSide] || SIDE_OFFSETS.right;
  const eo = SIDE_OFFSETS[toSide]   || SIDE_OFFSETS.left;
  const c1 = { x: start.x + so.x * offset, y: start.y + so.y * offset };
  const c2 = { x: end.x   + eo.x * offset, y: end.y   + eo.y * offset };
  return `M ${start.x} ${start.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${end.x} ${end.y}`;
}

function Connection({ id, fromNote, toNote, onDelete }) {
  const [hover, setHover] = useState(false);
  const { fromSide, toSide } = chooseSides(fromNote, toNote);
  const start = sidePoint(fromNote, fromSide);
  const end   = sidePoint(toNote, toSide);
  const d     = arrowPath(start, end, fromSide, toSide);

  // Midpoint approximation for the X button (use cubic Bezier midpoint formula at t=0.5)
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const offset = Math.max(40, Math.min(160, (dx + dy) / 3));
  const so = SIDE_OFFSETS[fromSide];
  const eo = SIDE_OFFSETS[toSide];
  const c1x = start.x + so.x * offset, c1y = start.y + so.y * offset;
  const c2x = end.x   + eo.x * offset, c2y = end.y   + eo.y * offset;
  const t = 0.5;
  const omt = 1 - t;
  const midX =
    omt * omt * omt * start.x +
    3 * omt * omt * t * c1x +
    3 * omt * t * t * c2x +
    t * t * t * end.x;
  const midY =
    omt * omt * omt * start.y +
    3 * omt * omt * t * c1y +
    3 * omt * t * t * c2y +
    t * t * t * end.y;

  const stroke = hover ? '#b91c1c' : '#2d2118';
  const markerId = hover ? 'arrowhead-hover' : 'arrowhead';

  return (
    <g
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      data-connection-id={id}
    >
      {/* shadow for depth */}
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.25)"
        strokeWidth={4}
        strokeLinecap="round"
        transform="translate(1.5, 2)"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {/* visible stroke */}
      <path
        d={d}
        fill="none"
        stroke={stroke}
        strokeWidth={hover ? 3.4 : 2.6}
        strokeLinecap="round"
        markerEnd={`url(#${markerId})`}
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
      {/* invisible thick hit area */}
      <path
        d={d}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
        style={{ cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete(id);
        }}
      />
      {hover && (
        <g
          transform={`translate(${midX} ${midY})`}
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          <circle r="11" fill="#b91c1c" stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          <path d="M -4 -4 L 4 4 M 4 -4 L -4 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  );
}

function DraftArrow({ start, fromSide, end }) {
  // dynamic toSide: face the cursor
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const toSide =
    Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? 'left' : 'right')
      : (dy >= 0 ? 'top' : 'bottom');
  const d = arrowPath(start, end, fromSide, toSide);
  return (
    <g pointerEvents="none">
      <path
        d={d}
        fill="none"
        stroke="rgba(0,0,0,0.2)"
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray="6 6"
        transform="translate(1.5, 2)"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={d}
        fill="none"
        stroke="#15803D"
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeDasharray="6 6"
        markerEnd="url(#arrowhead-draft)"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
}

export default function ConnectionLayer({ board, draft, onDeleteConnection }) {
  if (!board) return null;
  const notesById = new Map(board.notes.map((n) => [n.id, n]));
  return (
    <svg
      className="absolute"
      style={{
        left: 0,
        top: 0,
        width: 1,
        height: 1,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#2d2118" />
        </marker>
        <marker
          id="arrowhead-hover"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#b91c1c" />
        </marker>
        <marker
          id="arrowhead-draft"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#15803D" />
        </marker>
      </defs>
      <g style={{ pointerEvents: 'auto' }}>
        {(board.connections || []).map((c) => {
          const fromNote = notesById.get(c.from);
          const toNote = notesById.get(c.to);
          if (!fromNote || !toNote) return null;
          return (
            <Connection
              key={c.id}
              id={c.id}
              fromNote={fromNote}
              toNote={toNote}
              onDelete={onDeleteConnection}
            />
          );
        })}
      </g>
      {draft && draft.fromNote && (
        <DraftArrow
          start={sidePoint(draft.fromNote, draft.fromSide)}
          fromSide={draft.fromSide}
          end={{ x: draft.x, y: draft.y }}
        />
      )}
    </svg>
  );
}
