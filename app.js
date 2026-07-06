import { FOODS, GROUP_META, findFood, pesajeDe } from './data/foods.js';
import { PROFILES } from './data/plans.js';
import * as store from './storage.js';

let prefs = store.loadPrefs();
let view = 'menu'; // 'menu' | 'info'
const $app = document.getElementById('app');

// ---------- helpers ----------

const PESAJE_LABEL = { crudo: 'se pesa crudo', cocido: 'se pesa cocido', 'tal-cual': 'tal cual' };
const PESAJE_SHORT = { crudo: 'CRUDO', cocido: 'COCIDO', 'tal-cual': 'TAL CUAL' };

function profilePrefs() { return prefs.perProfile[prefs.activeProfile]; }
function profile() { return PROFILES[prefs.activeProfile]; }

function pesajeFinal(food) {
  return prefs.pesajeOverrides[food.id] || pesajeDe(food);
}

function fmtPorciones(n) { return Number.isInteger(n) ? n : String(n).replace('.', ','); }

function fmtCantidad(food, porciones, gramosFijos) {
  const total = gramosFijos ?? Math.round(food.gramos * porciones);
  const unidad = food.unidad || 'g';
  return `${total}${unidad}`;
}

function fmtMedida(food, porciones, gramosFijos) {
  if (gramosFijos) return food.medida ? `${food.medida} aprox.` : '';
  if (porciones === 1) return food.medida;
  return `${food.medida} ×${fmtPorciones(porciones)}`;
}

// PRNG determinístico por día para la opción C
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// ---------- cálculo del menú ----------

function candidatesFor(group, pp) {
  const excluded = new Set(pp.excluded[group] || []);
  const favs = (pp.favorites[group] || []).filter((id) => !excluded.has(id));
  if (favs.length) return favs;
  return FOODS[group].filter((f) => !excluded.has(f.id)).map((f) => f.id);
}

function buildOptionC(meal, pp) {
  // misma estructura de slots que la opción A, alimentos sorteados entre favoritos
  const day = new Date().toISOString().slice(0, 10);
  const extra = pp.shakeSeed[meal.id] || 0;
  const rnd = mulberry32(hashStr(`${prefs.activeProfile}|${day}|${meal.id}|${extra}`));
  const usedByGroup = {};
  return meal.A.map((slot) => {
    const pool = candidatesFor(slot.grupo, pp);
    const used = (usedByGroup[slot.grupo] ||= new Set());
    let avail = pool.filter((id) => !used.has(id));
    if (!avail.length) avail = pool;
    const foodId = avail[Math.floor(rnd() * avail.length)] || slot.foodId;
    used.add(foodId);
    return { grupo: slot.grupo, porciones: slot.porciones, foodId };
  });
}

function resolveMeal(meal, option) {
  const pp = profilePrefs();
  let items = option === 'C' ? buildOptionC(meal, pp) : (meal[option] || meal.A);
  // overrides por slot
  items = items.map((it, i) => {
    const ov = pp.overrides[`${meal.id}.${option}.${i}`];
    if (ov && findFood(ov)) {
      return { grupo: it.grupo, porciones: it.porciones, foodId: ov, nota: it.nota };
    }
    return { ...it };
  });
  // deltas del tipo de día
  const variant = profile().variants?.[pp.dayType];
  const hints = [];
  if (variant) {
    for (const d of variant.deltas) {
      if (d.meal !== meal.id) continue;
      hints.push(d.hint);
      // aplicar al slot más grande de ese grupo
      let idx = -1, max = -1;
      items.forEach((it, i) => { if (it.grupo === d.grupo && it.porciones > max) { max = it.porciones; idx = i; } });
      if (idx >= 0) {
        const it = items[idx];
        const nuevo = it.porciones + d.delta;
        delete it.gramosFijos; // recalcular desde porciones
        if (nuevo <= 0) items.splice(idx, 1);
        else it.porciones = nuevo;
      } else if (d.delta > 0) {
        const pool = candidatesFor(d.grupo, pp);
        items.push({ grupo: d.grupo, porciones: d.delta, foodId: pool[0] });
      }
    }
  }
  // resolver alimentos
  const resolved = items.map((it, i) => {
    const food = findFood(it.foodId) || { id: it.foodId, nombre: it.foodId, gramos: 0, group: it.grupo };
    return { ...it, slotIndex: i, food };
  });
  return { items: resolved, hints };
}

// ---------- render ----------

