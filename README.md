# Persona 2 — Implementación de la BD

Scripts Cypher para poblar el AuraDB del proyecto.

## Inventario que se va a crear

| ID    | Tipo                  | Piezas | Notas                                  |
|-------|-----------------------|--------|----------------------------------------|
| RC001 | grid 6×4              | 24     | Animales del bosque (foto real)        |
| RC002 | grid 6×4              | 24     | Dinosaurios (variante temática)        |
| RC003 | grid 4×3              | 12     | Espacio (variante temática)            |
| RC004 | grid 5×4              | 20     | Vehículos (variante temática)          |
| RC005 | figura_libre          | 6      | 3 zorros de madera                     |
| RC006 | secuencial_numerado   | 10     | Pterodáctilo                           |
| RC007 | mixto_numerado        | 14     | Oruga + hoja + mariposa                |
| RC008 | mixto_numerado        | 13     | Ciclo de vida del pato                 |

**Total: 8 rompecabezas, 123 piezas, 7 figuras**

## Cómo ejecutar

### Opción A — Desde la línea de comandos con Python (recomendado)

```bash
pip install neo4j
python3 run_seed.py
```

El script `run_seed.py` corre los archivos `.cypher` en orden, valida la consistencia de los lados y reporta cualquier error.

### Opción B — Desde Neo4j Browser (manual)

1. Conectar al AuraDB con las credenciales del archivo `.env`
2. Abrir Neo4j Browser
3. Copiar y pegar el contenido de cada archivo `.cypher` en este orden:
   - `00_schema.cypher`
   - `01_reset.cypher` *(opcional, solo si quieres empezar de cero)*
   - `02_seed_grids.cypher`
   - `03_seed_irregulares.cypher`
4. Ejecutar `04_verificar.cypher` para confirmar que todo está bien

## Archivos

| Archivo | Qué hace |
|---|---|
| `00_schema.cypher` | Constraints e índices (idempotente) |
| `01_reset.cypher` | **PRECAUCIÓN**: borra todo el grafo |
| `02_seed_grids.cypher` | Crea RC001-RC004 (4 grids con lados consistentes) |
| `03_seed_irregulares.cypher` | Crea RC005-RC008 (4 rompecabezas irregulares) |
| `04_verificar.cypher` | Queries de verificación |
| `gen_grids.py` | Generador del script de grids (no necesario re-ejecutar) |
| `validar_lados.py` | Valida consistencia de lados antes de subir |
| `run_seed.py` | Ejecuta todo contra AuraDB y verifica |


## Conexiones esperadas en grids (verificación rápida)

| Rompecabezas | Filas | Cols | Conexiones esperadas |
|---|---|---|---|
| RC001 | 4 | 6 | 4×5 + 3×6 = **38** |
| RC002 | 4 | 6 | 4×5 + 3×6 = **38** |
| RC003 | 4 | 3 | 4×2 + 3×3 = **17** |
| RC004 | 4 | 5 | 4×4 + 3×5 = **31** |

## Credenciales

Las credenciales están en `.env`
