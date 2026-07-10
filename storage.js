// Persistencia: localStorage siempre; GitHub Gist secreto como sync opcional.
import { SEED_PREFS } from './data/foods.js';

const LS_KEY = 'menu-nutricion-prefs-v1';
const GIST_FILENAME = 'menu-nutricion-prefs.json';
const GIST_DESC = 'Preferencias — Menú Nutrición (I Daniel Nutrition)';

export function defaultPrefs() {
  const perProfile = {};
  for (const [id, seed] of Object.entries(SEED_PREFS)) {
    perProfile[id] = {
      dayType: 'base',
      favorites: structuredClone(seed.favorites || {}),
      excluded: structuredClone(seed.excluded || {}),
      overrides: {},      // { 'mealId.option.slotIndex': foodId }
      activeOption: {},   // { mealId: 'A'|'B'|'C' }
      shakeSeed: {},      // { mealId: number } — extra para el 🎲
      collapsed: {},      // { mealId: true } — comidas colapsadas en el menú
    };
  }
  return {
    version: 1,
    updatedAt: 0,
    activeProfile: 'juan',
    perProfile,
    pesajeOverrides: {},  // { foodId: 'crudo'|'cocido'|'tal-cual' }
    ui: { detalle: false, theme: 'system' },
    gist: { token: null, gistId: null },
  };
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultPrefs();
    const stored = JSON.parse(raw);
    // merge superficial sobre defaults para tolerar campos nuevos
    const base = defaultPrefs();
    const prefs = { ...base, ...stored };
    prefs.ui = { ...base.ui, ...(stored.ui || {}) };
    prefs.gist = { ...base.gist, ...(stored.gist || {}) };
    for (const id of Object.keys(base.perProfile)) {
      prefs.perProfile[id] = { ...base.perProfile[id], ...((stored.perProfile || {})[id] || {}) };
    }
    return prefs;
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs) {
  prefs.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  scheduleGistPush(prefs);
}

// ---------- Export / Import ----------

export function exportPrefs(prefs) {
  const blob = new Blob([JSON.stringify(prefs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `menu-nutricion-prefs-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importPrefsFile(file) {
  return file.text().then((text) => {
    const data = JSON.parse(text);
    if (!data.perProfile) throw new Error('El archivo no parece un backup válido');
    localStorage.setItem(LS_KEY, JSON.stringify(data));
    return loadPrefs();
  });
}

// ---------- GitHub Gist sync ----------

let pushTimer = null;
let syncStatus = 'off'; // off | syncing | ok | error
let onStatusChange = () => {};

export function setSyncStatusListener(fn) { onStatusChange = fn; }
export function getSyncStatus() { return syncStatus; }

function setStatus(s) { syncStatus = s; onStatusChange(s); }

function gistHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };
}

function scheduleGistPush(prefs) {
  if (!prefs.gist?.token || !prefs.gist?.gistId) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushToGist(prefs), 3000);
}

async function pushToGist(prefs) {
  const { token, gistId } = prefs.gist;
  if (!token || !gistId) return;
  setStatus('syncing');
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: gistHeaders(token),
      body: JSON.stringify({ files: { [GIST_FILENAME]: { content: JSON.stringify(prefs, null, 2) } } }),
    });
    setStatus(res.ok ? 'ok' : 'error');
  } catch {
    setStatus('error');
  }
}

// Conecta con un token: reutiliza el gist existente si el token ya tiene uno, o lo crea.
export async function connectGist(prefs, token) {
  setStatus('syncing');
  const headers = gistHeaders(token);
  // buscar un gist existente con nuestro archivo
  const listRes = await fetch('https://api.github.com/gists?per_page=100', { headers });
  if (!listRes.ok) { setStatus('error'); throw new Error(`Token inválido o sin permiso (HTTP ${listRes.status})`); }
  const gists = await listRes.json();
  const existing = gists.find((g) => g.files && g.files[GIST_FILENAME]);

  if (existing) {
    const fileRes = await fetch(existing.files[GIST_FILENAME].raw_url);
    const remote = await fileRes.json().catch(() => null);
    prefs.gist = { token, gistId: existing.id };
    if (remote && remote.updatedAt > prefs.updatedAt) {
      // gana el remoto: conservar credenciales y devolver el estado remoto
      remote.gist = { token, gistId: existing.id };
      localStorage.setItem(LS_KEY, JSON.stringify(remote));
      setStatus('ok');
      return { prefs: loadPrefs(), pulled: true };
    }
    savePrefs(prefs);
    setStatus('ok');
    return { prefs, pulled: false };
  }

  const createRes = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers,
    body: JSON.stringify({
      description: GIST_DESC,
      public: false,
      files: { [GIST_FILENAME]: { content: JSON.stringify(prefs, null, 2) } },
    }),
  });
  if (!createRes.ok) { setStatus('error'); throw new Error(`No se pudo crear el gist (HTTP ${createRes.status})`); }
  const gist = await createRes.json();
  prefs.gist = { token, gistId: gist.id };
  savePrefs(prefs);
  setStatus('ok');
  return { prefs, pulled: false };
}

// Al abrir la app: baja el gist y devuelve prefs remotas si son más recientes.
export async function pullFromGist(prefs) {
  const { token, gistId } = prefs.gist || {};
  if (!token || !gistId) return null;
  setStatus('syncing');
  try {
    const res = await fetch(`https://api.github.com/gists/${gistId}`, { headers: gistHeaders(token) });
    if (!res.ok) { setStatus('error'); return null; }
    const gist = await res.json();
    const file = gist.files?.[GIST_FILENAME];
    if (!file) { setStatus('error'); return null; }
    const content = file.truncated ? await (await fetch(file.raw_url)).text() : file.content;
    const remote = JSON.parse(content);
    setStatus('ok');
    if (remote.updatedAt > prefs.updatedAt) {
      remote.gist = { token, gistId };
      localStorage.setItem(LS_KEY, JSON.stringify(remote));
      return loadPrefs();
    }
    return null;
  } catch {
    setStatus('error');
    return null;
  }
}

export function disconnectGist(prefs) {
  prefs.gist = { token: null, gistId: null };
  savePrefs(prefs);
  setStatus('off');
}

export function resetAll() {
  localStorage.removeItem(LS_KEY);
}