const SVG = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M6.7 6.7C3.6 8.8 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.5 5-1.2M10.6 5.1c.5-.1.9-.1 1.4-.1 6.5 0 10 7 10 7s-.6 1.2-1.8 2.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v3m0 16v3M4.2 4.2l2.1 2.1m11.4 11.4 2.1 2.1M1 12h3m16 0h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/></svg>',
  dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  starO: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>',
  ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
};

function icon(food) {
  const name = food.icon || GROUP_META[food.group]?.icon || 'harinas';
  return `<img class="fi" src="icons/${name}.svg" alt="" loading="lazy">`;
}

function render() {
  const p = profile();
  const pp = profilePrefs();
  document.documentElement.dataset.profile = prefs.activeProfile;

  $app.innerHTML = `
    <header class="hdr">
      <div class="hdr-top">
        <div class="brand">
          <span class="brand-kicker">Plan de alimentación</span>
          <h1 class="brand-name">${p.nombre}</h1>
        </div>
        <div class="hdr-actions">
          <button class="iconbtn ${prefs.ui.detalle ? 'on' : ''}" data-action="detalle" title="Mostrar detalle (crudo/cocido, medidas)">${prefs.ui.detalle ? SVG.eye : SVG.eyeOff}</button>
          <button class="iconbtn" data-action="theme" title="Tema">${currentTheme() === 'dark' ? SVG.moon : SVG.sun}</button>
          <button class="iconbtn" data-action="settings" title="Ajustes">${SVG.gear}</button>
        </div>
      </div>
      <div class="profile-switch" role="tablist">
        ${Object.entries(PROFILES).map(([id, pr]) => `
          <button class="pill profile-pill ${id === prefs.activeProfile ? 'active' : ''}" data-action="profile" data-id="${id}">${pr.nombre}</button>
        `).join('')}
      </div>
      <div class="daytypes">
        ${p.dayTypes.map((d) => `
          <button class="daytype ${d.id === pp.dayType ? 'active' : ''}" data-action="daytype" data-id="${d.id}" title="${d.desc}">
            <img src="icons/${d.icon}.svg" alt="">
            <span>${d.label}</span>
          </button>
        `).join('')}
      </div>
      ${variantNotas()}
    </header>
    <main class="${view === 'info' ? 'view-info' : 'view-menu'}">
      ${view === 'menu' ? renderMenu() : renderInfo()}
    </main>
    <nav class="tabbar">
      <button class="tab ${view === 'menu' ? 'active' : ''}" data-action="view" data-id="menu">Menú</button>
      <button class="tab ${view === 'info' ? 'active' : ''}" data-action="view" data-id="info">Info</button>
    </nav>
    <div id="sheet-root"></div>
  `;
}

function variantNotas() {
  const v = profile().variants?.[profilePrefs().dayType];
  if (!v?.notas?.length) return '';
  return `<div class="variant-notas">${v.notas.map((n) => `<p>• ${n}</p>`).join('')}</div>`;
}

function renderMenu() {
  const p = profile();
  return p.meals.map((meal) => {
    const pp = profilePrefs();
    const option = pp.activeOption[meal.id] || 'A';
    const { items, hints } = resolveMeal(meal, option);
    return `
      <section class="meal card" data-meal="${meal.id}">
        <div class="meal-head">
          <h2>${meal.label}</h2>
          <div class="meal-tools">
            <div class="opts">
              ${['A', 'B', 'C'].map((o) => `<button class="opt ${o === option ? 'active' : ''}" data-action="option" data-meal="${meal.id}" data-id="${o}">${o}</button>`).join('')}
            </div>
            <button class="iconbtn sm" data-action="shake" data-meal="${meal.id}" title="Variar (baraja tus favoritos)">${SVG.dice}</button>
          </div>
        </div>
        ${hints.length ? `<div class="hints">${hints.map((h) => `<span class="hint">${h}</span>`).join('')}</div>` : ''}
        <ul class="slots">
          ${items.map((it) => renderSlot(meal, option, it)).join('')}
        </ul>
      </section>
    `;
  }).join('');
}

