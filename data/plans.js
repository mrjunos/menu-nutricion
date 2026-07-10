// Plan de ejemplo — datos genéricos para el modo anónimo (sin login).
// Los planes reales viven en Firestore (doc app/plans) y se cargan al iniciar sesión.
// meal.targets = totales por grupo — la medida que gobierna el plan.
// Cada comida tiene opciones A y B; la opción C se genera desde los favoritos
// con un alimento por grupo de `targets`.
// item: { grupo, porciones, foodId, gramosFijos?, nota? }
// variants[].deltas: { meal, grupo, delta, hint } — se aplica al slot más grande de ese grupo;
// variants[].skipMeals: comidas que no aplican ese día.

export const PROFILES = {
  demo: {
    nombre: 'Ejemplo',
    nombreCompleto: 'Perfil de ejemplo',
    fecha: '2026',
    objetivo: 'Plan de muestra — inicia sesión para ver un plan real, o úsalo como plantilla',
    stats: { edad: 30, peso: '68 kg', talla: '1,70 m', imc: '23,5', grasa: '18%', aks: '1,0' },
    baseLabel: 'Entreno',
    dayTypes: [
      { id: 'base',     label: 'Entreno',  icon: 'dia-pesas',    desc: 'Día con entrenamiento' },
      { id: 'descanso', label: 'Descanso', icon: 'dia-descanso', desc: 'Día sin entreno' },
    ],
    variants: {
      descanso: {
        deltas: [
          { meal: 'almuerzo', grupo: 'harinas', delta: -1, hint: '−1 harina en el almuerzo' },
          { meal: 'cena',     grupo: 'harinas', delta: -1, hint: '−1 harina en la cena' },
        ],
      },
    },
    meals: [
      {
        id: 'desayuno', label: 'Desayuno',
        targets: { harinas: 2, sustitutos: 3, grasas: 1 },
        A: [
          { grupo: 'harinas',    porciones: 2, foodId: 'pan-tajado' },
          { grupo: 'sustitutos', porciones: 2, foodId: 'huevo', nota: 'revueltos en 5g de aceite' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'queso-campesino' },
          { grupo: 'grasas',     porciones: 1, foodId: 'aceite-oliva', nota: 'para los huevos' },
        ],
        B: [
          { grupo: 'harinas',    porciones: 2, foodId: 'arepa-delgada' },
          { grupo: 'sustitutos', porciones: 2, foodId: 'huevo', nota: 'revueltos en 5g de aceite' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'quesito' },
          { grupo: 'grasas',     porciones: 1, foodId: 'mantequilla', nota: 'para los huevos' },
        ],
      },
      {
        id: 'almuerzo', label: 'Almuerzo',
        targets: { harinas: 3, carnes: 2, grasas: 2, verduras: 2 },
        A: [
          { grupo: 'carnes',   porciones: 2, foodId: 'pechuga', nota: 'en 5g de aceite' },
          { grupo: 'harinas',  porciones: 2, foodId: 'arroz-blanco' },
          { grupo: 'harinas',  porciones: 1, foodId: 'platano-amarillo', nota: 'cocido o asado' },
          { grupo: 'verduras', porciones: 2, foodId: 'mezcla-vegetal' },
          { grupo: 'grasas',   porciones: 1, foodId: 'aguacate', gramosFijos: 40 },
          { grupo: 'grasas',   porciones: 1, foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'carnes',   porciones: 2, foodId: 'res', nota: 'en 5g de aceite o mantequilla' },
          { grupo: 'harinas',  porciones: 2, foodId: 'papa-comun' },
          { grupo: 'harinas',  porciones: 1, foodId: 'arroz-blanco', nota: 'adicional' },
          { grupo: 'verduras', porciones: 2, foodId: 'mezcla-vegetal' },
          { grupo: 'grasas',   porciones: 1, foodId: 'vinagreta', nota: 'para la ensalada' },
          { grupo: 'grasas',   porciones: 1, foodId: 'mantequilla', nota: 'de la preparación' },
        ],
      },
      {
        id: 'mediaTarde', label: 'Media tarde',
        targets: { frutas: 2, harinas: 1, lacteos: 1 },
        A: [
          { grupo: 'lacteos', porciones: 1, foodId: 'yogurt-griego' },
          { grupo: 'harinas', porciones: 1, foodId: 'granola' },
          { grupo: 'frutas',  porciones: 2, foodId: 'banano' },
        ],
        B: [
          { grupo: 'lacteos', porciones: 1, foodId: 'yogurt' },
          { grupo: 'harinas', porciones: 1, foodId: 'avena-hojuelas' },
          { grupo: 'frutas',  porciones: 2, foodId: 'fresa' },
        ],
      },
      {
        id: 'cena', label: 'Cena',
        targets: { harinas: 2, carnes: 2, grasas: 1 },
        A: [
          { grupo: 'carnes',  porciones: 2, foodId: 'pechuga', nota: 'en 5g de aceite' },
          { grupo: 'harinas', porciones: 2, foodId: 'arroz-blanco', nota: 'o papa' },
          { grupo: 'grasas',  porciones: 1, foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'carnes',  porciones: 2, foodId: 'pescado', nota: 'en 5g de aceite' },
          { grupo: 'harinas', porciones: 2, foodId: 'pan-tajado' },
          { grupo: 'grasas',  porciones: 1, foodId: 'mantequilla', nota: 'de la preparación' },
        ],
      },
    ],
    info: {
      entreno: [
        'Este es un plan de muestra: los tiempos de comida, porciones y recomendaciones son un ejemplo genérico.',
        'Cardio: 6.000 – 8.000 pasos diarios como base de actividad.',
      ],
      recomendaciones: [
        'Asegurar 2 – 3 litros de agua durante el día.',
        'Se puede jugar con las porciones entre comidas; lo importante es cumplir las porciones diarias.',
        'No pasar más de 6 horas sin comer, en lo posible.',
        'Las carnes se pesan en crudo; el resto de alimentos en cocido.',
        'Pesar los alimentos mejora los resultados al ser más exactos.',
      ],
      suplementos: [
        { nombre: 'Creatina', dosis: '5g diarios con el primer vaso de agua del día', marcas: '' },
      ],
      consideraciones: [
        'Alimentos cocidos o asados, mínimamente fritos.',
        'Cada porción equivale a los gramos de la lista de intercambio; toca un alimento para sustituirlo por otro del mismo grupo.',
        'Si sales del plan, retómalo lo antes posible sin sensación de culpa — esto es un proceso.',
      ],
      comidaLibre: '1 comida libre cada 8 días',
    },
  },
};
