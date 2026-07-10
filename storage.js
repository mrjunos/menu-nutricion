// Persistencia: localStorage siempre (modo anónimo y caché del estado remoto).
// El sync con Firestore vive en firebase-sync.js, que se registra vía setCloudPush()
// — este módulo nunca importa Firebase, así el modo anónimo no descarga el SDK.
import { SEED_PREFS } from './data/foods.js';

const LS_KEY = 'menu-nutricion-prefs-v1';
const PLANS_CACHE_KEY = 'menu-nutricion-plans-cache-v1';

export function emptyProfilePrefs() {
  return {
    dayType: 'base',
    favorites: {},
    excluded: {},
    overrides: {},      // { 'mealId.option.slotIndex': foodId | [{foodId, porciones}] }
    activeOption: {},   // { mealId: 'A'|'B'|'C' }
    shakeSeed: {},      // { mealId: number } — extra para el 🎲
    collapsed: {},      // { mealId: true } — comidas colapsadas en el menú
  };
}

export function defaultPrefs() {
  const perProfile = {};
  for (const [id, seed] of Object.entries(SEED_PREFS)) {
    perProfile[id] = {
      ...emptyProfilePrefs(),
      favorites: structuredClone(seed.favorites || {}),
      excluded: structuredClone(seed.excluded || {}),
    };
  }
  return {
    version: 2,
    updatedAt: 0,
    activeProfile: Object.keys(SEED_PREFS)[0],
    perProfile,
    pesajeOverrides: {},  // { foodId: 'crudo'|'cocido'|'tal-cual' }
    ui: { detalle: false, theme: 'system' },
  };
}

export function loadPrefs() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultPrefs();
    const stored = JSON.parse(raw);
    delete stored.gist; // migración v1→v2: el sync por gist ya no existe
    // merge superficial sobre defaults para tolerar campos nuevos
    const base = defaultPrefs();
    const prefs = { ...base, ...stored };
    prefs.ui = { ...base.ui, ...(stored.ui || {}) };
    // unión de perfiles: los del seed demo + los que llegaron de Firestore
    const ids = new Set([...Object.keys(base.perProfile), ...Object.keys(stored.perProfile || {})]);
    prefs.perProfile = {};
    for (const id of ids) {
      prefs.perProfile[id] = { ...(base.perProfile[id] || emptyProfilePrefs()), ...((stored.perProfile || {})[id] || {}) };
    }
    return prefs;
  } catch {
    return defaultPrefs();
  }
}

export function savePrefs(prefs) {
  prefs.updatedAt = Date.now();
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  cloudPush?.(prefs);
}

// Guarda a localStorage SIN agendar push — para aplicar cambios que llegan de Firestore.
export function persistLocal(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

// ---------- caché local de planes remotos ----------

export function loadPlansCache() {
  try {
    return JSON.parse(localStorage.getItem(PLANS_CACHE_KEY))?.profiles || null;
  } catch {
    return null;
  }
}

export function savePlansCache(profiles) {
  localStorage.setItem(PLANS_CACHE_KEY, JSON.stringify({ profiles }));
}

export function clearPlansCache() {
  localStorage.removeItem(PLANS_CACHE_KEY);
}

// ---------- sesión cloud ----------
// Flag local de "hubo login": decide si el arranque carga el SDK de Firebase.

const SESSION_FLAG = 'menu-nutricion-session-v1';

export function hasSession() { return !!localStorage.getItem(SESSION_FLAG); }
export function setSession(on) {
  if (on) localStorage.setItem(SESSION_FLAG, '1');
  else localStorage.removeItem(SESSION_FLAG);
}

// ---------- hook del sync cloud (firebase-sync.js) ----------

let cloudPush = null;
export function setCloudPush(fn) { cloudPush = fn; }

let syncStatus = 'off'; // off | syncing | ok | error
let onStatusChange = () => {};

export function setSyncStatusListener(fn) { onStatusChange = fn; }
export function getSyncStatus() { return syncStatus; }
export function setSyncStatus(s) { syncStatus = s; onStatusChange(s); }

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

export function resetAll() {
  localStorage.removeItem(LS_KEY);
}
