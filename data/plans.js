// Planes de alimentación — I Daniel Nutrition (27/06/2026).
// meal.targets = totales por grupo del apartado "Tiempos de comida" del PDF — la medida que gobierna el plan.
// Cada comida tiene opciones A y B literales del PDF ("Ejemplo de menú" y sus alternativas "O ...").
// La opción C se genera desde los favoritos con un alimento por grupo de `targets`.
// item: { grupo, porciones, foodId, gramosFijos?, nota? }
//   gramosFijos: cuando el nutricionista fija una cantidad distinta a porciones×gramos (ej. 40g de aguacate).
// variants[].deltas: { meal, grupo, delta, hint } — se aplica al slot más grande de ese grupo en la comida;
//   el chip visible se autogenera del delta (±N grupo) y `hint` (sugerencia literal del PDF) queda como tooltip.
// variants[].skipMeals: comidas que no aplican ese día (ej. pre entreno en descanso).

export const PROFILES = {
  juan: {
    nombre: 'Juan José',
    nombreCompleto: 'Juan José Cano Duque',
    fecha: '27/06/2026',
    objetivo: 'Aumento ligero de calorías para mejora del componente muscular',
    stats: { edad: 30, peso: '70,95 kg', talla: '1,77 m', imc: '22,6', grasa: '13,9%', aks: '1,1', sumatoria6p: '80 mm' },
    baseLabel: 'Pesas / Running',
    dayTypes: [
      { id: 'base',     label: 'Pesas · Run',   icon: 'dia-pesas',    desc: 'Día de pesas o running' },
      { id: 'doble',    label: 'Doble jornada', icon: 'dia-doble',    desc: 'Pesas y running el mismo día' },
      { id: 'descanso', label: 'Descanso',      icon: 'dia-descanso', desc: 'Día sin entreno' },
    ],
    variants: {
      doble: {
        deltas: [
          { meal: 'almuerzo', grupo: 'harinas', delta: 1, hint: '+80g de arroz o papa en almuerzo' },
          { meal: 'cena',     grupo: 'harinas', delta: 1, hint: '+1 tajada de pan o 80g de arroz en la cena' },
        ],
      },
      descanso: {
        deltas: [
          { meal: 'desayuno', grupo: 'harinas', delta: -1, hint: '−1 tajada de pan del desayuno' },
          { meal: 'almuerzo', grupo: 'harinas', delta: -1, hint: '−80g de arroz/papa en almuerzo' },
          { meal: 'cena',     grupo: 'harinas', delta: -1, hint: '−80g de arroz, 60g de plátano o 1 tajada de pan en la cena' },
        ],
      },
    },
    meals: [
      {
        id: 'desayuno', label: 'Desayuno',
        targets: { harinas: 3, sustitutos: 5, grasas: 2 },
        A: [
          { grupo: 'harinas',    porciones: 3, foodId: 'pan-tajado' },
          { grupo: 'sustitutos', porciones: 4, foodId: 'huevo', nota: 'revueltos en 5g de aceite de oliva' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'jamon-cerdo', nota: 'bajos en grasa' },
          { grupo: 'grasas',     porciones: 1, foodId: 'queso-crema' },
          { grupo: 'grasas',     porciones: 1, foodId: 'aceite-oliva', nota: 'para los huevos' },
        ],
        B: [
          { grupo: 'harinas',    porciones: 2, foodId: 'arepa-delgada', gramosFijos: 110, nota: '1 arepa gruesa' },
          { grupo: 'harinas',    porciones: 1, foodId: 'pan-tajado' },
          { grupo: 'sustitutos', porciones: 4, foodId: 'huevo', nota: 'revueltos en 5g de aceite de oliva' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'queso-campesino', nota: 'a tu elección' },
          { grupo: 'grasas',     porciones: 1, foodId: 'queso-crema' },
          { grupo: 'grasas',     porciones: 1, foodId: 'mantequilla', nota: 'para los huevos' },
        ],
      },
      {
        id: 'almuerzo', label: 'Almuerzo',
        targets: { harinas: 4, carnes: 2, grasas: 2, verduras: 2 },
        A: [
          { grupo: 'carnes',   porciones: 2, foodId: 'res', nota: 'en 5g de aceite de oliva o mantequilla' },
          { grupo: 'harinas',  porciones: 2, foodId: 'arroz-blanco' },
          { grupo: 'harinas',  porciones: 2, foodId: 'platano-amarillo', nota: 'cocido o asado' },
          { grupo: 'verduras', porciones: 2, foodId: 'mezcla-vegetal' },
          { grupo: 'grasas',   porciones: 1, foodId: 'aguacate', gramosFijos: 40 },
          { grupo: 'grasas',   porciones: 1, foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'carnes',   porciones: 2, foodId: 'pechuga', nota: 'en 5g de aceite de oliva o mantequilla' },
          { grupo: 'harinas',  porciones: 2, foodId: 'papa-comun' },
          { grupo: 'harinas',  porciones: 2, foodId: 'arroz-blanco', nota: 'adicionales' },
          { grupo: 'verduras', porciones: 2, foodId: 'mezcla-vegetal' },
          { grupo: 'grasas',   porciones: 1, foodId: 'vinagreta', nota: 'para la ensalada' },
          { grupo: 'grasas',   porciones: 1, foodId: 'mantequilla', nota: 'de la preparación' },
        ],
      },
      {
        id: 'mediaTarde', label: 'Media tarde',
        targets: { frutas: 2, harinas: 2, lacteos: 1 },
        A: [
          { grupo: 'lacteos', porciones: 1, foodId: 'yogurt-griego' },
          { grupo: 'harinas', porciones: 2, foodId: 'cereal' },
          { grupo: 'frutas',  porciones: 2, foodId: 'banano' },
        ],
        B: [
          { grupo: 'lacteos', porciones: 1, foodId: 'yogurt', nota: 'o kéfir' },
          { grupo: 'harinas', porciones: 2, foodId: 'avena-hojuelas' },
          { grupo: 'frutas',  porciones: 2, foodId: 'uvas' },
        ],
      },
      {
        id: 'cena', label: 'Cena',
        targets: { harinas: 4, carnes: 2, grasas: 1 },
        A: [
          { grupo: 'carnes',  porciones: 2, foodId: 'res', nota: 'en 5g de aceite de oliva o mantequilla' },
          { grupo: 'harinas', porciones: 4, foodId: 'platano-amarillo', nota: 'cocido o asado' },
          { grupo: 'grasas',  porciones: 1, foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'carnes',  porciones: 2, foodId: 'pechuga', nota: 'en 5g de aceite de oliva o mantequilla' },
          { grupo: 'harinas', porciones: 4, foodId: 'pan-tajado', nota: 'pan blanco' },
          { grupo: 'grasas',  porciones: 1, foodId: 'mantequilla', nota: 'de la preparación' },
        ],
      },
    ],
    info: {
      entreno: [
        'Pesas: mínimo 4 sesiones de entreno de fuerza por semana.',
        'Cardio: 6.000 – 8.000 pasos diarios.',
        'Running: 3 días de trabajo — (1) día sencillo a baja intensidad (ritmo que permita conversar), (2) día de intervalos o prueba de tiempo (ej: 400m rápido + 400m caminando/trotando, repetido; o la distancia planificada en el menor tiempo posible al 85-90%), (3) long run: 1.5 a 2 veces la distancia planificada a ritmo sencillo.',
      ],
      recomendaciones: [
        'Asegurar 2,5 – 3,2 litros de agua durante el día.',
        'El lácteo se puede intercambiar entre yogurt/kumis, leche semidescremada, yogurt griego y proteína whey.',
        'Se puede jugar con las porciones: pasar 1 harina del almuerzo a la media tarde, o un sustituto del desayuno a la cena. Lo importante es cumplir las porciones diarias.',
        'No pasar más de 6 horas sin comer, en lo posible.',
        'Solo 1 comida libre cada 8 días.',
        'Las carnes se pesan en crudo; el resto de alimentos en cocido.',
        'Se pueden usar alimentos integrales para mejorar la saciedad.',
        'Pesar los alimentos mejora los resultados al ser más exactos.',
      ],
      suplementos: [
        { nombre: 'Creatina', dosis: '8g diarios con el primer vaso de agua del día', marcas: 'Iron, Platinum Tech, Nutrex, Dymatize, Optimum Nutrition, Healthy Sports' },
        { nombre: 'Omega 3', dosis: '2000mg diarios (usualmente 2 cápsulas) con el desayuno', marcas: 'Integral Médica, Nutricost, NOW, Fish Omega 3' },
        { nombre: 'Glicinato de magnesio', dosis: '400mg diarios, 2 horas antes de dormir', marcas: 'Nutrabiotics, Nutricost, Life Extension' },
      ],
      consideraciones: [
        '1 grasa del desayuno, la grasa del almuerzo y 1 de la cena son la mantequilla o aceite de la preparación: 5g de mantequilla o 5ml de aceite (oliva o aguacate recomendados). El resto de grasas: aguacate, mantequilla o nueces de maní.',
        'Los carbohidratos son necesarios para el rendimiento, la masa muscular y la energía — no los disminuyas innecesariamente.',
        'Prioridad de consumo: 1) proteínas (sustitutos, carnes, lácteos), 2) carbohidratos (harinas), 3) frutas y verduras, 4) grasas.',
        'Alimentos cocidos o asados, mínimamente fritos.',
        'Comidas en la calle: hamburguesas artesanales, ensaladas compuestas o alimentos sin tantas salsas.',
        'Bebidas dietéticas (sparkling water, gaseosas cero, aguas saborizadas) sin sobrepasar 600ml diarios.',
        'Se pueden usar alimentos dietéticos (cacao sin azúcar, gelatina sin azúcar, endulzantes, sirope sin azúcar) para dar volumen o sabor.',
        'Si sales del plan, retómalo lo antes posible sin sensación de culpa — esto es un proceso.',
      ],
      comidaLibre: '1 comida libre cada 8 días',
    },
  },

  dahiana: {
    nombre: 'Dahiana',
    nombreCompleto: 'Dahiana Santiago Rodríguez',
    fecha: '27/06/2026',
    objetivo: 'Déficit calórico ligero para recomposición corporal manteniendo o mejorando rendimiento',
    stats: { edad: 30, peso: '60 kg', talla: '1,60 m', imc: '24,1', grasa: '19,3%', aks: '1,18', sumatoria6p: '103 mm' },
    baseLabel: 'Natación o 5K',
    dayTypes: [
      { id: 'base',     label: 'Natación · 5K', icon: 'dia-natacion', desc: 'Día de natación o 5K' },
      { id: 'doble',    label: 'Doble sesión',  icon: 'dia-doble',    desc: 'Cardiovascular + full body' },
      { id: 'bici',     label: 'Bici 30-40km',  icon: 'dia-bici',     desc: 'Sesión de bicicleta' },
      { id: 'diez-k',   label: '10K',           icon: 'dia-natacion', desc: 'Carrera de 10K' },
      { id: 'descanso', label: 'Descanso · FB', icon: 'dia-descanso', desc: 'Solo full body o descanso' },
    ],
    variants: {
      doble: {
        deltas: [
          { meal: 'almuerzo',   grupo: 'harinas', delta: 1, hint: '+1 harina en almuerzo (66g plátano o 80g arroz)' },
          { meal: 'mediaTarde', grupo: 'harinas', delta: 1, hint: '+1 harina en media tarde o cena (25g avena / 80g arroz / 22g pan)' },
        ],
      },
      bici: {
        deltas: [
          { meal: 'almuerzo',   grupo: 'harinas', delta: 1, hint: '+1 harina en almuerzo (66g plátano o 80g arroz)' },
          { meal: 'mediaTarde', grupo: 'harinas', delta: 1, hint: '+1 harina en media tarde o cena (25g avena / 80g arroz / 22g pan)' },
        ],
        notas: [
          'Usar un gel solo de carbohidratos a la mitad de la sesión.',
          'Bebida rehidratante con carbohidratos al finalizar (Gatorade o Powerade).',
          'Bebida hidratante sin carbohidratos durante toda la sesión.',
        ],
      },
      'diez-k': {
        deltas: [
          { meal: 'almuerzo',   grupo: 'harinas', delta: 1, hint: '+1 harina en almuerzo (66g plátano o 80g arroz)' },
          { meal: 'mediaTarde', grupo: 'harinas', delta: 1, hint: '+1 harina en media tarde (25g de avena)' },
          { meal: 'cena',       grupo: 'harinas', delta: 1, hint: '+1 harina en cena (80g arroz o 22g pan)' },
        ],
      },
      descanso: {
        skipMeals: ['preEntreno'],
        deltas: [
          { meal: 'desayuno', grupo: 'harinas', delta: -1, hint: '−1 harina del desayuno (22g pan o 55g arepa)' },
          { meal: 'cena',     grupo: 'harinas', delta: -1, hint: '−1 harina de la cena (22g pan o 80g arroz)' },
        ],
      },
    },
    meals: [
      {
        id: 'preEntreno', label: 'Pre entreno',
        targets: { harinas: 1, azucares: 1 },
        A: [
          { grupo: 'harinas',  porciones: 1, foodId: 'pan-tajado' },
          { grupo: 'azucares', porciones: 1, foodId: 'miel' },
        ],
        B: [
          { grupo: 'harinas',  porciones: 1, foodId: 'galletas', nota: 'galletas de arroz' },
          { grupo: 'azucares', porciones: 1, foodId: 'mermelada' },
        ],
      },
      {
        id: 'desayuno', label: 'Desayuno',
        targets: { harinas: 2, sustitutos: 3, grasas: 1 },
        A: [
          { grupo: 'harinas',    porciones: 1, foodId: 'arepa-delgada' },
          { grupo: 'harinas',    porciones: 1, foodId: 'pan-tajado' },
          { grupo: 'sustitutos', porciones: 2, foodId: 'huevo', nota: 'revueltos o estrellados en 5g de aceite o mantequilla' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'quesito' },
          { grupo: 'grasas',     porciones: 1, foodId: 'aceite-oliva', nota: 'para los huevos' },
        ],
        B: [
          { grupo: 'harinas',    porciones: 1, foodId: 'pan-tajado' },
          { grupo: 'harinas',    porciones: 1, foodId: 'galletas' },
          { grupo: 'sustitutos', porciones: 2, foodId: 'huevo', nota: 'revueltos o estrellados en 5g de aceite o mantequilla' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'quesito' },
          { grupo: 'grasas',     porciones: 1, foodId: 'mantequilla', nota: 'para los huevos' },
        ],
      },
      {
        id: 'almuerzo', label: 'Almuerzo',
        targets: { harinas: 2, carnes: 1.5, grasas: 2, verduras: 2 },
        A: [
          { grupo: 'carnes',   porciones: 1.5, foodId: 'pechuga', nota: 'o pescado, en 5ml de aceite' },
          { grupo: 'harinas',  porciones: 2,   foodId: 'arroz-blanco' },
          { grupo: 'verduras', porciones: 2,   foodId: 'mezcla-vegetal', nota: 'escoge al menos 2: zanahoria, tomate cherry, mix de lechugas' },
          { grupo: 'grasas',   porciones: 1,   foodId: 'aguacate', gramosFijos: 40, nota: '1/4 de aguacate' },
          { grupo: 'grasas',   porciones: 1,   foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'carnes',   porciones: 1.5, foodId: 'res', nota: 'asada, en 5ml de aceite' },
          { grupo: 'harinas',  porciones: 2,   foodId: 'papa-comun' },
          { grupo: 'verduras', porciones: 2,   foodId: 'mezcla-vegetal', nota: 'escoge al menos 2: zanahoria, tomate cherry, mix de lechugas' },
          { grupo: 'grasas',   porciones: 1,   foodId: 'aguacate', gramosFijos: 40, nota: '1/4 de aguacate' },
          { grupo: 'grasas',   porciones: 1,   foodId: 'mantequilla', nota: 'de la preparación' },
        ],
      },
      {
        id: 'mediaTarde', label: 'Media tarde',
        targets: { lacteos: 1, harinas: 1, azucares: 1, frutas: 2 },
        A: [
          { grupo: 'harinas',  porciones: 1, foodId: 'granola', gramosFijos: 30 },
          { grupo: 'frutas',   porciones: 2, foodId: 'banano' },
          { grupo: 'lacteos',  porciones: 1, foodId: 'yogurt-griego', nota: '2 días a la semana puedes cambiarlo por una bola de helado' },
          { grupo: 'azucares', porciones: 1, foodId: 'mermelada' },
        ],
        B: [
          { grupo: 'harinas',  porciones: 1, foodId: 'avena-hojuelas' },
          { grupo: 'frutas',   porciones: 2, foodId: 'banano' },
          { grupo: 'lacteos',  porciones: 1, foodId: 'yogurt', nota: 'sin azúcar, o 200ml de leche deslactosada' },
          { grupo: 'azucares', porciones: 1, foodId: 'chocolatina', nota: '1 pequeña (15-20g)' },
        ],
      },
      {
        id: 'cena', label: 'Cena',
        targets: { harinas: 2, carnes: 1.5, grasas: 1 },
        A: [
          { grupo: 'carnes',  porciones: 1.5, foodId: 'pechuga', nota: 'o pescado, en 5ml de aceite' },
          { grupo: 'harinas', porciones: 2,   foodId: 'arroz-blanco', nota: 'o papa' },
          { grupo: 'grasas',  porciones: 1,   foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
        B: [
          { grupo: 'harinas',    porciones: 1, foodId: 'arepa-delgada', nota: 'Opción 2 del plan' },
          { grupo: 'harinas',    porciones: 1, foodId: 'pan-tajado', nota: 'o 3 galletas sin relleno' },
          { grupo: 'sustitutos', porciones: 1, foodId: 'huevo', nota: '+ 3 claras, revueltas o estrelladas' },
          { grupo: 'grasas',     porciones: 1, foodId: 'aceite-oliva', nota: 'de la preparación' },
        ],
      },
    ],
    info: {
      entreno: [
        'Añadir de 2 a 3 días de full body distribuidos a lo largo de la semana.',
      ],
      recomendaciones: [
        'Asegurar 1,8 – 2,4 litros de agua durante el día.',
        'El lácteo se puede intercambiar entre yogurt griego, leche deslactosada y yogurt sin azúcar.',
        'Se puede jugar con las porciones: pasar 1 harina del almuerzo a la media tarde, o un sustituto del desayuno a la cena. Lo importante es cumplir las porciones diarias.',
        'No pasar más de 6 horas sin comer, en lo posible.',
        'Solo 1 comida libre cada 14 días.',
        'Las carnes se pesan en crudo; el resto de alimentos en cocido.',
        'Se pueden usar alimentos integrales para mejorar la saciedad.',
        'Cuidado con el café para evitar insomnio o sobreestimulación (máximo 3 tazas diarias).',
        'Pesar los alimentos mejora los resultados al ser más exactos.',
      ],
      suplementos: [
        { nombre: 'Creatina', dosis: '5g diarios con el primer vaso de agua del día', marcas: 'Iron, Platinum Tech, Nutrex, Dymatize, Optimum Nutrition, Healthy Sports' },
        { nombre: 'Glicinato de magnesio', dosis: '400mg, 1 hora antes de dormir', marcas: '' },
        { nombre: 'Probióticos (opcional)', dosis: '1 servicio diario, 30 min antes de una comida o 2 horas después de la última', marcas: 'Probiotic Complex Nutricost, Probioessens, Multiflora Plus, Jarrow Formulas' },
        { nombre: 'Cafeína (opcional)', dosis: '1 cápsula de 200mg, 45-60 min antes del entreno', marcas: 'Nutricost, Muscletech, Allmax, EVL' },
        { nombre: 'Geles (opcional)', dosis: 'Solo geles de carbohidratos por ahora, hasta asesorar la utilidad de la cafeína en los entrenos', marcas: '' },
      ],
      consideraciones: [
        '1 grasa del desayuno, la grasa del almuerzo y 1 de la cena son la mantequilla o aceite de la preparación: 5g de mantequilla o 5ml de aceite (oliva o aguacate). El resto de grasas se toma como aguacate.',
        'Los carbohidratos son necesarios para el rendimiento, la masa muscular y la energía — no los disminuyas innecesariamente.',
        'Alimentos cocidos o asados, mínimamente fritos.',
        'Comidas en la calle: hamburguesas artesanales, ensaladas compuestas o alimentos sin tantas salsas.',
        'Bebidas dietéticas (sparkling water, gaseosas cero, aguas saborizadas) sin sobrepasar 600ml diarios.',
        'Se pueden usar alimentos dietéticos (cacao sin azúcar, gelatina sin azúcar, endulzantes, sirope sin azúcar) para dar volumen o sabor.',
        'Ante ansiedad: bebidas calientes (té verde, té negro, aromáticas sin calorías). Mantener a diario 1 taza de gelatina sin azúcar preparada por si hay hambre después de la cena — no afecta el proceso. En días que no entrena pueden ser 2.',
        'Si sales del plan, retómalo lo antes posible sin sensación de culpa — esto es un proceso.',
      ],
      comidaLibre: '1 comida libre cada 14 días',
    },
  },
};
