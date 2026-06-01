# Bulletin Board

A digital cork bulletin board for sticky notes. Drag, pin, format, and sync across devices. Built with React + Vite + Tailwind, persisted to a separate GitHub data repo via a single Vercel serverless function.

## What you get

- **Multi-board** workspace with create / rename / delete
- **Paper sticky notes** in 6 pastel colors, drag with mouse or touch, slight tilt, pin or tape, curled corner, real shadows
- **Rich text** per note via Tiptap (Bold / Underline / bullet & numbered lists). 500-character unbroken strings stay inside the border.
- **Throw it away** — drag a note onto the trash for a crumple-and-toss delete (or use the X)
- **Sync** — instant `localStorage` + debounced PUT to a Vercel serverless function that reads/writes your data repo via the GitHub Contents API. Re-pulls on focus + every 30s
- **No token in the browser** — `GITHUB_TOKEN` lives only as a Vercel environment variable on the serverless function
- **Mobile-first** — touch drag, large tap targets, drawer nav, FAB to add notes
- **Export / Import JSON** as a manual backup
- `prefers-reduced-motion` respected for all animations

## Architecture

```
┌──────────────┐   PUT/GET    ┌─────────────────────┐   GitHub API   ┌────────────────┐
│  React app   │ ───────────► │  /api/data (Vercel) │ ─────────────► │  data repo     │
│  (this repo) │              │  serverless fn      │   token from   │  board-data.   │
│              │              │                     │   env only     │  json          │
└──────────────┘              └─────────────────────┘                └────────────────┘
       │
       └─ localStorage cache (instant render, debounced write)
```

Two repos:
- **This repo** — frontend + serverless function
- **Data repo** — a *separate* GitHub repo that stores `board-data.json`

## Deploy

### 1. Create the data repo

Make a new GitHub repo (private is fine, e.g. `my-board-data`) with a `main` branch. The file `board-data.json` will be created automatically on first save.

### 2. Create a GitHub token

In GitHub, create a fine-grained personal access token with **Contents: Read and write** for the data repo only.

### 3. Import into Vercel

- Connect this repo to Vercel
- Framework: Vite (auto-detected)
- Add these environment variables:

| Variable | Required | Default | Description |
|---|---|---|---|
| `GITHUB_TOKEN` | ✅ | — | The fine-grained PAT with write access to the data repo |
| `DATA_REPO_OWNER` | ✅ | — | GitHub username/org that owns the data repo |
| `DATA_REPO_NAME` | ✅ | — | Data repo name (e.g. `my-board-data`) |
| `DATA_FILE_PATH` | ❌ | `board-data.json` | Path of the JSON file inside the data repo |
| `DATA_BRANCH` | ❌ | `main` | Branch in the data repo |

- Deploy

The `GITHUB_TOKEN` should only be set as a **server-side** environment variable — never as `VITE_*` or `NEXT_PUBLIC_*`. The function reads it from `process.env`; the client never sees it.

## Local development

```bash
npm install
npm run dev
```

The dev server runs the frontend only. The `/api/data` function won't be reachable locally without the Vercel CLI (`npm i -g vercel && vercel dev`). Without it, the app still works locally — it falls back to `localStorage` and shows a sync error (which is the correct behavior).

## Build

```bash
npm install
npm run build
```

Output: `dist/` directory ready for any static host. Vercel reads `vercel.json` to wire the function and SPA fallback.

## File layout

```
.
├── api/
│   └── data.js              # serverless function (GET + PUT to data repo)
├── design-system/
│   └── bulletin-board/      # design tokens from ui-ux-pro-max skill
├── public/
│   └── favicon.svg
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── index.css
│   ├── components/
│   │   ├── CorkBoard.jsx
│   │   ├── Note.jsx
│   │   ├── EditorToolbar.jsx
│   │   ├── Pin.jsx
│   │   ├── Sidebar.jsx
│   │   ├── Trash.jsx
│   │   ├── SyncIndicator.jsx
│   │   └── ExportImport.jsx
│   ├── hooks/
│   │   ├── useBoards.js
│   │   └── useReducedMotion.js
│   └── lib/
│       ├── api.js
│       ├── debounce.js
│       ├── id.js
│       └── storage.js
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── vercel.json
└── vite.config.js
```

## Data format

Stored as `board-data.json`:

```json
{
  "version": 1,
  "updatedAt": "2026-06-01T20:00:00.000Z",
  "boards": [
    {
      "id": "…",
      "name": "My Board",
      "notes": [
        {
          "id": "…",
          "x": 120, "y": 80,
          "w": 200, "h": 200,
          "color": "yellow",
          "rotation": -2.4,
          "pin": "pin",
          "pinOffset": 4,
          "content": "<p>Hello world</p>",
          "createdAt": "…"
        }
      ]
    }
  ]
}
```

## Security notes

- The serverless function returns a generic `{ error: 'Sync failed' }` on errors; full details are only in server logs
- No token, no env values are ever returned to the client
- The client bundle has been grep-checked to confirm no `GITHUB_TOKEN` or env values appear in `dist/`

## License

MIT
