# API de Piezas Faltantes — Guía para el desarrollador frontend (P6)

## Índice

1. [Setup y conexión](#1-setup-y-conexión)
2. [Función principal: getMissingReport](#2-función-principal-getmissingreport)
3. [Estructura completa de la respuesta](#3-estructura-completa-de-la-respuesta)
4. [Marcar y desmarcar piezas](#4-marcar-y-desmarcar-piezas)
5. [Funciones individuales](#5-funciones-individuales)
6. [Cómo identificar piezas al usuario](#6-cómo-identificar-piezas-al-usuario)
7. [Comportamiento por tipo de puzzle](#7-comportamiento-por-tipo-de-puzzle)
8. [Patrones de UI recomendados](#8-patrones-de-ui-recomendados)
9. [Flujo completo de ejemplo](#9-flujo-completo-de-ejemplo)

---

## 1. Setup y conexión

### Instalación de dependencias

```bash
cd database
npm install
```

### Objeto `auth`

Todas las funciones reciben un objeto `auth`. Cargarlo desde las variables de entorno:

```js
import dotenv from 'dotenv';
dotenv.config();

const auth = {
  uri:      process.env.NEO4J_URI,       // neo4j+s://xxxx.databases.neo4j.io
  user:     process.env.NEO4J_USERNAME,  // neo4j
  password: process.env.NEO4J_PASSWORD,
};
```

### Import de las funciones

```js
import {
  getMissingReport,
  inferMissingPieces,
  detectIsolatedRegions,
  assemblePuzzlePartial,
  getFigurasStatus,
} from './scripts/armado_parcial.js';
```

---

## 2. Función principal: `getMissingReport`

Es la función que la UI llama en la mayoría de casos. Ejecuta las cuatro consultas en paralelo y devuelve todo en un solo objeto.

```js
const reporte = await getMissingReport(puzzleId, auth);
```

| Parámetro | Tipo | Ejemplo |
|---|---|---|
| `puzzleId` | `string` | `'RC001'`, `'RC005'` |
| `auth` | `object` | `{ uri, user, password }` |

**Cuándo llamarla:**
- Al cargar un puzzle por primera vez
- Después de marcar o desmarcar una pieza como faltante
- Al activar el modo "marcar faltantes"

---

## 3. Estructura completa de la respuesta

```js
{
  // ── Piezas faltantes ─────────────────────────────────────────────────────
  faltantes: [
    {
      id:          "RC001-P02-03",       // ID único en la BD
      descripcion: "Pieza (2,3)",        // Nombre legible para el usuario
      rompecabezas: "RC001",
      fila:        2,                    // null si no es grid
      columna:     3,                    // null si no es grid
      numero:      null,                 // número de secuencia (solo RC006-RC008)
      tipo_esperado: "interior",         // "esquina" | "borde" | "interior" | "irregular"
      vecinos_presentes: [
        "RC001-P01-03",
        "RC001-P03-03",
        "RC001-P02-02",
        "RC001-P02-04"
      ],
      inferencias_lado: {
        lado_arriba:    "abertura",      // "saliente" | "abertura" | "plano" | "desconocido"
        lado_abajo:     "abertura",
        lado_izquierda: "saliente",
        lado_derecha:   "saliente"
      }
    }
    // ... una entrada por cada pieza con presente=false
  ],

  // ── Estado de figuras / puzzle ────────────────────────────────────────────
  // Para puzzles con figuras (RC005, RC007, RC008): una entrada por figura.
  // Para grids (RC001-RC004): una sola entrada con el total del puzzle.
  estado_figuras: [
    {
      id:        "RC001",
      nombre:    "My Best Puzzle - Animales del Bosque",
      esperadas: 24,
      presentes: 23,
      faltantes: 1,
      estado:    "incompleto"            // "completo" | "incompleto"
    }
  ],
  // Ejemplo para RC005 con P02 faltante:
  // estado_figuras: [
  //   { id: "RC005-F1", nombre: "Zorro grande durmiendo", esperadas: 3, presentes: 2, faltantes: 1, estado: "incompleta" },
  //   { id: "RC005-F2", nombre: "Zorro mediano",          esperadas: 2, presentes: 2, faltantes: 0, estado: "completa"   },
  //   { id: "RC005-F3", nombre: "Zorro pequeño con cola", esperadas: 1, presentes: 1, faltantes: 0, estado: "completa"   }
  // ]

  // ── Regiones aisladas ─────────────────────────────────────────────────────
  // Array de arrays de IDs. El primer array es el componente principal (más grande).
  // Si hay más de un componente, alguna pieza faltante está dividiendo el puzzle.
  regiones_aisladas: [
    ["RC001-P01-01", "RC001-P01-02", "..."]  // componente principal (todas las demás)
    // si faltasen piezas que aíslan:
    // ["RC004-P03-01", "RC004-P03-02", "..."],  // isla 1
    // ["RC004-P01-01", "RC004-P01-02", "..."]   // isla 2
  ],

  // ── Pasos de armado parcial ───────────────────────────────────────────────
  // Array de strings, igual que assemblePuzzle de P3 pero omitiendo faltantes.
  armado_parcial: [
    "--- Armado parcial de RC001 (grid) ---",
    "Colocando primera pieza: RC001-P01-01",
    "pieza RC001-P01-01 se ensambla con RC001-P01-02 por el lado derecha",
    "pieza RC001-P01-01 se ensambla con RC001-P02-01 por el lado abajo",
    // ...
    "--- Armado parcial de RC001 finalizado (23 piezas) ---"
  ]
}
```

---

## 4. Marcar y desmarcar piezas

Las funciones de `armado_parcial.js` son de **solo lectura** — no mutan el estado. Para marcar o desmarcar piezas hay que escribir directamente a Neo4j con el driver.

### Configurar el driver una vez

```js
import neo4j from 'neo4j-driver';

const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));
```

### Marcar una pieza como faltante

```js
async function marcarFaltante(piezaId) {
  const session = driver.session();
  try {
    await session.run(
      'MATCH (p:Pieza {id: $id}) SET p.presente = false',
      { id: piezaId }
    );
  } finally {
    await session.close();
  }
}
```

### Restaurar una pieza faltante

```js
async function restaurarPieza(piezaId) {
  const session = driver.session();
  try {
    await session.run(
      'MATCH (p:Pieza {id: $id}) SET p.presente = true',
      { id: piezaId }
    );
  } finally {
    await session.close();
  }
}
```

### Restaurar todas las piezas de un puzzle

```js
async function restaurarTodas(puzzleId) {
  const session = driver.session();
  try {
    await session.run(
      'MATCH (p:Pieza {rompecabezas_id: $puzzleId, presente: false}) SET p.presente = true',
      { puzzleId }
    );
  } finally {
    await session.close();
  }
}
```

### Toggle desde el click del usuario

```js
async function onPiezaClick(piezaId, estaPresente) {
  if (estaPresente) {
    await marcarFaltante(piezaId);
  } else {
    await restaurarPieza(piezaId);
  }
  // Refrescar el reporte después de cada cambio
  const reporte = await getMissingReport(puzzleId, auth);
  renderPuzzle(reporte);
}
```

---

## 5. Funciones individuales

Úsalas cuando no necesites el reporte completo (para optimizar llamadas):

### `getFigurasStatus(puzzleId, auth)`

Solo el estado de completitud. Útil para mostrar badges sin recargar todo.

```js
const figuras = await getFigurasStatus('RC005', auth);
// [
//   { id: "RC005-F1", nombre: "Zorro grande durmiendo", esperadas: 3, presentes: 2, faltantes: 1, estado: "incompleta" },
//   { id: "RC005-F2", nombre: "Zorro mediano",          esperadas: 2, presentes: 2, faltantes: 0, estado: "completa"   },
//   { id: "RC005-F3", nombre: "Zorro pequeño con cola", esperadas: 1, presentes: 1, faltantes: 0, estado: "completa"   }
// ]
```

### `inferMissingPieces(puzzleId, auth)`

Solo las piezas faltantes con sus lados inferidos.

```js
const faltantes = await inferMissingPieces('RC001', auth);
```

### `detectIsolatedRegions(puzzleId, auth)`

Solo los componentes conexos.

```js
const regiones = await detectIsolatedRegions('RC001', auth);
// [[...ids del componente principal], [...ids isla 1], ...]
```

### `assemblePuzzlePartial(puzzleId, auth)`

Solo los pasos de armado saltando faltantes.

```js
const pasos = await assemblePuzzlePartial('RC001', auth);
// ["--- Armado parcial de RC001 (grid) ---", "pieza X se ensambla con Y ...", ...]
```

---

## 6. Cómo identificar piezas al usuario

Cada pieza tiene campos diferentes según el tipo de puzzle. Usa esta lógica para el label visible:

```js
function labelPieza(pieza) {
  if (pieza.descripcion) return pieza.descripcion;          // "Cabeza zorro grande"
  if (pieza.fila && pieza.columna) return `Pieza (${pieza.fila},${pieza.columna})`;
  if (pieza.numero) return `Pieza #${pieza.numero}`;
  return pieza.id;
}
```

| Tipo de puzzle | Identificación | Ejemplo |
|---|---|---|
| Grid (RC001-RC004) | Posición visual o descripción temática de las esquinas | `"Pieza (2,3)"` / `"Esquina superior izquierda - árbol"` |
| Figura libre (RC005) | Nombre descriptivo de la pieza | `"Cabeza zorro grande"` |
| Secuencial (RC006) | Número de secuencia | `"Pieza #3"` |
| Mixto (RC007-RC008) | Nombre descriptivo + número | `"Oruga parte 2"` |

Para grids el usuario **no lee el label** — ve el hueco en la imagen y hace click. El label aparece solo en el tooltip.

---

## 7. Comportamiento por tipo de puzzle

### Grids (RC001-RC004) — `tipo_estructura: "grid"`

- `estado_figuras` devuelve **una sola entrada** con el conteo total del puzzle.
- `regiones_aisladas` normalmente tiene **1 componente**. Más de 1 significa que una pieza faltante está cortando el grid.
- `inferencias_lado` siempre tiene valores (`"saliente"`, `"abertura"`, `"plano"`) para los vecinos presentes.

```js
const esGridPartido = reporte.regiones_aisladas.length > 1;
```

### Figura libre (RC005) — `tipo_estructura: "figura_libre"`

- `estado_figuras` devuelve **una entrada por figura**.
- `regiones_aisladas` **siempre tiene múltiples componentes** (una por figura) — esto es normal.
- Para detectar fragmentación dentro de una figura, compara el número de componentes con el número de figuras:

```js
const numFiguras = reporte.estado_figuras.length;
const figuraFragmentada = reporte.regiones_aisladas.length > numFiguras;
```

- `inferencias_lado` siempre devuelve `"desconocido"` porque las piezas irregulares no tienen propiedades de lado.

### Secuencial (RC006) — `tipo_estructura: "secuencial_numerado"`

- Sin figuras. `estado_figuras` devuelve el conteo total.
- Las piezas tienen `numero` (1 al 10). Usar `pieza.numero` para el label.
- `armado_parcial` usa relaciones `SIGUIENTE` además de `CONECTA_CON`.

### Mixto (RC007-RC008) — `tipo_estructura: "mixto_numerado"`

- `estado_figuras` devuelve una entrada por figura (igual que figura_libre).
- Las piezas tienen `numero` dentro de su figura.
- Misma lógica de fragmentación que figura_libre.

---

## 8. Patrones de UI recomendados

### Render de una pieza en SVG

```js
function renderPieza(pieza, reporte) {
  const faltante    = reporte.faltantes.find(f => f.id === pieza.id);
  const estaAislada = reporte.regiones_aisladas.slice(1).some(r => r.includes(pieza.id));

  return {
    fill:            faltante   ? '#f0f0f0'  : pieza.colorOriginal,
    stroke:          estaAislada ? '#e53935' : '#333333',
    strokeDasharray: faltante   ? '6 3'     : 'none',
    opacity:         faltante   ? 0.6        : 1,
    tooltip:         faltante   ? tooltipFaltante(faltante) : pieza.descripcion,
  };
}

function tooltipFaltante(f) {
  const i = f.inferencias_lado;
  return [
    labelPieza(f),
    `Tipo esperado: ${f.tipo_esperado ?? 'desconocido'}`,
    `Lados inferidos:`,
    `  ↑ ${i.lado_arriba}   ↓ ${i.lado_abajo}`,
    `  ← ${i.lado_izquierda}   → ${i.lado_derecha}`,
  ].join('\n');
}
```

### Badge de figura incompleta

```js
function badgeFigura(fig) {
  const completa = fig.estado === 'completa' || fig.estado === 'completo';
  return {
    texto: `${fig.nombre}: ${fig.presentes}/${fig.esperadas}`,
    color: completa ? 'green' : 'red',
    icono: completa ? '✓'     : '✗',
  };
}
```

### Alerta de puzzle partido

```js
function alertaAislamiento(reporte) {
  const numFiguras = reporte.estado_figuras.length;
  const tieneFiguras = /* RC005, RC007, RC008 */
    reporte.estado_figuras[0]?.id?.includes('-F');

  const umbral = tieneFiguras ? numFiguras : 1;

  if (reporte.regiones_aisladas.length > umbral) {
    return `⚠ El puzzle está dividido en ${reporte.regiones_aisladas.length} regiones.
Piezas aisladas: ${reporte.regiones_aisladas.slice(1).flat().join(', ')}`;
  }
  return null;
}
```

---

## 9. Flujo completo de ejemplo

```js
import neo4j from 'neo4j-driver';
import { getMissingReport } from './scripts/armado_parcial.js';

const auth = { uri: process.env.NEO4J_URI, user: process.env.NEO4J_USERNAME, password: process.env.NEO4J_PASSWORD };
const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));

let reporte = null;
let puzzleId = 'RC001';

// ── 1. Cargar puzzle ──────────────────────────────────────────────────────────
async function cargarPuzzle(id) {
  puzzleId = id;
  reporte  = await getMissingReport(puzzleId, auth);
  renderUI(reporte);
}

// ── 2. El usuario hace click en una pieza ─────────────────────────────────────
async function onClickPieza(piezaId) {
  const esFaltante = reporte.faltantes.some(f => f.id === piezaId);
  const session = driver.session();

  try {
    if (esFaltante) {
      await session.run('MATCH (p:Pieza {id: $id}) SET p.presente = true',  { id: piezaId });
    } else {
      await session.run('MATCH (p:Pieza {id: $id}) SET p.presente = false', { id: piezaId });
    }
  } finally {
    await session.close();
  }

  reporte = await getMissingReport(puzzleId, auth);
  renderUI(reporte);
}

// ── 3. Renderizar ─────────────────────────────────────────────────────────────
function renderUI(reporte) {
  // Badges de figuras
  for (const fig of reporte.estado_figuras) {
    console.log(`${fig.estado === 'completa' || fig.estado === 'completo' ? '✓' : '✗'} ${fig.nombre}: ${fig.presentes}/${fig.esperadas}`);
  }

  // Alerta de aislamiento
  if (reporte.regiones_aisladas.length > 1) {
    console.warn(`⚠ Puzzle dividido en ${reporte.regiones_aisladas.length} regiones`);
  }

  // Piezas faltantes
  for (const f of reporte.faltantes) {
    console.log(`Faltante: ${labelPieza(f)} — lados: ↑${f.inferencias_lado.lado_arriba} ↓${f.inferencias_lado.lado_abajo} ←${f.inferencias_lado.lado_izquierda} →${f.inferencias_lado.lado_derecha}`);
  }
}

function labelPieza(pieza) {
  if (pieza.descripcion)               return pieza.descripcion;
  if (pieza.fila && pieza.columna)     return `Pieza (${pieza.fila},${pieza.columna})`;
  if (pieza.numero)                    return `Pieza #${pieza.numero}`;
  return pieza.id;
}

// Iniciar
cargarPuzzle('RC001');
```

---

## Referencia rápida

| Función | Para qué usarla |
|---|---|
| `getMissingReport(id, auth)` | Carga inicial y refresco después de marcar/desmarcar |
| `getFigurasStatus(id, auth)` | Solo actualizar badges de figuras |
| `inferMissingPieces(id, auth)` | Solo saber qué piezas faltan y sus lados |
| `detectIsolatedRegions(id, auth)` | Solo chequear si el puzzle está partido |
| `assemblePuzzlePartial(id, auth)` | Mostrar el paso a paso de armado |
| `SET p.presente = false` | Marcar pieza faltante (requiere driver directo) |
| `SET p.presente = true` | Restaurar pieza (requiere driver directo) |

## IDs disponibles

| ID | Nombre | Tipo | Piezas |
|---|---|---|---|
| RC001 | My Best Puzzle - Animales del Bosque | grid 4×6 | 24 |
| RC002 | Dinosaurios Prehistóricos | grid 4×6 | 24 |
| RC003 | Espacio y Planetas | grid 4×6 | 24 |
| RC004 | Vehículos Divertidos | grid 4×6 | 24 |
| RC005 | 3 Zorros de Madera | figura_libre | 6 |
| RC006 | Pterodáctilo Numerado | secuencial_numerado | 10 |
| RC007 | Ciclo: Oruga, Hoja y Mariposa | mixto_numerado | 14 |
| RC008 | Ciclo de vida del Pato | mixto_numerado | 13 |
