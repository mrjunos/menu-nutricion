// Sync con Firestore (Auth Google + tiempo real). Este módulo se importa de forma
// dinámica desde app.js solo si hay sesión previa o el usuario toca "Iniciar sesión",
// así el modo anónimo nunca descarga el SDK de Firebase.
//
// Modelo de datos (colección `app`, docs escritos siempre completos con setDoc —
// las claves de `overrides` contienen puntos y solo así se tratan como literales):
//   app/plans          { version, updatedAt, profiles: { juan: {...}, dahiana: {...} } }
//   app/prefs_<id>     { updatedAt, dayType, favorites, excluded, overrides, activeOption, shakeSeed, collapsed }
//   app/shared         { updatedAt, pesajeOverrides }
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut as fbSignOut,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {
  initializeFirestore, persistentLocalCache, collection, doc, setDoc, onSnapshot,
} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import { firebaseConfig } from './firebase-config.js';
import * as store from './storage.js';

const ALLOWED_EMAILS = ['jjcadu@gmail.com', 'dahiana.santiago11@gmail.com'];
const PUSH_DEBOUNCE_MS = 2500;
const PREFS_FIELDS = ['dayType', 'favorites', 'excluded', 'overrides', 'activeOption', 'shakeSeed', 'collapsed'];

let cbs = null;
let auth = null;
let db = null;
let unsub = null;
let pushTimer = null;
let ready = false;                 // ya llegó el primer snapshot → seguro hacer push
let lastRemote = {};               // { docId: stableJson } — último estado remoto conocido
const remoteProfileIds = new Set(); // perfiles que existen en Firestore (juan, dahiana)

export function isConfigured() {
  return firebaseConfig.apiKey !== 'TODO';
}

export function getUser() {
  return auth?.currentUser || null;
}

export function init(callbacks) {
  if (cbs) return;
  cbs = callbacks;
  const app = initializeApp(firebaseConfig);
  db = initializeFirestore(app, { localCache: persistentLocalCache() });
  auth = getAuth(app);
  auth.useDeviceLanguage();
  store.setCloudPush(schedulePush);
  onAuthStateChanged(auth, handleAuth);
}

export async function signIn() {
  try {
    await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (e) {
    if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') return;
    if (e.code === 'auth/popup-blocked') {
      throw new Error('El navegador bloqueó la ventana de Google. Habilita los popups para este sitio e intenta de nuevo.');
    }
    throw new Error(`No se pudo iniciar sesión (${e.code || e.message})`);
  }
}

// Logout pedido por el usuario: además de cerrar sesión, borra del dispositivo
// todo rastro del plan real (caché de planes y prefs de los perfiles remotos).
export async function signOutUser() {
  stopSync();
  const prefs = cbs.getPrefs();
  for (const id of remoteProfileIds) delete prefs.perProfile[id];
  remoteProfileIds.clear();
  store.persistLocal(prefs);
  store.clearPlansCache();
  store.setSession(false);
  await fbSignOut(auth);
}

// ---------- auth ----------

function handleAuth(user) {
  if (user && !ALLOWED_EMAILS.includes(user.email)) {
    rejectUser('Esta cuenta no tiene acceso a este plan.');
    return;
  }
  if (user) {
    store.setSession(true);
    startSync();
  } else {
    stopSync();
    store.setSyncStatus('off');
  }
  cbs.onAuth(user);
}

async function rejectUser(msg) {
  stopSync();
  store.clearPlansCache();
  store.setSession(false);
  await fbSignOut(auth); // dispara handleAuth(null)
  alert(msg);
}

// ---------- pull: snapshot en tiempo real ----------

function startSync() {
  if (unsub) return;
  store.setSyncStatus('syncing');
  unsub = onSnapshot(collection(db, 'app'), applySnapshot, (err) => {
    if (err.code === 'permission-denied') rejectUser('Esta cuenta no tiene acceso a este plan.');
    else store.setSyncStatus('error');
  });
}

function stopSync() {
  unsub?.();
  unsub = null;
  clearTimeout(pushTimer);
  ready = false;
  lastRemote = {};
}

function applySnapshot(snap) {
  const prefs = cbs.getPrefs();
  let prefsChanged = false;
  let anyChange = false;

  for (const change of snap.docChanges()) {
    const d = change.doc;
    if (d.metadata.hasPendingWrites) continue; // eco de una escritura propia
    const { updatedAt, ...data } = d.data();

    if (d.id === 'plans') {
      const s = stable(data.profiles || {});
      if (s !== lastRemote.plans) {
        lastRemote.plans = s;
        store.savePlansCache(data.profiles);
        for (const id of Object.keys(data.profiles || {})) remoteProfileIds.add(id);
        cbs.onPlans(data.profiles);
        anyChange = true;
      }
    } else if (d.id === 'shared') {
      const s = stable(data);
      lastRemote.shared = s;
      if (s !== stable({ pesajeOverrides: prefs.pesajeOverrides })) {
        prefs.pesajeOverrides = data.pesajeOverrides || {};
        prefsChanged = true;
      }
    } else if (d.id.startsWith('prefs_')) {
      const pid = d.id.slice('prefs_'.length);
      remoteProfileIds.add(pid);
      const s = stable(data);
      lastRemote[d.id] = s;
      const local = prefs.perProfile[pid];
      if (!local || s !== stable(prefsDoc(local))) {
        prefs.perProfile[pid] = { ...store.emptyProfilePrefs(), ...data };
        prefsChanged = true;
      }
    }
  }

  ready = true;
  if (prefsChanged) store.persistLocal(prefs);
  if (prefsChanged || anyChange) cbs.onRemote();
  store.setSyncStatus('ok');
  // flush de ediciones locales hechas antes de este snapshot (el dirty-check evita escrituras de más)
  schedulePush(prefs);
}

// ---------- push: escrituras con debounce y dirty-check por doc ----------

function schedulePush(prefs) {
  if (!auth.currentUser || !ready) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => push(prefs), PUSH_DEBOUNCE_MS);
}

async function push(prefs) {
  const writes = [];
  for (const pid of remoteProfileIds) {
    const slice = prefs.perProfile[pid];
    if (!slice) continue;
    const data = prefsDoc(slice);
    if (stable(data) !== lastRemote[`prefs_${pid}`]) writes.push([`prefs_${pid}`, data]);
  }
  const shared = { pesajeOverrides: prefs.pesajeOverrides };
  if (stable(shared) !== lastRemote.shared) writes.push(['shared', shared]);
  if (!writes.length) return;

  store.setSyncStatus('syncing');
  try {
    await Promise.all(writes.map(([id, data]) => setDoc(doc(db, 'app', id), { ...data, updatedAt: Date.now() })));
    for (const [id, data] of writes) lastRemote[id] = stable(data);
    store.setSyncStatus('ok');
  } catch (err) {
    if (err.code === 'permission-denied') rejectUser('Esta cuenta no tiene acceso a este plan.');
    else store.setSyncStatus('error');
  }
}

// ---------- helpers ----------

function prefsDoc(slice) {
  const out = {};
  for (const f of PREFS_FIELDS) out[f] = slice[f] ?? (f === 'dayType' ? 'base' : {});
  return out;
}

// JSON canónico (claves ordenadas) para comparar estado local vs remoto:
// Firestore no garantiza el orden de las claves de los mapas.
function stable(value) {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = sortKeys(value[k]);
    return out;
  }
  return value;
}
