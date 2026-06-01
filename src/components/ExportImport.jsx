import React, { useRef } from 'react';

export default function ExportImport({ state, onImport }) {
  const fileRef = useRef(null);

  const onExport = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `bulletin-board-${ts}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || !Array.isArray(parsed.boards)) {
          alert('That file does not look like a bulletin board export.');
          return;
        }
        if (!confirm('Replace all current boards with the imported data?')) return;
        onImport?.(parsed);
      } catch {
        alert('Could not read that file as JSON.');
      } finally {
        if (fileRef.current) fileRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onExport}
        className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm border border-white/15 focus-ring transition-colors"
      >
        Export
      </button>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm border border-white/15 focus-ring transition-colors"
      >
        Import
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json"
        className="sr-only"
        onChange={onPick}
      />
    </div>
  );
}
