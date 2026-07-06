# Menú · Plan de alimentación

Web mobile-first para consultar los planes de alimentación de Juan y Dahiana (I Daniel Nutrition, 27/06/2026) como un menú del día calculado, en vez de PDFs.

- **Menú de hoy resuelto** al abrir, con selector de tipo de día (pesas/running, doble jornada, descanso; natación/5K, bici, 10K…). Las cantidades se recalculan con los deltas del plan.
- **Opciones A/B/C por comida**: A y B son las del nutricionista; C se sortea entre tus favoritos (botón 🎲 para variar).
- **Tap en cualquier alimento** → lista de intercambio del grupo con cantidades ya calculadas, favoritos ⭐ y excluidos.
- **Toggle 👁 detalle**: pesaje (crudo/cocido/tal cual), medidas caseras y porciones.
- **Persistencia sin backend**: localStorage + export/import JSON + sync opcional con GitHub Gist secreto (token con scope `gist`, se pega en Ajustes y vive solo en el navegador).

## Correr local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Sin build ni dependencias. Deploy: GitHub Pages sirviendo la raíz de `main`.

## Editar favoritos a mano

`data/foods.js` → `SEED_PREFS` (solo aplica en el primer uso, antes de que existan preferencias guardadas). Las porciones y menús del nutricionista están en `data/plans.js`.

## Créditos

Iconos: [OpenMoji](https://openmoji.org) — CC BY-SA 4.0. Tipografía: [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) (OFL). Datos: planes de I Daniel Nutrition.
