import React from 'react';

const PIN_COLORS = ['#c0392b', '#2980b9', '#d4af37', '#27ae60', '#8e44ad'];

export function Pin({ seed = 0 }) {
  const color = PIN_COLORS[Math.abs(seed) % PIN_COLORS.length];
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 22 22"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(1px 2px 1.5px rgba(0,0,0,0.45))' }}
    >
      <defs>
        <radialGradient id={`pinHead-${seed}`} cx="35%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="22%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} />
        </radialGradient>
        <radialGradient id={`pinHi-${seed}`} cx="32%" cy="28%" r="14%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* pin shadow on note */}
      <ellipse cx="11.5" cy="14.5" rx="3.6" ry="1.2" fill="rgba(0,0,0,0.35)" />
      {/* base */}
      <circle cx="11" cy="11" r="8" fill={`url(#pinHead-${seed})`} />
      {/* darker rim */}
      <circle cx="11" cy="11" r="8" fill="none" stroke="rgba(0,0,0,0.25)" strokeWidth="0.6" />
      {/* highlight */}
      <circle cx="8.2" cy="7.6" r="2.8" fill={`url(#pinHi-${seed})`} />
    </svg>
  );
}

const TAPE_COLORS = ['rgba(255,235,150,0.78)', 'rgba(220,220,220,0.70)', 'rgba(255,200,140,0.72)'];

export function Tape({ seed = 0 }) {
  const color = TAPE_COLORS[Math.abs(seed) % TAPE_COLORS.length];
  return (
    <svg
      width="56"
      height="20"
      viewBox="0 0 56 20"
      aria-hidden="true"
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
    >
      <defs>
        <linearGradient id={`tape-${seed}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} />
          <stop offset="55%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.85" />
        </linearGradient>
      </defs>
      {/* torn ends approximated with polygon */}
      <polygon
        points="0,4 4,2 10,4 16,2 22,4 28,2 34,4 40,2 46,4 52,2 56,4 56,16 52,18 46,16 40,18 34,16 28,18 22,16 16,18 10,16 4,18 0,16"
        fill={`url(#tape-${seed})`}
      />
      {/* subtle inner sheen */}
      <line x1="2" y1="9" x2="54" y2="9" stroke="rgba(255,255,255,0.45)" strokeWidth="0.6" />
    </svg>
  );
}
