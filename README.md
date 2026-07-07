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

## Cómo funciona la persistencia

**Todo se guarda solo, al instante, en el navegador** (localStorage): favoritos, excluidos, sustituciones, tipo de día, opción A/B/C activa, pesajes corregidos, tema y toggle de detalle. No hay que "guardar" nada. Pero es *por navegador*: si borras datos del sitio o cambias de dispositivo, se pierde — para eso están las dos capas siguientes.

### Respaldo por archivo
Ajustes (⚙) → **Exportar JSON** descarga un archivo con todas las preferencias; **Importar JSON** lo restaura en cualquier navegador.

### Sync con GitHub Gist (recomendado)
Guarda las preferencias en un **gist secreto de tu cuenta de GitHub** y las sincroniza entre dispositivos:

1. Crea un token en https://github.com/settings/tokens → *Generate new token (classic)* → marca **solo** el scope `gist` → genera y copia el `ghp_...`. (Fine-grained también sirve: permiso de cuenta *Gists: Read and write*.)
2. En la app: ⚙ Ajustes → pega el token → **Conectar**. La app crea el gist secreto (o reutiliza el existente si ya conectaste otro dispositivo) y desde ahí **cada cambio se sube solo** (~3s después de tocarlo).
3. En otro dispositivo (ej. el teléfono de Dahiana): abrir la app → ⚙ → pegar **el mismo token** → Conectar. Detecta el gist existente y baja las preferencias; gana siempre la versión más reciente. Las preferencias de ambos perfiles viven en el mismo JSON, así que un solo gist sincroniza a los dos.
4. **Sincronizar ahora** fuerza una bajada manual (al abrir la app ya lo hace sola). El token vive solo en el localStorage del navegador — nunca en este repo.

### ¿Y `SEED_PREFS`?
`data/foods.js` → `SEED_PREFS` son los favoritos **iniciales**: solo aplican la primera vez que se abre la app en un navegador sin preferencias (ni locales ni de gist). Una vez usas la app, lo que manda es lo guardado — editar el seed no cambia nada en navegadores que ya tienen estado (para eso: ⚙ → Restablecer todo, o marcar favoritos desde la UI, que es lo normal). Las porciones y menús del nutricionista están en `data/plans.js`.

## Créditos

Iconos: [OpenMoji](https://openmoji.org) — CC BY-SA 4.0. Tipografía: [Barlow Condensed](https://fonts.google.com/specimen/Barlow+Condensed) (OFL). Datos: planes de I Daniel Nutrition.
