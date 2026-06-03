import React, { forwardRef } from 'react';

const Trash = forwardRef(function Trash({ active }, ref) {
  return (
    <div
      ref={ref}
      aria-label="Trash — drag a note here to delete"
      role="img"
      className={[
        'absolute bottom-4 right-4 sm:bottom-6 sm:right-6 z-30',
        'w-16 h-20 sm:w-20 sm:h-24',
        'flex items-end justify-center transition-transform duration-200',
        active ? 'scale-110' : 'scale-100'
      ].join(' ')}
      style={{ filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.45))' }}
    >
      <svg viewBox="0 0 80 96" className="w-full h-full" aria-hidden="true">
        <defs>
          <linearGradient id="trashBody" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="40%" stopColor="#6b6b6b" />
            <stop offset="60%" stopColor="#8c8c8c" />
            <stop offset="100%" stopColor="#3a3a3a" />
          </linearGradient>
          <linearGradient id="trashLid" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#2c2c2c" />
            <stop offset="50%" stopColor="#7a7a7a" />
            <stop offset="100%" stopColor="#2c2c2c" />
          </linearGradient>
        </defs>
        {/* shadow on board */}
        <ellipse cx="40" cy="92" rx="28" ry="3" fill="rgba(0,0,0,0.35)" />
        {/* body */}
        <path
          d="M14 26 L66 26 L62 90 Q62 92 60 92 L20 92 Q18 92 18 90 Z"
          fill="url(#trashBody)"
          stroke="rgba(0,0,0,0.35)"
          strokeWidth="0.6"
        />
        {/* ridges */}
        <line x1="28" y1="34" x2="30" y2="86" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        <line x1="40" y1="34" x2="40" y2="86" stroke="rgba(0,0,0,0.20)" strokeWidth="1" />
        <line x1="52" y1="34" x2="50" y2="86" stroke="rgba(0,0,0,0.18)" strokeWidth="1" />
        {/* lid */}
        <rect
          x="10"
          y={active ? '14' : '20'}
          width="60"
          height="10"
          rx="3"
          fill="url(#trashLid)"
          stroke="rgba(0,0,0,0.4)"
          strokeWidth="0.6"
          style={{ transition: 'y 180ms ease' }}
        />
        {/* handle */}
        <rect
          x="33"
          y={active ? '8' : '14'}
          width="14"
          height="4"
          rx="2"
          fill="#1c1c1c"
          style={{ transition: 'y 180ms ease' }}
        />
      </svg>
    </div>
  );
});

export default Trash;