function renderSlot(meal, option, it) {
  const { food } = it;
  const cantidad = fmtCantidad(food, it.porciones, it.gramosFijos);
  const detalle = prefs.ui.detalle ? `
    <div class="slot-detail">
      <span class="badge pesaje-${pesajeFinal(food)}">${PESAJE_SHORT[pesajeFinal(food)]}</span>
      <span>${fmtMedida(food, it.porciones, it.gramosFijos)}</span>
      <span class="dot">·</span>
      <span>${fmtPorciones(it.porciones)} ${GROUP_META[it.grupo].label.toLowerCase()}</span>
    </div>` : '';
  return `
    <li class="slot" data-action="open-sheet" data-meal="${meal.id}" data-option="${option}" data-slot="${it.slotIndex}" data-group="${it.grupo}" data-porciones="${it.porciones}">
      ${icon(food)}
      <div class="slot-main">
        <div class="slot-line"><b class="qty">${cantidad}</b> <span class="fname">${food.nombre}</span></div>
        ${it.nota ? `<div class="slot-nota">${it.nota}</div>` : ''}
        ${food.nota && !it.nota ? `<div class="slot-nota">${food.nota}</div>` : ''}
        ${detalle}
      </div>
      <span class="chev">›</span>
    </li>
  `;
}

function renderInfo() {
  const p = profile();
  const i = p.info;
  return `
    <section class="card info-card">
      <h2>${p.nombreCompleto}</h2>
      <p class="objetivo">${p.objetivo}</p>
      <div class="stats">
        ${Object.entries({ Edad: p.stats.edad, Peso: p.stats.peso, Talla: p.stats.talla, IMC: p.stats.imc, '% Grasa': p.stats.grasa, AKS: p.stats.aks }).map(([k, v]) => `
          <div class="stat"><span class="stat-v">${v}</span><span class="stat-k">${k}</span></div>`).join('')}
      </div>
      <p class="plan-fecha">Plan del ${p.fecha} · ${p.baseLabel}</p>
    </section>
    <section class="card"><h3>🍔 Comida libre</h3><p>${i.comidaLibre}.</p></section>
    <section class="card"><h3>🏋️ Entreno sugerido</h3><ul class="info-list">${i.entreno.map((t) => `<li>${t}</li>`).join('')}</ul></section>
    <section class="card"><h3>✅ Recomendaciones</h3><ul class="info-list">${i.recomendaciones.map((t) => `<li>${t}</li>`).join('')}</ul></section>
    <section class="card"><h3>💊 Suplementación</h3>
      <ul class="supps">${i.suplementos.map((s) => `
        <li><b>${s.nombre}</b><span>${s.dosis}</span>${s.marcas ? `<span class="marcas">Marcas: ${s.marcas}</span>` : ''}</li>`).join('')}
      </ul>
    </section>
    <section class="card"><h3>📋 Consideraciones</h3><ul class="info-list">${i.consideraciones.map((t) => `<li>${t}</li>`).join('')}</ul></section>
  `;
}

// ---------- bottom sheet: sustitución ----------

function openSheet({ meal, option, slot, group, porciones }) {
  const pp = profilePrefs();
  const favs = pp.favorites[group] || [];
  const excl = pp.excluded[group] || [];
  const isLeguminosaCombo = group === 'harinas';
  const foods = [...FOODS[group], ...(isLeguminosaCombo ? FOODS.leguminosas.map((f) => ({ ...f, _grupo: 'leguminosas' })) : [])];

  const rank = (f) => (excl.includes(f.id) ? 2 : favs.includes(f.id) ? 0 : 1);
  const sorted = [...foods].sort((a, b) => rank(a) - rank(b) || a.nombre.localeCompare(b.nombre, 'es'));
  const visibles = sorted.filter((f) => rank(f) < 2);
  const excluidos = sorted.filter((f) => rank(f) === 2);

  const row = (f) => {
    const fWithGroup = { ...f, group: f._grupo || group };
    const pes = pesajeFinal(fWithGroup);
    return `
      <li class="sheet-row ${favs.includes(f.id) ? 'fav' : ''} ${excl.includes(f.id) ? 'excl' : ''}" data-food="${f.id}">
        <button class="row-main" data-action="pick" data-food="${f.id}">
          ${icon(fWithGroup)}
          <span class="row-info">
            <span class="row-line"><b class="qty">${fmtCantidad(f, porciones)}</b> ${f.nombre}${f._grupo ? ' <small>(leguminosa)</small>' : ''}</span>
            <span class="row-sub">${fmtMedida(f, porciones)}</span>
          </span>
        </button>
        <button class="badge pesaje-${pes} tappable" data-action="pesaje" data-food="${f.id}" title="Tocar para corregir">${PESAJE_SHORT[pes]}</button>
        <button class="iconbtn sm ${favs.includes(f.id) ? 'on' : ''}" data-action="fav" data-food="${f.id}">${favs.includes(f.id) ? SVG.star : SVG.starO}</button>
        <button class="iconbtn sm danger ${excl.includes(f.id) ? 'on' : ''}" data-action="excl" data-food="${f.id}">${SVG.ban}</button>
      </li>`;
  };

  document.getElementById('sheet-root').innerHTML = `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet" data-meal="${meal}" data-option="${option}" data-slot="${slot}" data-group="${group}" data-porciones="${porciones}">
      <div class="sheet-grip"></div>
      <div class="sheet-head">
        <h3>${GROUP_META[group].label} <small>· ${fmtPorciones(porciones)} porcion${porciones === 1 ? '' : 'es'}</small></h3>
        <button class="iconbtn sm" data-action="close-sheet">${SVG.x}</button>
      </div>
      <ul class="sheet-list">
        ${visibles.map(row).join('')}
        ${excluidos.length ? `
          <li class="excl-sep"><button class="linkbtn" data-action="toggle-excl">No me gustan (${excluidos.length}) ▾</button></li>
          <div class="excl-block" hidden>${excluidos.map(row).join('')}</div>` : ''}
      </ul>
    </div>`;
  requestAnimationFrame(() => document.querySelector('.sheet')?.classList.add('open'));
}

