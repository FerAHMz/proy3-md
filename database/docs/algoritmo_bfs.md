# Algoritmo BFS de armado — Persona 3

## Entrada

```js
assemblePuzzle(puzzleId, auth)
// puzzleId: string  — ID del rompecabezas  (ej. "RC001", "RC005")
// auth:     object  — { uri: string, user: string, password: string }
```

## Salida

Array de strings con los pasos de armado, listo para mostrar en la UI:

```
[
  "--- Iniciando armado de rompecabezas RC001 (grid) ---",
  "Colocando primera pieza: RC001-P01-01",
  "pieza RC001-P01-01 se ensambla con RC001-P01-02 por el lado derecha",
  "pieza RC001-P01-01 se ensambla con RC001-P02-01 por el lado abajo",
  ...
  "--- Armado de RC001 finalizado ---"
]
```

## Lógica del algoritmo

### 1. Determinar la(s) pieza(s) inicial(es)

Se ejecuta `getStartingPiecesQuery` con el `puzzleId`. La query usa una UNION de dos ramas:

- **Rompecabezas con Figuras** (`figura_libre`, `mixto_numerado`): devuelve la primera pieza de cada figura, ordenada por `orden_narrativo` → `numero` → `fila` → `columna` → `id`.
- **Rompecabezas sin Figuras** (`grid`, `secuencial_numerado`): devuelve la primera pieza del puzzle por el mismo orden.

El orden determinístico garantiza que el BFS siempre inicia desde el mismo nodo.

### 2. BFS principal

Para cada pieza inicial:

1. Agregar la pieza a la cola y al conjunto `visited`.
2. Mientras la cola no esté vacía:
   a. Sacar `currentId` de la cabeza de la cola.
   b. Ejecutar `getNeighborsQuery` para obtener vecinos por `CONECTA_CON` o `SIGUIENTE`.
   c. Para cada vecino no visitado:
      - Marcar como visitado, agregar a la cola.
      - Generar un paso de texto:
        - `CONECTA_CON`: `"pieza A se ensambla con B por el lado X"`
        - `SIGUIENTE`: `"pieza A se ensambla con la siguiente pieza de la secuencia: B"`

### 3. Dirección de conexión

La relación `CONECTA_CON` tiene la propiedad `lado` que indica la dirección **desde el nodo origen** de la relación. Si la pieza actual ES el origen (`soy_origen = true`), el `lado` se usa directamente. Si la pieza actual es el destino, el lado se invierte con `invertLado`:

```
arriba ↔ abajo    |    izquierda ↔ derecha
```

### 4. Soporte de figuras (figura_libre / mixto_numerado)

Si el rompecabezas tiene figuras, se arman secuencialmente en orden narrativo. El BFS de cada figura es independiente; la relación `SIGUIENTE` une piezas dentro de la misma figura o entre figuras en puzzles `mixto_numerado`.

## Tipos de estructura soportados

| `tipo_estructura`      | Ejemplo | Relaciones usadas |
|---|---|---|
| `grid`                 | RC001–RC004 | `CONECTA_CON` |
| `figura_libre`         | RC005       | `CONECTA_CON` (por figura) |
| `secuencial_numerado`  | RC006       | `SIGUIENTE` + `CONECTA_CON` |
| `mixto_numerado`       | RC007, RC008 | `SIGUIENTE` + `CONECTA_CON` por figura |

## Ejemplo de output completo — RC001 (grid 4×6)

```
--- Iniciando armado de rompecabezas RC001 (grid) ---
Colocando primera pieza: RC001-P01-01
pieza RC001-P01-01 se ensambla con RC001-P01-02 por el lado derecha
pieza RC001-P01-01 se ensambla con RC001-P02-01 por el lado abajo
pieza RC001-P01-02 se ensambla con RC001-P01-03 por el lado derecha
pieza RC001-P01-02 se ensambla con RC001-P02-02 por el lado abajo
...
pieza RC001-P04-05 se ensambla con RC001-P04-06 por el lado derecha

--- Armado de RC001 finalizado ---
```

## Ejemplo de output completo — RC005 (figura_libre, 3 figuras)

```
--- Iniciando armado de rompecabezas RC005 (figura_libre) ---

Armando figura: Zorro grande durmiendo
Colocando primera pieza: RC005-P01
pieza RC005-P01 se ensambla con RC005-P02 por ensamblaje
pieza RC005-P02 se ensambla con RC005-P03 por ensamblaje

Armando figura: Zorro mediano
Colocando primera pieza: RC005-P04
pieza RC005-P04 se ensambla con RC005-P05 por ensamblaje

Armando figura: Zorro pequeño con cola
Colocando primera pieza: RC005-P06

--- Armado de RC005 finalizado ---
```

## Archivos

| Archivo | Rol |
|---|---|
| `database/scripts/bfs.js` | Función `assemblePuzzle(puzzleId, auth)` |
| `database/scripts/queries.js` | `getStartingPiecesQuery`, `getNeighborsQuery` |
| `database/scripts/util_lados.js` | `invertLado`, `invertEncaje` (utilidades compartidas) |
| `database/verify/test_bfs.js` | Test harness — prueba RC001, RC005, RC006, RC007, RC008 |

## Extensión para piezas faltantes (Persona 4)

Ver `database/docs/contrato_parcial.md` y `database/scripts/armado_parcial.js`.
