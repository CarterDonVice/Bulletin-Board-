import React from 'react';

function Btn({ active, onPointerDown, children, label }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={!!active}
      onPointerDown={(e) => {
        // prevent editor blur
        e.preventDefault();
        onPointerDown?.(e);
      }}
      className={[
        'min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-md',
        'text-[15px] font-semibold transition-colors duration-150',
        'focus-ring',
        active
          ? 'bg-ink text-white'
          : 'bg-white/85 text-ink hover:bg-white'
      ].join(' ')}
    >
      {children}
    </button>
  );
}

export default function EditorToolbar({ editor }) {
  if (!editor) return null;
  return (
    <div
      role="toolbar"
      aria-label="Note formatting"
      onPointerDown={(e) => e.stopPropagation()}
      className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-1.5 py-1 rounded-xl shadow-xl bg-ink/95 backdrop-blur-sm border border-white/10"
      style={{ boxShadow: '0 8px 20px rgba(0,0,0,0.45), 0 2px 4px rgba(0,0,0,0.30)' }}
    >
      <Btn
        label="Bold"
        active={editor.isActive('bold')}
        onPointerDown={() => editor.chain().focus().toggleBold().run()}
      >
        <span className="font-bold">B</span>
      </Btn>
      <Btn
        label="Underline"
        active={editor.isActive('underline')}
        onPointerDown={() => editor.chain().focus().toggleUnderline().run()}
      >
        <span className="underline underline-offset-2">U</span>
      </Btn>
      <span aria-hidden className="mx-0.5 w-px h-5 bg-white/20" />
      <Btn
        label="Bulleted list"
        active={editor.isActive('bulletList')}
        onPointerDown={() => editor.chain().focus().toggleBulletList().run()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="4" r="1.2" />
          <circle cx="3" cy="8" r="1.2" />
          <circle cx="3" cy="12" r="1.2" />
          <rect x="6" y="3.3" width="8" height="1.4" rx="0.5" />
          <rect x="6" y="7.3" width="8" height="1.4" rx="0.5" />
          <rect x="6" y="11.3" width="8" height="1.4" rx="0.5" />
        </svg>
      </Btn>
      <Btn
        label="Numbered list"
        active={editor.isActive('orderedList')}
        onPointerDown={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <text x="0.5" y="5.5" fontSize="4.2" fontWeight="700" fontFamily="system-ui">1.</text>
          <text x="0.5" y="9.8" fontSize="4.2" fontWeight="700" fontFamily="system-ui">2.</text>
          <text x="0.5" y="14.1" fontSize="4.2" fontWeight="700" fontFamily="system-ui">3.</text>
          <rect x="6" y="3.3" width="8" height="1.4" rx="0.5" />
          <rect x="6" y="7.3" width="8" height="1.4" rx="0.5" />
          <rect x="6" y="11.3" width="8" height="1.4" rx="0.5" />
        </svg>
      </Btn>
    </div>
  );
}