function closeSheet() {
  const s = document.querySelector('.sheet');
  if (!s) return;
  s.classList.remove('open');
  setTimeout(() => { document.getElementById('sheet-root').innerHTML = ''; }, 220);
}

// ---------- ajustes ----------

function openSettings() {
  const g = prefs.gist;
  document.getElementById('sheet-root').innerHTML = `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet" id="settings">
      <div class="sheet-grip"></div>
      <div class="sheet-head"><h3>Ajustes</h3><button class="iconbtn sm" data-action="close-sheet">${SVG.x}</button></div>
      <div class="settings-body">
        <h4>Respaldo local</h4>
        <div class="btnrow">
          <button class="btn" data-action="export">Exportar JSON</button>
          <label class="btn">Importar JSON<input type="file" accept=".json" id="import-file" hidden></label>
        </div>
        <h4>Sync con GitHub Gist</h4>
        <p class="help">Pega un token de GitHub con permiso <code>gist</code>. Tus preferencias se guardan en un gist secreto de tu cuenta y se sincronizan entre dispositivos. <span id="sync-status" class="sync-${store.getSyncStatus()}">${syncLabel()}</span></p>
        ${g.token
          ? `<div class="btnrow"><button class="btn" data-action="sync-now">Sincronizar ahora</button><button class="btn danger" data-action="gist-disconnect">Desconectar</button></div>`
          : `<div class="btnrow token-row"><input type="password" id="gist-token" class="input" placeholder="ghp_... o github_pat_..."><button class="btn primary" data-action="gist-connect">Conectar</button></div>`}
        <h4>Peligro</h4>
        <div class="btnrow"><button class="btn danger" data-action="reset">Restablecer todo</button></div>
        <p class="help">v1 · datos del plan del ${profile().fecha} · hecho con ♥ para Juan y Dahiana</p>
      </div>
    </div>`;
  requestAnimationFrame(() => document.querySelector('.sheet')?.classList.add('open'));
}

function syncLabel() {
  return { off: 'Sin conectar', syncing: 'Sincronizando…', ok: 'Sincronizado ✓', error: 'Error de sync ✗' }[store.getSyncStatus()];
}

// ---------- tema ----------

function currentTheme() {
  if (prefs.ui.theme !== 'system') return prefs.ui.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const t = currentTheme();
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', t === 'dark' ? '#0b1220' : '#f4f2ec');
}

