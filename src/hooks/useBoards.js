import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { newId } from '../lib/id.js';
import { debounce } from '../lib/debounce.js';
import {
  DATA_VERSION,
  emptyState,
  loadActiveBoardId,
  loadLocal,
  saveActiveBoardId,
  saveLocal
} from '../lib/storage.js';
import { fetchRemote, pushRemote } from '../lib/api.js';

const PASTEL_COLORS = ['yellow', 'pink', 'blue', 'green', 'peach', 'lavender'];

function pickColor() {
  return PASTEL_COLORS[Math.floor(Math.random() * PASTEL_COLORS.length)];
}

function pickRotation() {
  return Math.round((Math.random() * 8 - 4) * 10) / 10;
}

function pickPin() {
  return Math.random() < 0.78 ? 'pin' : 'tape';
}

function makeBoard(name = 'Untitled board') {
  return { id: newId(), name, notes: [], connections: [] };
}

function makeNote({ x = 60, y = 60 } = {}) {
  return {
    id: newId(),
    x,
    y,
    w: 200,
    h: 200,
    color: pickColor(),
    rotation: pickRotation(),
    pin: pickPin(),
    pinOffset: Math.round(Math.random() * 40 - 20),
    content: '',
    createdAt: new Date().toISOString()
  };
}

function normalizeBoard(b) {
  return {
    id: b.id,
    name: b.name,
    notes: Array.isArray(b.notes) ? b.notes : [],
    connections: Array.isArray(b.connections) ? b.connections : []
  };
}

function withTouch(state) {
  return { ...state, updatedAt: new Date().toISOString() };
}

export const SYNC = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  OFFLINE: 'offline',
  ERROR: 'error'
};

