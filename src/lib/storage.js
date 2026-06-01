const STORAGE_KEY = 'bulletin-board:data:v1';
const ACTIVE_KEY = 'bulletin-board:activeBoardId:v1';

export const DATA_VERSION = 1;

export function emptyState() {
  return {
    version: DATA_VERSION,
    updatedAt: new Date(0).toISOString(),
    boards: []
  };
}

export function loadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!Array.isArray(parsed.boards)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocal(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota or private mode — ignore
  }
}

export function loadActiveBoardId() {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

export function saveActiveBoardId(id) {
  try {
    if (id) localStorage.setItem(ACTIVE_KEY, id);
    else localStorage.removeItem(ACTIVE_KEY);
  } catch { /* ignore */ }
}