// ---------- eventos ----------

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const a = el.dataset.action;
  const pp = profilePrefs();

  if (a === 'profile') { prefs.activeProfile = el.dataset.id; store.savePrefs(prefs); render(); }
  else if (a === 'daytype') { pp.dayType = el.dataset.id; store.savePrefs(prefs); render(); }
  else if (a === 'view') { view = el.dataset.id; render(); }
  else if (a === 'detalle') { prefs.ui.detalle = !prefs.ui.detalle; store.savePrefs(prefs); render(); }
  else if (a === 'theme') {
    prefs.ui.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    store.savePrefs(prefs); applyTheme(); render();
  }
  else if (a === 'option') { pp.activeOption[el.dataset.meal] = el.dataset.id; store.savePrefs(prefs); render(); }
  else if (a === 'shake') {
    const m = el.dataset.meal;
    pp.activeOption[m] = 'C';
    pp.shakeSeed[m] = (pp.shakeSeed[m] || 0) + 1;
    store.savePrefs(prefs); render();
    document.querySelector(`[data-meal="${m}"] .slots`)?.classList.add('shaken');
  }
  else if (a === 'open-sheet') {
    const d = el.dataset;
    openSheet({ meal: d.meal, option: d.option, slot: +d.slot, group: d.group, porciones: +d.porciones });
  }
  else if (a === 'close-sheet') closeSheet();
  else if (a === 'settings') openSettings();
  else if (a === 'toggle-excl') {
    const block = document.querySelector('.excl-block');
    if (block) block.hidden = !block.hidden;
  }
  else if (a === 'pick') {
    const sheet = el.closest('.sheet');
    const { meal, option, slot } = sheet.dataset;
    pp.overrides[`${meal}.${option}.${slot}`] = el.dataset.food;
    store.savePrefs(prefs); closeSheet(); render();
  }
  else if (a === 'fav' || a === 'excl') {
    const sheet = el.closest('.sheet');
    const group = sheet.dataset.group;
    const id = el.dataset.food;
    const food = findFood(id);
    const realGroup = food?.group || group;
    const list = a === 'fav' ? (pp.favorites[realGroup] ||= []) : (pp.excluded[realGroup] ||= []);
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    if (a === 'excl' && i < 0) { // excluir quita de favoritos
      const favs = pp.favorites[realGroup] || [];
      const fi = favs.indexOf(id); if (fi >= 0) favs.splice(fi, 1);
    }
    store.savePrefs(prefs);
    const d = sheet.dataset;
    openSheet({ meal: d.meal, option: d.option, slot: +d.slot, group: d.group, porciones: +d.porciones });
    document.querySelector('.sheet')?.classList.add('open');
  }
  else if (a === 'pesaje') {
    const id = el.dataset.food;
    const food = findFood(id);
    const order = ['crudo', 'cocido', 'tal-cual'];
    const next = order[(order.indexOf(pesajeFinal(food)) + 1) % order.length];
    if (next === pesajeDe(food)) delete prefs.pesajeOverrides[id];
    else prefs.pesajeOverrides[id] = next;
    store.savePrefs(prefs);
    el.className = `badge pesaje-${next} tappable`;
    el.textContent = PESAJE_SHORT[next];
  }
  else if (a === 'export') store.exportPrefs(prefs);
  else if (a === 'reset') {
    if (confirm('¿Borrar todas las preferencias y volver al estado inicial?')) {
      store.resetAll(); prefs = store.loadPrefs(); closeSheet(); applyTheme(); render();
    }
  }
  else if (a === 'gist-connect') {
    const token = document.getElementById('gist-token')?.value.trim();
    if (!token) return;
    el.textContent = 'Conectando…'; el.disabled = true;
    try {
      const r = await store.connectGist(prefs, token);
      prefs = r.prefs;
      closeSheet(); applyTheme(); render();
      openSettings();
    } catch (err) {
      alert(err.message);
      el.textContent = 'Conectar'; el.disabled = false;
    }
  }
  else if (a === 'gist-disconnect') { store.disconnectGist(prefs); closeSheet(); openSettings(); }
  else if (a === 'sync-now') {
    const updated = await store.pullFromGist(prefs);
    if (updated) { prefs = updated; applyTheme(); render(); }
    closeSheet(); openSettings();
  }
});

document.addEventListener('change', async (e) => {
  if (e.target.id === 'import-file' && e.target.files?.[0]) {
    try {
      prefs = await store.importPrefsFile(e.target.files[0]);
      closeSheet(); applyTheme(); render();
    } catch (err) { alert(`No se pudo importar: ${err.message}`); }
  }
});

matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (prefs.ui.theme === 'system') { applyTheme(); render(); }
});

store.setSyncStatusListener(() => {
  const el = document.getElementById('sync-status');
  if (el) { el.textContent = syncLabel(); el.className = `sync-${store.getSyncStatus()}`; }
});

// ---------- init ----------

applyTheme();
render();
store.pullFromGist(prefs).then((updated) => {
  if (updated) { prefs = updated; applyTheme(); render(); }
});