export function useBoards() {
  const [state, setStateRaw] = useState(() => loadLocal() || emptyState());
  const [activeBoardId, setActiveBoardIdRaw] = useState(() => loadActiveBoardId());
  const [syncStatus, setSyncStatus] = useState(SYNC.IDLE);
  const [bootedFromRemote, setBootedFromRemote] = useState(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const pushAbortRef = useRef(null);
  const retryRef = useRef({ attempts: 0, timer: null });

  // ----- local persistence: debounced ~400ms -----
  const writeLocalDebounced = useMemo(
    () => debounce((s) => saveLocal(s), 400),
    []
  );
  useEffect(() => {
    writeLocalDebounced(state);
    return () => writeLocalDebounced.cancel();
  }, [state, writeLocalDebounced]);

  // ensure an active board exists once we have data
  useEffect(() => {
    if (state.boards.length === 0) {
      if (activeBoardId) setActiveBoardIdRaw(null);
      return;
    }
    const exists = state.boards.some((b) => b.id === activeBoardId);
    if (!exists) {
      setActiveBoardIdRaw(state.boards[0].id);
    }
  }, [state.boards, activeBoardId]);

  useEffect(() => {
    saveActiveBoardId(activeBoardId);
  }, [activeBoardId]);

  // ----- remote push: debounced ~1.5s -----
  const pushNow = useCallback(async (snapshot) => {
    if (pushAbortRef.current) pushAbortRef.current.abort();
    const ctrl = new AbortController();
    pushAbortRef.current = ctrl;
    setSyncStatus(SYNC.SYNCING);
    try {
      await pushRemote(snapshot, ctrl.signal);
      retryRef.current.attempts = 0;
      setSyncStatus(SYNC.SYNCED);
    } catch (err) {
      if (err.name === 'AbortError') return;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setSyncStatus(offline ? SYNC.OFFLINE : SYNC.ERROR);
      scheduleRetry(snapshot);
    }
  }, []);

  const scheduleRetry = useCallback((snapshot) => {
    clearTimeout(retryRef.current.timer);
    const attempt = Math.min(retryRef.current.attempts + 1, 6);
    retryRef.current.attempts = attempt;
    const delay = Math.min(2000 * 2 ** (attempt - 1), 60000);
    retryRef.current.timer = setTimeout(() => {
      pushNow(snapshot);
    }, delay);
  }, [pushNow]);

  const pushDebounced = useMemo(
    () => debounce((s) => pushNow(s), 1500),
    [pushNow]
  );

  // ----- main updater: wraps setState, bumps updatedAt, queues push -----
  const setState = useCallback((updater) => {
    setStateRaw((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const stamped = withTouch(next);
      pushDebounced(stamped);
      return stamped;
    });
  }, [pushDebounced]);

  // ----- remote pull -----
  const pullRemote = useCallback(async (signal) => {
    try {
      const { data } = await fetchRemote(signal);
      if (!data) return null;
      const remote = data;
      const local = stateRef.current;
      const remoteTime = Date.parse(remote.updatedAt || 0);
      const localTime = Date.parse(local.updatedAt || 0);
      if (Number.isFinite(remoteTime) && remoteTime > localTime) {
        const normalized = {
          ...remote,
          boards: Array.isArray(remote.boards) ? remote.boards.map(normalizeBoard) : []
        };
        setStateRaw(normalized);
        saveLocal(normalized);
        return normalized;
      }
      return null;
    } catch (err) {
      if (err.name === 'AbortError') return null;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      setSyncStatus(offline ? SYNC.OFFLINE : SYNC.ERROR);
      return null;
    }
  }, []);

  // initial pull after first paint
  useEffect(() => {
    const ctrl = new AbortController();
    setSyncStatus(SYNC.SYNCING);
    pullRemote(ctrl.signal).finally(() => {
      setBootedFromRemote(true);
      // if we pulled nothing, treat as synced (server has no data yet, that's fine)
      setSyncStatus((s) => (s === SYNC.SYNCING ? SYNC.SYNCED : s));
    });
    return () => ctrl.abort();
  }, [pullRemote]);

  // After the boot pull settles, if we still have zero boards, seed one.
  // Doing it here (not in App) avoids racing with remote pull and overriding remote data.
  useEffect(() => {
    if (!bootedFromRemote) return;
    if (stateRef.current.boards.length > 0) return;
    const b = makeBoard('My Board');
    setState((prev) => ({ ...prev, boards: [b] }));
    setActiveBoardIdRaw(b.id);
  }, [bootedFromRemote, setState]);

  // poll every 30s + on window focus
  useEffect(() => {
    if (!bootedFromRemote) return;
    let cancelled = false;
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const ctrl = new AbortController();
      pullRemote(ctrl.signal);
    }, 30000);
    const onFocus = () => {
      const ctrl = new AbortController();
      pullRemote(ctrl.signal);
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
    };
  }, [bootedFromRemote, pullRemote]);

  // online/offline indicator
  useEffect(() => {
    const updateOnline = () => {
      if (navigator.onLine) {
        setSyncStatus((s) => (s === SYNC.OFFLINE ? SYNC.SYNCING : s));
      } else {
        setSyncStatus(SYNC.OFFLINE);
      }
    };
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // ----- public actions -----
  const addBoard = useCallback((name) => {
    const b = makeBoard(name || `Board ${stateRef.current.boards.length + 1}`);
    setState((prev) => ({ ...prev, boards: [...prev.boards, b] }));
    setActiveBoardIdRaw(b.id);
    return b.id;
  }, [setState]);

  const renameBoard = useCallback((id, name) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => (b.id === id ? { ...b, name } : b))
    }));
  }, [setState]);

  const deleteBoard = useCallback((id) => {
    setState((prev) => {
      const boards = prev.boards.filter((b) => b.id !== id);
      return { ...prev, boards };
    });
    setActiveBoardIdRaw((cur) => {
      if (cur !== id) return cur;
      const next = stateRef.current.boards.find((b) => b.id !== id);
      return next ? next.id : null;
    });
  }, [setState]);

  const setActiveBoardId = useCallback((id) => {
    setActiveBoardIdRaw(id);
  }, []);

  const addNote = useCallback((boardId, opts) => {
    if (!boardId) return null;
    const n = makeNote(opts);
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id === boardId ? { ...b, notes: [...b.notes, n] } : b
      )
    }));
    return n.id;
  }, [setState]);

  const updateNote = useCallback((boardId, noteId, patch) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id !== boardId
          ? b
          : {
              ...b,
              notes: b.notes.map((n) => (n.id === noteId ? { ...n, ...patch } : n))
            }
      )
    }));
  }, [setState]);

  const deleteNote = useCallback((boardId, noteId) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id !== boardId
          ? b
          : {
              ...b,
              notes: b.notes.filter((n) => n.id !== noteId),
              connections: (b.connections || []).filter(
                (c) => c.from !== noteId && c.to !== noteId
              )
            }
      )
    }));
  }, [setState]);

  const addConnection = useCallback((boardId, fromNoteId, toNoteId) => {
    if (!boardId || !fromNoteId || !toNoteId || fromNoteId === toNoteId) return null;
    let createdId = null;
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) => {
        if (b.id !== boardId) return b;
        const existing = (b.connections || []).find(
          (c) =>
            (c.from === fromNoteId && c.to === toNoteId) ||
            (c.from === toNoteId && c.to === fromNoteId)
        );
        if (existing) return b;
        const conn = { id: newId(), from: fromNoteId, to: toNoteId };
        createdId = conn.id;
        return { ...b, connections: [...(b.connections || []), conn] };
      })
    }));
    return createdId;
  }, [setState]);

  const deleteConnection = useCallback((boardId, connectionId) => {
    setState((prev) => ({
      ...prev,
      boards: prev.boards.map((b) =>
        b.id !== boardId
          ? b
          : { ...b, connections: (b.connections || []).filter((c) => c.id !== connectionId) }
      )
    }));
  }, [setState]);

  const replaceState = useCallback((incoming) => {
    if (!incoming || !Array.isArray(incoming.boards)) return;
    const normalized = {
      version: DATA_VERSION,
      updatedAt: new Date().toISOString(),
      boards: incoming.boards.map(normalizeBoard)
    };
    setState(() => normalized);
  }, [setState]);

  const flushSync = useCallback(() => {
    pushDebounced.flush(stateRef.current);
  }, [pushDebounced]);

  return {
    state,
    activeBoardId,
    activeBoard: state.boards.find((b) => b.id === activeBoardId) || null,
    syncStatus,
    addBoard,
    renameBoard,
    deleteBoard,
    setActiveBoardId,
    addNote,
    updateNote,
    deleteNote,
    addConnection,
    deleteConnection,
    replaceState,
    flushSync
  };
}

export { PASTEL_COLORS };
