import { FOODS, GROUP_META, findFood, pesajeDe } from './data/foods.js';
import { PROFILES } from './data/plans.js';
import { groupNoun, resolveMeal, applyDistribution, shakeMeal } from './logic.js';
import * as store from './storage.js';

let prefs = store.loadPrefs();
let view = 'menu'; // 'menu' | 'info'
let resolvedCache = {}; // { mealId: { option, items } } — líneas del último render
let sheetCtx = null;    // { mealId, option, line, mode: 'pick'|'split', split: {foodId: porciones} }
const $app = document.getElementById('app');

// ---------- helpers ----------

const PESAJE_LABEL = { crudo: 'se pesa crudo', cocido: 'se pesa cocido', 'tal-cual': 'tal cual' };
const PESAJE_SHORT = { crudo: 'CRUDO', cocido: 'COCIDO', 'tal-cual': 'TAL CUAL' };

const today = () => new Date().toISOString().slice(0, 10);

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

// ---------- render ----------

const SVG = {
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 2 20 20"/><path d="M6.7 6.7C3.6 8.8 2 12 2 12s3.5 7 10 7c1.9 0 3.6-.5 5-1.2M10.6 5.1c.5-.1.9-.1 1.4-.1 6.5 0 10 7 10 7s-.6 1.2-1.8 2.6"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>',
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
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
  const pp = profilePrefs();
  const skip = new Set(p.variants?.[pp.dayType]?.skipMeals || []);
  resolvedCache = {};
  return p.meals.filter((meal) => !skip.has(meal.id)).map((meal) => {
    const option = pp.activeOption[meal.id] || 'A';
    const { items, hints } = resolveMeal(p, meal, option, pp, prefs.activeProfile, today());
    resolvedCache[meal.id] = { option, items };
    const targetsTxt = Object.entries(meal.targets)
      .map(([g, n]) => `${fmtPorciones(n)} ${groupNoun(g, n)}`).join(' · ');
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
        ${prefs.ui.detalle ? `<div class="meal-targets">${targetsTxt}</div>` : ''}
        ${hints.length ? `<div class="hints">${hints.map((h) => `<span class="hint" title="${h.title}">${h.text}</span>`).join('')}</div>` : ''}
        <ul class="slots">
          ${items.map((it, li) => renderSlot(meal, option, it, li)).join('')}
        </ul>
      </section>
    `;
  }).join('');
}

function renderSlot(meal, option, it, lineIndex) {
  const { food } = it;
  const unidad = food.unidad || 'g';
  const esAprox = it.gramos !== Math.round(food.gramos * it.porciones);
  const detalle = prefs.ui.detalle ? `
    <div class="slot-detail">
      <span class="badge pesaje-${pesajeFinal(food)}">${PESAJE_SHORT[pesajeFinal(food)]}</span>
      <span>${fmtMedida(food, it.porciones, esAprox ? it.gramos : undefined)}</span>
      <span class="dot">·</span>
      <span>${fmtPorciones(it.porciones)} ${groupNoun(it.grupo, it.porciones)}</span>
    </div>` : '';
  return `
    <li class="slot" data-action="open-sheet" data-meal="${meal.id}" data-line="${lineIndex}">
      ${icon(food)}
      <div class="slot-main">
        <div class="slot-line"><b class="qty">${it.gramos}${unidad}</b> <span class="fname">${food.nombre}</span></div>
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

function sheetFoods(group, pp) {
  const favs = pp.favorites[group] || [];
  const excl = pp.excluded[group] || [];
  const foods = [...FOODS[group], ...(group === 'harinas' ? FOODS.leguminosas.map((f) => ({ ...f, _grupo: 'leguminosas' })) : [])];
  const rank = (f) => (excl.includes(f.id) ? 2 : favs.includes(f.id) ? 0 : 1);
  const sorted = [...foods].sort((a, b) => rank(a) - rank(b) || a.nombre.localeCompare(b.nombre, 'es'));
  return { favs, excl, visibles: sorted.filter((f) => rank(f) < 2), excluidos: sorted.filter((f) => rank(f) === 2) };
}

function sheetListHtml() {
  const pp = profilePrefs();
  const { line, split, mode } = sheetCtx;
  const group = line.grupo;
  const porciones = line.porciones;
  const { favs, excl, visibles, excluidos } = sheetFoods(group, pp);

  if (mode === 'split') {
    const step = Number.isInteger(porciones) ? 1 : 0.5;
    return visibles.map((f) => {
      const n = split[f.id] || 0;
      const fWithGroup = { ...f, group: f._grupo || group };
      return `
        <li class="sheet-row split ${n ? 'picked' : ''}" data-food="${f.id}">
          <span class="row-main">
            ${icon(fWithGroup)}
            <span class="row-info">
              <span class="row-line"><b class="qty">${n ? fmtCantidad(f, n) : '—'}</b> ${f.nombre}${f._grupo ? ' <small>(leguminosa)</small>' : ''}</span>
              <span class="row-sub">${n ? fmtMedida(f, n) : `${f.medida} por porción`}</span>
            </span>
          </span>
          <span class="stepper">
            <button class="stepbtn" data-action="step" data-food="${f.id}" data-dir="${-step}" ${n <= 0 ? 'disabled' : ''}>−</button>
            <b>${fmtPorciones(n)}</b>
            <button class="stepbtn" data-action="step" data-food="${f.id}" data-dir="${step}">+</button>
          </span>
        </li>`;
    }).join('');
  }

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
  return `
    ${visibles.map(row).join('')}
    ${excluidos.length ? `
      <li class="excl-sep"><button class="linkbtn" data-action="toggle-excl">No me gustan (${excluidos.length}) ▾</button></li>
      <div class="excl-block" hidden>${excluidos.map(row).join('')}</div>` : ''}`;
}

function sheetFooterHtml() {
  if (sheetCtx.mode !== 'split') return '';
  const total = sheetCtx.line.porciones;
  const suma = Object.values(sheetCtx.split).reduce((s, n) => s + n, 0);
  const listo = Math.abs(suma - total) < 1e-9;
  return `
    <div class="sheet-footer">
      <span class="suma ${listo ? 'ok' : ''}">Suma ${fmtPorciones(suma)} de ${fmtPorciones(total)}</span>
      <button class="btn primary" data-action="apply-dist" ${listo ? '' : 'disabled'}>Aplicar</button>
    </div>`;
}

function openSheet(animate = true) {
  const { line, mode } = sheetCtx;
  const group = line.grupo;
  document.getElementById('sheet-root').innerHTML = `
    <div class="sheet-backdrop" data-action="close-sheet"></div>
    <div class="sheet ${animate ? '' : 'open'}">
      <div class="sheet-grip"></div>
      <div class="sheet-head">
        <h3>${GROUP_META[group].label} <small>· ${fmtPorciones(line.porciones)} porcion${line.porciones === 1 ? '' : 'es'}</small></h3>
        <div class="sheet-head-tools">
          ${line.porciones > 1 ? `<button class="btn sm-btn ${mode === 'split' ? 'primary' : ''}" data-action="toggle-split">${mode === 'split' ? 'Elegir uno' : '⥂ Repartir'}</button>` : ''}
          <button class="iconbtn sm" data-action="close-sheet">${SVG.x}</button>
        </div>
      </div>
      <ul class="sheet-list">${sheetListHtml()}</ul>
      ${sheetFooterHtml()}
    </div>`;
  if (animate) requestAnimationFrame(() => document.querySelector('.sheet')?.classList.add('open'));
}

function refreshSheetBody() {
  const list = document.querySelector('.sheet-list');
  if (!list) return;
  list.innerHTML = sheetListHtml();
  document.querySelector('.sheet-footer')?.remove();
  document.querySelector('.sheet')?.insertAdjacentHTML('beforeend', sheetFooterHtml());
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
    shakeMeal(pp, m);
    store.savePrefs(prefs); render();
    document.querySelector(`[data-meal="${m}"] .slots`)?.classList.add('shaken');
  }
  else if (a === 'open-sheet') {
    const { meal, line } = el.dataset;
    const cached = resolvedCache[meal];
    const ln = cached?.items[+line];
    if (!ln) return;
    sheetCtx = { mealId: meal, option: cached.option, line: ln, mode: 'pick', split: { [ln.foodId]: ln.porciones } };
    openSheet();
  }
  else if (a === 'close-sheet') { sheetCtx = null; closeSheet(); }
  else if (a === 'toggle-split') {
    sheetCtx.mode = sheetCtx.mode === 'split' ? 'pick' : 'split';
    sheetCtx.split = { [sheetCtx.line.foodId]: sheetCtx.line.porciones };
    openSheet(false);
  }
  else if (a === 'step') {
    const { food, dir } = el.dataset;
    const total = sheetCtx.line.porciones;
    const suma = Object.values(sheetCtx.split).reduce((s, n) => s + n, 0);
    const delta = +dir;
    if (delta > 0 && suma + delta > total + 1e-9) return; // no pasarse del total
    const n = Math.max(0, (sheetCtx.split[food] || 0) + delta);
    if (n === 0) delete sheetCtx.split[food]; else sheetCtx.split[food] = n;
    refreshSheetBody();
  }
  else if (a === 'apply-dist') {
    const { mealId, option, line, split } = sheetCtx;
    const meal = profile().meals.find((m) => m.id === mealId);
    const dist = Object.entries(split).map(([foodId, porciones]) => ({ foodId, porciones }));
    applyDistribution(meal, option, line, dist, pp, prefs.activeProfile, today());
    store.savePrefs(prefs); sheetCtx = null; closeSheet(); render();
  }
  else if (a === 'settings') openSettings();
  else if (a === 'toggle-excl') {
    const block = document.querySelector('.excl-block');
    if (block) block.hidden = !block.hidden;
  }
  else if (a === 'pick') {
    // reemplazo completo de la línea = distribución de un solo alimento
    const { mealId, option, line } = sheetCtx;
    const meal = profile().meals.find((m) => m.id === mealId);
    applyDistribution(meal, option, line, [{ foodId: el.dataset.food, porciones: line.porciones }], pp, prefs.activeProfile, today());
    store.savePrefs(prefs); sheetCtx = null; closeSheet(); render();
  }
  else if (a === 'fav' || a === 'excl') {
    const id = el.dataset.food;
    const food = findFood(id);
    const realGroup = food?.group || sheetCtx.line.grupo;
    const list = a === 'fav' ? (pp.favorites[realGroup] ||= []) : (pp.excluded[realGroup] ||= []);
    const i = list.indexOf(id);
    if (i >= 0) list.splice(i, 1); else list.push(id);
    if (a === 'excl' && i < 0) { // excluir quita de favoritos
      const favs = pp.favorites[realGroup] || [];
      const fi = favs.indexOf(id); if (fi >= 0) favs.splice(fi, 1);
    }
    store.savePrefs(prefs);
    openSheet(false);
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
