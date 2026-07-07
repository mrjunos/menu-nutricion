// Lógica pura del menú (sin DOM) — usada por app.js y testeable desde node.
import { FOODS, GROUP_META, findFood } from './data/foods.js';

export const GROUP_SINGULAR = {
  harinas: 'harina', leguminosas: 'leguminosa', sustitutos: 'sustituto', carnes: 'carne',
  lacteos: 'lácteo', frutas: 'fruta', verduras: 'verdura', grasas: 'grasa', nueces: 'nuez', azucares: 'azúcar',
};

// "1 harina" / "2 harinas" / "1,5 carnes"
export function groupNoun(grupo, n) {
  return n === 1 ? GROUP_SINGULAR[grupo] : GROUP_META[grupo].label.toLowerCase();
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

export function candidatesFor(group, pp) {
  const excluded = new Set(pp.excluded[group] || []);
  const favs = (pp.favorites[group] || []).filter((id) => !excluded.has(id));
  if (favs.length) return favs;
  return FOODS[group].filter((f) => !excluded.has(f.id)).map((f) => f.id);
}

// un alimento por grupo de meal.targets ("Tiempos de comida"), sorteado entre favoritos
export function buildOptionC(meal, pp, profileId, day) {
  const extra = pp.shakeSeed[meal.id] || 0;
  const rnd = mulberry32(hashStr(`${profileId}|${day}|${meal.id}|${extra}`));
  return Object.entries(meal.targets).map(([grupo, porciones]) => {
    const pool = candidatesFor(grupo, pp);
    const foodId = pool[Math.floor(rnd() * pool.length)];
    return { grupo, porciones, foodId };
  });
}

// slots base de una opción: los items de A/B, o los targets para C
export function baseSlots(meal, option, pp, profileId, day) {
  if (option === 'C') return buildOptionC(meal, pp, profileId, day);
  return meal[option] || meal.A;
}

export function resolveMeal(profileData, meal, option, pp, profileId, day) {
  const base = baseSlots(meal, option, pp, profileId, day);
  // expandir overrides por slot: string = todo el slot; array = distribución [{foodId, porciones}]
  const items = [];
  base.forEach((it, i) => {
    const ov = pp.overrides[`${meal.id}.${option}.${i}`];
    if (Array.isArray(ov)) {
      let asignado = 0;
      for (const part of ov) {
        if (!findFood(part.foodId) || !(part.porciones > 0)) continue;
        items.push({ grupo: it.grupo, porciones: part.porciones, foodId: part.foodId, slotIndex: i });
        asignado += part.porciones;
      }
      if (asignado < it.porciones) items.push({ ...it, porciones: it.porciones - asignado, slotIndex: i });
    } else if (typeof ov === 'string' && findFood(ov)) {
      items.push({ grupo: it.grupo, porciones: it.porciones, foodId: ov, nota: it.nota, slotIndex: i });
    } else {
      items.push({ ...it, slotIndex: i });
    }
  });
  // deltas del tipo de día
  const variant = profileData.variants?.[pp.dayType];
  const hints = [];
  if (variant) {
    for (const d of variant.deltas) {
      if (d.meal !== meal.id) continue;
      const signo = d.delta > 0 ? '+' : '−';
      hints.push({ text: `${signo}${Math.abs(d.delta)} ${groupNoun(d.grupo, Math.abs(d.delta))}`, title: d.hint });
      // aplicar al item más grande de ese grupo
      let idx = -1, max = -1;
      items.forEach((it, i) => { if (it.grupo === d.grupo && it.porciones > max) { max = it.porciones; idx = i; } });
      if (idx >= 0) {
        const it = items[idx];
        const nuevo = it.porciones + d.delta;
        delete it.gramosFijos; // recalcular desde porciones
        it._delta = (it._delta || 0) + d.delta;
        if (nuevo <= 0) items.splice(idx, 1);
        else it.porciones = nuevo;
      } else if (d.delta > 0) {
        const pool = candidatesFor(d.grupo, pp);
        items.push({ grupo: d.grupo, porciones: d.delta, foodId: pool[0], slotIndex: -1, _delta: d.delta });
      }
    }
  }
  // resolver alimentos y calcular gramos por item
  const resolved = items.map((it) => {
    const food = findFood(it.foodId) || { id: it.foodId, nombre: it.foodId, gramos: 0, group: it.grupo };
    const gramos = it.gramosFijos ?? Math.round(food.gramos * it.porciones);
    return { ...it, food, gramos };
  });
  // fusionar items del mismo alimento y grupo (ej. pan 2 + pan 1 → pan 3)
  const merged = [];
  for (const it of resolved) {
    const prev = merged.find((m) => m.foodId === it.foodId && m.grupo === it.grupo);
    if (prev) {
      prev.porciones += it.porciones;
      prev.gramos += it.gramos;
      if (!prev.slotIndexes.includes(it.slotIndex)) prev.slotIndexes.push(it.slotIndex);
      prev.deltaApplied += it._delta || 0;
      if (it.nota && !(prev.nota || '').includes(it.nota)) prev.nota = prev.nota ? `${prev.nota} · ${it.nota}` : it.nota;
    } else {
      merged.push({ ...it, slotIndexes: [it.slotIndex], deltaApplied: it._delta || 0 });
    }
  }
  return { items: merged, hints };
}

// Aplica una distribución elegida en la UI a la línea `line` (fusionada) de una comida.
// dist: [{foodId, porciones}] cuya suma == porciones mostradas de la línea (post-delta).
// Preserva las partes de OTRAS líneas que compartan slot y guarda en términos del día base.
export function applyDistribution(meal, option, line, dist, pp, profileId, day) {
  const queue = dist.filter((x) => x.porciones > 0).map((x) => ({ ...x }));
  if (!queue.length) return;
  // invertir el delta del día en la parte más grande (lo guardado es del día base)
  const delta = line.deltaApplied || 0;
  if (delta) {
    let idx = 0;
    queue.forEach((x, i) => { if (x.porciones > queue[idx].porciones) idx = i; });
    queue[idx].porciones -= delta;
    if (queue[idx].porciones <= 0) queue.splice(idx, 1);
  }
  const slots = baseSlots(meal, option, pp, profileId, day);
  for (const i of line.slotIndexes) {
    if (i < 0 || !slots[i]) continue; // item agregado por delta, sin slot base
    const key = `${meal.id}.${option}.${i}`;
    const ov = pp.overrides[key];
    const others = Array.isArray(ov) ? ov.filter((p) => p.foodId !== line.foodId && p.porciones > 0) : [];
    let cap = slots[i].porciones - others.reduce((s, p) => s + p.porciones, 0);
    const mine = [];
    while (cap > 0 && queue.length) {
      const q = queue[0];
      const take = Math.min(cap, q.porciones);
      const prev = mine.find((m) => m.foodId === q.foodId);
      if (prev) prev.porciones += take; else mine.push({ foodId: q.foodId, porciones: take });
      q.porciones -= take; cap -= take;
      if (q.porciones <= 0) queue.shift();
    }
    const full = [...others, ...mine];
    if (full.length === 1 && full[0].porciones === slots[i].porciones) {
      // un solo alimento cubre el slot completo → string (o nada si es el default)
      if (option !== 'C' && full[0].foodId === slots[i].foodId) delete pp.overrides[key];
      else pp.overrides[key] = full[0].foodId;
    } else if (full.length) {
      pp.overrides[key] = full;
    } else {
      delete pp.overrides[key];
    }
  }
}
