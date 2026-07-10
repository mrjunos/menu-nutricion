# Menú · Plan de alimentación

Web mobile-first para consultar un plan de alimentación por porciones como un menú del día calculado, en vez de PDFs.

- **Menú de hoy resuelto** al abrir, con selector de tipo de día (entreno, doble jornada, descanso…). Las cantidades se recalculan con los deltas del plan.
- **Opciones A/B/C por comida**: A y B son las del nutricionista; C se sortea entre tus favoritos (botón 🎲 para variar).
- **Tap en cualquier alimento** → lista de intercambio del grupo con cantidades ya calculadas, favoritos ⭐ y excluidos.
- **Toggle 👁 detalle**: pesaje (crudo/cocido/tal cual), medidas caseras y porciones.
- **Colapsar comidas**: tap en el encabezado de una comida (o su flecha) la colapsa para enfocarte en las demás; el estado se recuerda por perfil.
- **Dos modos de persistencia**: anónimo (localStorage + export/import JSON, con un plan de ejemplo) y con login de Google (los planes reales y las preferencias viven en Firestore y se sincronizan en tiempo real entre dispositivos autorizados).

## Correr local

```bash
python3 -m http.server 8080
# → http://localhost:8080
```

Sin build ni dependencias. Deploy: GitHub Pages sirviendo la raíz de `main`.

## Cómo funciona la persistencia

**Todo se guarda solo, al instante, en el navegador** (localStorage): favoritos, excluidos, sustituciones, tipo de día, opción A/B/C activa, pesajes corregidos, tema, toggle de detalle y comidas colapsadas. No hay que "guardar" nada.

### Modo anónimo
Sin iniciar sesión la app muestra un **plan de ejemplo** (`data/plans.js`) totalmente funcional. El estado vive solo en el navegador; Ajustes (⚙) → **Exportar/Importar JSON** sirve de respaldo entre navegadores.

### Con login de Google (Firestore)
⚙ Ajustes → **Iniciar sesión con Google**. Solo las cuentas autorizadas por las reglas de Firestore pueden leer/escribir; cualquier otra cuenta ve un aviso de "sin acceso". Al entrar:

- Se cargan los **planes reales** desde Firestore (no viven en este repo) y las preferencias compartidas.
- Cada cambio se sube solo (~3s) y llega **en tiempo real** a los demás dispositivos con sesión.
- El tema, el toggle de detalle y el perfil activo son por dispositivo (no se sincronizan).
- El SDK de Firebase se carga solo si hay sesión — un visitante anónimo no lo descarga.

La configuración del proyecto está en `firebase-config.js` (valores públicos por diseño; la seguridad son las reglas). El seed inicial de datos se hace una única vez con `seed/seed.html` (carpeta gitignored con los datos reales).

### ¿Y `SEED_PREFS`?
`data/foods.js` → `SEED_PREFS` son los favoritos **iniciales del perfil de ejemplo**: solo aplican la primera vez que se abre la app en un navegador sin preferencias. Una vez usas la app, lo que manda es lo guardado. Las porciones y menús del plan de ejemplo están en `data/plans.js`.

## Créditos

Iconos: [OpenMoji](https://openmoji.org) — CC BY-SA 4.0. Tipografía: [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) (OFL). Datos: planes de I Daniel Nutrition.
