import React from 'react';
import { SYNC } from '../hooks/useBoards.js';

const LABELS = {
  [SYNC.IDLE]: 'Idle',
  [SYNC.SYNCING]: 'Syncing',
  [SYNC.SYNCED]: 'Synced',
  [SYNC.OFFLINE]: 'Offline',
  [SYNC.ERROR]: 'Sync error'
};

const COLORS = {
  [SYNC.IDLE]: 'bg-gray-400',
  [SYNC.SYNCING]: 'bg-amber-400',
  [SYNC.SYNCED]: 'bg-emerald-500',
  [SYNC.OFFLINE]: 'bg-gray-500',
  [SYNC.ERROR]: 'bg-red-500'
};

export default function SyncIndicator({ status }) {
  const label = LABELS[status] || 'Idle';
  const color = COLORS[status] || 'bg-gray-400';
  const spinning = status === SYNC.SYNCING;
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-black/40 text-white text-xs sm:text-sm font-medium border border-white/10 backdrop-blur"
    >
      <span aria-hidden className={[
        'w-2.5 h-2.5 rounded-full',
        color,
        spinning ? 'animate-pulse-soft' : ''
      ].join(' ')} />
      <span>{label}</span>
    </div>
  );
}
