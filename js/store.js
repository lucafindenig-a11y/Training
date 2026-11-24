// Persistenz: Jede Änderung wird sofort im Browser (localStorage) gesichert und kurz danach
// an den lokalen Server übertragen, der sie dauerhaft als Datei speichert.
// Ist der Server nicht erreichbar, bleiben die Daten im Browser und werden später nachgereicht.

import { emptyData, migrate } from './model.js';

const LS_KEY = 'trainingsplan.daten.v1';
const listeners = new Set();

export const store = {
  data: emptyData(),
  status: 'loading', // synced | saving | local | device | error
  serverAvailable: false,
  // 'device': App läuft ohne eigenen Server (z. B. als Handy-App über GitHub Pages) – Daten bleiben auf dem Gerät.
  deviceOnly: false,
  lastSavedAt: null,
  storageWarning: null,
};

let meta = { rev: 0, savedAt: null, dirty: false };
let pushTimer = null;
let retryTimer = null;
let pushing = false;
let pushAgain = false;

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(kind) {
  for (const fn of listeners) fn(kind);
}

function setStatus(status) {
  store.status = status;
  emit('status');
}

function readLocal() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocal() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...meta, deviceOnly: store.deviceOnly, data: store.data }));
    return true;
  } catch {
    return false;
  }
}

class NoServerError extends Error {}

// Antwortet die Adresse, aber ohne Daten-API (404/405/HTML), gibt es keinen eigenen Server.
async function fetchServer() {
  const r = await fetch('api/data', { cache: 'no-store' });
  const isJson = (r.headers.get('content-type') || '').includes('json');
  if (r.status === 404 || r.status === 405 || (r.ok && !isJson)) throw new NoServerError();
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

function idleStatus() {
  return store.deviceOnly ? 'device' : store.serverAvailable ? 'synced' : 'local';
}

export async function initStore() {
  const local = readLocal();
  store.deviceOnly = Boolean(local?.deviceOnly);
  let server = null;
  try {
    server = await fetchServer();
    store.serverAvailable = true;
    store.deviceOnly = false;
  } catch (err) {
    store.serverAvailable = false;
    if (err instanceof NoServerError) store.deviceOnly = true;
  }
  const serverHasData = Boolean(server?.data);
  const localNewer = local?.dirty && local.savedAt && (!server?.savedAt || local.savedAt > server.savedAt);

  if (serverHasData && !localNewer) {
    store.data = migrate(server.data);
    meta = { rev: server.rev, savedAt: server.savedAt, dirty: false };
    writeLocal();
  } else if (local?.data) {
    store.data = migrate(local.data);
    meta = { rev: local.rev ?? 0, savedAt: local.savedAt ?? null, dirty: Boolean(local.dirty) || (store.serverAvailable && !serverHasData) };
  } else {
    store.data = emptyData();
  }
  store.lastSavedAt = meta.savedAt;
  writeLocal();
  if (meta.dirty && store.serverAvailable) push();
  else setStatus(idleStatus());

  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshFromServer();
  });
  window.addEventListener('online', () => meta.dirty && !store.deviceOnly && push());
}

// Übernimmt Änderungen, die z. B. auf einem anderen Gerät gespeichert wurden.
async function refreshFromServer() {
  if (meta.dirty || pushing || store.deviceOnly) return;
  try {
    const server = await fetchServer();
    store.serverAvailable = true;
    if (server.data && server.rev !== meta.rev && (!meta.savedAt || server.savedAt > meta.savedAt)) {
      store.data = migrate(server.data);
      meta = { rev: server.rev, savedAt: server.savedAt, dirty: false };
      store.lastSavedAt = meta.savedAt;
      writeLocal();
      emit('data');
    }
    setStatus('synced');
  } catch {
    store.serverAvailable = false;
    setStatus('local');
  }
}

export function save() {
  meta.savedAt = new Date().toISOString();
  meta.dirty = true;
  store.lastSavedAt = meta.savedAt;
  const ok = writeLocal();
  store.storageWarning = ok ? null : 'Der Gerätespeicher des Browsers ist voll oder gesperrt – bitte Daten exportieren.';
  if (store.deviceOnly) {
    setStatus(ok ? 'device' : 'error');
    return;
  }
  clearTimeout(pushTimer);
  pushTimer = setTimeout(push, 300);
  setStatus('saving');
}

async function push() {
  if (pushing) {
    pushAgain = true;
    return;
  }
  pushing = true;
  clearTimeout(retryTimer);
  const savedAt = meta.savedAt;
  try {
    const r = await fetch('api/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ savedAt, data: store.data }),
    });
    if (r.status === 404 || r.status === 405) throw new NoServerError();
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const res = await r.json();
    meta.rev = res.rev;
    if (meta.savedAt === savedAt) meta.dirty = false;
    store.serverAvailable = true;
    writeLocal();
    setStatus(meta.dirty ? 'saving' : store.storageWarning ? 'error' : 'synced');
  } catch (err) {
    store.serverAvailable = false;
    if (err instanceof NoServerError) {
      store.deviceOnly = true;
      writeLocal();
    } else {
      retryTimer = setTimeout(() => meta.dirty && push(), 15000);
    }
    setStatus(store.storageWarning ? 'error' : idleStatus());
  } finally {
    pushing = false;
    if (pushAgain) {
      pushAgain = false;
      push();
    }
  }
}

export function replaceAllData(raw) {
  store.data = migrate(raw);
  save();
  emit('data');
}
