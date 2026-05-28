# Proyecto 03 — Base de Datos 2

El proyecto modela rompecabezas como un grafo: piezas, figuras y rompecabezas se conectan por relaciones fisicas (`CONECTA_CON`) y secuenciales (`SIGUIENTE`). El grafo permite verificar consistencia, recorrer armado con BFS y simular piezas faltantes.

## Stack tecnologico

- Neo4j AuraDB (Cypher)
- Node.js + Express (backend API)
- Neo4j JavaScript Driver
- React + Vite + Tailwind (frontend)

## Estructura del repositorio

- `backend/`: API HTTP y endpoints de armado y faltantes.
- `database/`: esquema, seeds, datos CSV, scripts de apoyo y verificaciones.
- `frontend/`: interfaz web (Vite + React) para visualizacion.
- `docs/`: informe final y evidencias.

## Inventario de datos

| ID    | Tipo                | Piezas | Notas                                  |
|-------|---------------------|--------|----------------------------------------|
| RC001 | grid 6x4            | 24     | Animales del bosque (foto real)        |
| RC002 | grid 6x4            | 24     | Dinosaurios (variante tematica)        |
| RC003 | grid 6x4            | 24     | Espacio (variante tematica)            |
| RC004 | grid 6x4            | 24     | Vehiculos (variante tematica)          |
| RC005 | figura_libre        | 6      | 3 zorros de madera                     |
| RC006 | secuencial_numerado | 10     | Pterodactilo                           |
| RC007 | mixto_numerado      | 14     | Oruga + hoja + mariposa                |
| RC008 | mixto_numerado      | 13     | Ciclo de vida del pato                 |

Totales verificados (CSV):

- 8 rompecabezas
- 139 piezas
- 9 figuras
- 184 relaciones `CONECTA_CON`
- 30 relaciones `SIGUIENTE`

## Modelo de datos

**Nodos**

- `Rompecabezas`: `serial`, `nombre`, `tematica`, `tipo_estructura`, `total_piezas`, `num_figuras`, `filas`, `columnas`.
- `Pieza`: `serial`, `rompecabezas_serial`, `tipo`, `forma`, `presente`, `descripcion`, `fila`, `columna`, `numero`, `lado_*`.
- `Figura`: `serial`, `nombre`, `num_piezas`, `orden_narrativo`.

**Relaciones**

- `(:Figura)-[:EN]->(:Rompecabezas)`
- `(:Pieza)-[:PERTENECE_A]->(:Rompecabezas)`
- `(:Pieza)-[:PARTE_DE]->(:Figura)`
- `(:Pieza)-[:SIGUIENTE]->(:Pieza)`
- `(:Pieza)-[:CONECTA_CON {lado}]->(:Pieza)`

## Requisitos previos

- Node.js 18+ (recomendado)
- Cuenta Neo4j AuraDB
- Git y acceso a Internet (para `LOAD CSV` desde GitHub)

## Configuracion de credenciales

- Solo se incluyen archivos `.env.example` en `backend/` y `database/`.
- Copia el ejemplo a un `.env` local y completa con tus credenciales.
- No subas credenciales reales al repositorio.

Variables esperadas:

- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`

## Carga de datos en AuraDB

El seed principal carga CSV desde GitHub raw. El repositorio debe ser publico para que `LOAD CSV` funcione.

### Opcion A — Neo4j Browser (manual)

1. Configurar credenciales locales a partir de `.env.example`.
2. Abrir Neo4j Browser.
3. Ejecutar estos archivos en orden:
   - `database/schema/00_schema.cypher`
   - `database/seeds/01_reset.cypher` *(opcional, si necesitas reiniciar)*
   - `database/seeds/02_load_csv.cypher`
   - `database/verify/04_verificar.cypher`

### Opcion B — `cypher-shell`

```bash
cypher-shell -f database/schema/00_schema.cypher
cypher-shell -f database/seeds/01_reset.cypher
cypher-shell -f database/seeds/02_load_csv.cypher
cypher-shell -f database/verify/04_verificar.cypher
```

## Backend (API)

Instalacion y ejecucion:

```bash
cd backend
npm install
npm run dev
```

Endpoints principales:

- `GET /api/puzzles` listado de rompecabezas.
- `GET /api/puzzles/:id` detalle completo (piezas, figuras, relaciones).
- `GET /api/puzzles/:id/assemble` armado completo (BFS).
- `GET /api/puzzles/:id/report` reporte de piezas faltantes + armado parcial.
- `POST /api/pieces/:serial/toggle` marca o desmarca una pieza.
- `POST /api/puzzles/:id/restore` restaura todas las piezas faltantes.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

La app usa un proxy de Vite hacia `http://localhost:4000` para `/api`.

## Verificacion rapida

- Para un grid 6x4, las conexiones esperadas son 4x5 + 3x6 = **38** por rompecabezas (RC001-RC004).
- El script `database/verify/04_verificar.cypher` valida conteos, conexiones y consistencia de lados.

## Documentacion

- `docs/informe_final.md`: informe final para entrega.
- `docs/evidencias/README.md`: lista de capturas esperadas.
