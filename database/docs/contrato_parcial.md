# Contrato: modo "marcar faltantes" — P4 → P6 (UI)

## Cuándo invocar

La UI (P6) llama `getMissingReport(puzzleId, auth)` cada vez que el usuario activa el modo **"marcar faltantes"** para un rompecabezas cargado. La función hace las tres consultas en paralelo y devuelve un objeto único.

---

## Firma

```js
import { getMissingReport } from '../scripts/armado_parcial.js';

const reporte = await getMissingReport('RC001', auth);
// auth = { uri, user, password }
```

---

## Estructura de la respuesta `MissingReport`

```json
{
  "faltantes": [
    {
      "id": "RC001-P02-03",
      "rompecabezas": "RC001",
      "fila": 2,
      "columna": 3,
      "tipo_esperado": "interior",
      "vecinos_presentes": [
        "RC001-P02-02",
        "RC001-P02-04",
        "RC001-P01-03",
        "RC001-P03-03"
      ],
      "inferencias_lado": {
        "lado_arriba":    "saliente",
        "lado_abajo":     "abertura",
        "lado_izquierda": "saliente",
        "lado_derecha":   "abertura"
      }
    }
  ],
  "regiones_aisladas": [
    ["RC001-P01-01", "RC001-P01-02", "..."]
  ],
  "armado_parcial": [
    "--- Armado parcial de RC001 (grid) ---",
    "Colocando primera pieza: RC001-P01-01",
    "pieza RC001-P01-01 se ensambla con RC001-P01-02 por el lado derecha",
    "..."
  ]
}
```

### Notas sobre los campos

| Campo | Descripción |
|---|---|
| `fila`, `columna` | `null` para piezas de puzzles irregulares (RC005-RC008) |
| `tipo_esperado` | `"esquina"`, `"borde"`, `"interior"` o `"irregular"` según los datos del grafo |
| `inferencias_lado.*` | `"saliente"`, `"abertura"`, `"plano"` o `"desconocido"` si el vecino de ese lado también falta |
| `regiones_aisladas` | Array de arrays; el primero es siempre el componente más grande |
| `armado_parcial` | Pasos de texto, igual que `assemblePuzzle` de P3 pero omitiendo faltantes |

---

## Visualización SVG sugerida (para P6)

### Pieza faltante

```
stroke:          #999   (gris claro)
stroke-dasharray: 6 3   (guiones)
fill:            #f0f0f0 o transparente
opacity:         0.7
```

### Tooltip al hacer hover en pieza faltante

```
Pieza: RC001-P02-03
Tipo esperado: interior
Lados inferidos:
  ↑ saliente   ↓ abertura
  ← saliente   → abertura
```

Si algún lado es `"desconocido"`, mostrar `?` en esa dirección.

### Pieza en región aislada

Pieza que aparece en `regiones_aisladas[i]` con `i > 0`:

```
stroke: #e53935  (rojo)
stroke-width: 2
```

### Ejemplo de uso React/SVG

```jsx
function PiezaSVG({ pieza, reporte }) {
  const faltante = reporte.faltantes.find(f => f.id === pieza.id);
  const enIsla   = reporte.regiones_aisladas.slice(1).some(c => c.includes(pieza.id));

  const stroke = faltante ? '#999' : enIsla ? '#e53935' : '#333';
  const fill   = faltante ? '#f0f0f0' : pieza.color;
  const dashArray = faltante ? '6 3' : 'none';

  return (
    <rect
      stroke={stroke}
      strokeDasharray={dashArray}
      fill={fill}
      title={faltante
        ? `Faltante | tipo: ${faltante.tipo_esperado} | lados: ${JSON.stringify(faltante.inferencias_lado)}`
        : pieza.id
      }
    />
  );
}
```

---

## Casos de demo disponibles

| Caso | Puzzle | Piezas faltantes | Islas esperadas |
|---|---|---|---|
| 1 | RC001 | `RC001-P02-03` (1) | 0 |
| 2 | RC005 | `RC005-P02`, `RC005-P05` (2) | 0 |
| 3 | RC003 | `RC003-P02-01`, `RC003-P02-02`, `RC003-P02-03` (3) | 2 |

Aplicar escenario: `database/seeds/05_demo_faltantes.cypher`
Revertir: `database/seeds/06_reset_faltantes.cypher`

---

## Funciones individuales (si P6 necesita control granular)

```js
import {
  assemblePuzzlePartial,  // solo los pasos de armado
  inferMissingPieces,     // solo las inferencias de lados
  detectIsolatedRegions,  // solo los componentes conexos
} from '../scripts/armado_parcial.js';
```
