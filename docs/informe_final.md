# Informe Final - Proyecto 03 (Base de Datos 2)

## Introduccion

El objetivo del proyecto es modelar rompecabezas como un grafo para resolver consultas de conectividad, orden y consistencia. Se implementa un esquema en Neo4j AuraDB, se cargan datos desde CSV y se construyen consultas Cypher para verificacion, armado con BFS y manejo de piezas faltantes. Ademas, se dispone de un backend API y un frontend para apoyar la visualizacion y las pruebas.

## Analisis del problema

El dominio mezcla dos tipos de relaciones principales: conexiones fisicas entre piezas (encajes) y relaciones de secuencia para puzzles numerados. El modelo debe soportar:

- Rompecabezas regulares en grilla (posicion por fila/columna).
- Rompecabezas irregulares por figuras (subconjuntos de piezas).
- Secuencias numeradas y combinaciones mixtas.

El reto principal es validar consistencia (conteos, conectividad, lados compatibles) y mantener consultas deterministas para el armado paso a paso.

## Tipologias identificadas

- **Grid regular**: piezas con fila/columna y lados definidos; se conectan por `CONECTA_CON`.
- **Figura libre**: piezas irregulares agrupadas por figura; la conectividad depende de la forma.
- **Secuencial numerado**: piezas con `numero` y relacion `SIGUIENTE`.
- **Mixto numerado**: combina figuras + secuencia para narrativas o ciclos.

## Justificacion de Neo4j

Neo4j facilita:

- Consultas de conectividad (BFS/DFS) con rutas variables.
- Modelado natural de relaciones entre piezas, figuras y rompecabezas.
- Flexibilidad para mezclar estructuras (grid, figuras, secuencias).
- Verificacion rapida con conteos y validaciones de consistencia.

## Modelo de datos

### Nodos

- `Rompecabezas`: `serial`, `nombre`, `tematica`, `tipo_estructura`, `total_piezas`, `num_figuras`, `filas`, `columnas`.
- `Pieza`: `serial`, `rompecabezas_serial`, `tipo`, `forma`, `presente`, `descripcion`, `fila`, `columna`, `numero`, `lado_arriba`, `lado_abajo`, `lado_izquierda`, `lado_derecha`.
- `Figura`: `serial`, `nombre`, `num_piezas`, `orden_narrativo`.

### Relaciones

- `(:Figura)-[:EN]->(:Rompecabezas)`
- `(:Pieza)-[:PERTENECE_A]->(:Rompecabezas)`
- `(:Pieza)-[:PARTE_DE]->(:Figura)`
- `(:Pieza)-[:SIGUIENTE]->(:Pieza)`
- `(:Pieza)-[:CONECTA_CON {lado}]->(:Pieza)`

### Constraints e indices

Se utilizan constraints de unicidad por `serial` y indices para acelerar consultas:

- Unicidad: `Rompecabezas.serial`, `Figura.serial`, `Pieza.serial`.
- Indices: `Pieza.presente`, `Pieza.numero`, `Pieza.rompecabezas_serial`.

## Implementacion en Neo4j AuraDB

La carga se realiza con `LOAD CSV` desde GitHub raw, siguiendo este orden:

1. Rompecabezas
2. Figuras
3. Piezas
4. Relaciones: `EN`, `PERTENECE_A`, `PARTE_DE`, `SIGUIENTE`, `CONECTA_CON`

Esto garantiza que los nodos existan antes de enlazarlos. Luego se ejecuta un script de verificacion con conteos y pruebas de consistencia.

## Consultas Cypher principales

### Inventario y conteos por rompecabezas

```cypher
MATCH (r:Rompecabezas)
OPTIONAL MATCH (p:Pieza)-[:PERTENECE_A]->(r)
OPTIONAL MATCH (f:Figura)-[:EN]->(r)
WITH r, count(DISTINCT p) AS piezas, count(DISTINCT f) AS figuras
RETURN r.serial AS serial,
			 r.nombre AS nombre,
			 r.tipo_estructura AS tipo,
			 r.total_piezas AS esperadas,
			 piezas AS reales,
			 figuras AS num_figuras,
			 CASE WHEN r.total_piezas = piezas THEN 'OK' ELSE 'MISMATCH' END AS estado
ORDER BY r.serial;
```

### Total de relaciones CONECTA_CON por rompecabezas

```cypher
MATCH (a:Pieza)-[:CONECTA_CON]-(b:Pieza)
WHERE a.rompecabezas_serial = b.rompecabezas_serial
RETURN a.rompecabezas_serial AS rompecabezas, count(*) / 2 AS conexiones
ORDER BY rompecabezas;
```

### Consistencia de lados en grids (debe retornar 0 filas)

```cypher
MATCH (a:Pieza)-[c:CONECTA_CON {lado: 'derecha'}]->(b:Pieza)
WHERE a.lado_derecha IS NOT NULL
WITH a, b, c,
		 CASE
			 WHEN a.lado_derecha = 'saliente' AND b.lado_izquierda = 'abertura' THEN 'OK'
			 WHEN a.lado_derecha = 'abertura' AND b.lado_izquierda = 'saliente' THEN 'OK'
			 ELSE 'INCONSISTENTE'
		 END AS check_h
WHERE check_h = 'INCONSISTENTE'
RETURN a.serial, a.lado_derecha, b.serial, b.lado_izquierda;
```

### Pieza inicial deterministica (armado BFS)

```cypher
MATCH (r:Rompecabezas {serial: $puzzleId})
OPTIONAL MATCH (f:Figura)-[:EN]->(r)
WITH r, collect(f) as figuras

CALL (r, figuras) {
		WITH r, figuras
		UNWIND (CASE WHEN size(figuras) > 0 THEN figuras ELSE [null] END) as fig
		OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(fig)
		WITH r, fig, p
		ORDER BY coalesce(fig.orden_narrativo, 0) ASC, p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC
		WITH fig, collect(p)[0] as primeraPiezaFigura
		WHERE primeraPiezaFigura IS NOT NULL
		RETURN primeraPiezaFigura as startNode, fig

		UNION

		WITH r, figuras
		MATCH (p:Pieza)-[:PERTENECE_A]->(r)
		WITH p
		ORDER BY p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC LIMIT 1
		RETURN p as startNode, null as fig
}

RETURN
	startNode { .*, id: startNode.serial, etiqueta: labels(startNode)[0] } as node,
	CASE WHEN fig IS NOT NULL THEN fig { .*, id: fig.serial, etiqueta: labels(fig)[0] } ELSE null END as figura,
	r.tipo_estructura as tipo_estructura
ORDER BY coalesce(figura.orden_narrativo, 0) ASC;
```

### Vecinos por CONECTA_CON y SIGUIENTE

```cypher
MATCH (p:Pieza {serial: $pieceId})-[rel:CONECTA_CON|SIGUIENTE]-(vecino:Pieza)
WHERE ($presentOnly = false) OR (vecino.presente = true)
RETURN
		vecino { .*, id: vecino.serial, etiqueta: labels(vecino)[0] } as node,
		type(rel) as tipoRel,
		rel.lado as lado,
		startNode(rel) = p as soy_origen;
```

### Inferencia de piezas faltantes

```cypher
MATCH (falta:Pieza {presente: false, rompecabezas_serial: $puzzleId})
OPTIONAL MATCH (falta)-[c:CONECTA_CON]-(vecino:Pieza {presente: true})
WITH falta, collect(
	CASE WHEN vecino IS NULL THEN null
	ELSE {
		vecino_id: vecino.serial,
		dir_desde_falta: CASE
			WHEN startNode(c) = falta THEN c.lado
			ELSE CASE c.lado
				WHEN 'derecha'    THEN 'izquierda'
				WHEN 'izquierda'  THEN 'derecha'
				WHEN 'arriba'     THEN 'abajo'
				WHEN 'abajo'      THEN 'arriba'
			END
		END,
		encaje_vecino_hacia_falta: CASE
			WHEN startNode(c) = falta THEN
				CASE c.lado
					WHEN 'derecha'   THEN vecino.lado_izquierda
					WHEN 'izquierda' THEN vecino.lado_derecha
					WHEN 'arriba'    THEN vecino.lado_abajo
					WHEN 'abajo'     THEN vecino.lado_arriba
				END
			ELSE
				CASE c.lado
					WHEN 'derecha'   THEN vecino.lado_derecha
					WHEN 'izquierda' THEN vecino.lado_izquierda
					WHEN 'arriba'    THEN vecino.lado_arriba
					WHEN 'abajo'     THEN vecino.lado_abajo
				END
		END
	}
	END
) AS conexiones_raw
RETURN
	falta.serial              AS faltante_id,
	falta.rompecabezas_serial AS rompecabezas,
	falta.descripcion         AS descripcion,
	falta.fila                AS fila,
	falta.columna             AS columna,
	falta.numero              AS numero,
	falta.tipo                AS tipo_esperado,
	[c IN conexiones_raw WHERE c IS NOT NULL] AS conexiones;
```

## Algoritmo BFS

El armado utiliza un BFS para recorrer piezas conectadas de forma deterministica. El flujo general es:

1. Obtener una o varias piezas iniciales (dependiendo de si existen figuras).
2. Insertar las piezas iniciales en una cola y marcar como visitadas.
3. Mientras la cola tenga elementos, consultar vecinos por `CONECTA_CON` y `SIGUIENTE`.
4. Para cada vecino no visitado, registrar el paso y agregarlo a la cola.

La salida es una lista de pasos de armado, usada por la UI. La complejidad es $O(V + E)$, donde $V$ son piezas y $E$ relaciones entre piezas.

## Manejo de piezas faltantes

Se soporta un modo parcial que omite piezas con `presente = false`. El reporte consolida:

- Piezas faltantes con lados inferidos.
- Estado de completitud por figura o por puzzle.
- Regiones aisladas (componentes conexos).
- Pasos de armado parcial para piezas presentes.

Esto permite detectar cuando un puzzle queda dividido por faltantes y estimar los lados de una pieza ausente a partir de sus vecinos presentes.

## Evidencias visuales

- [INSERTAR CAPTURA AQUI] Aplicacion de constraints e indices en AuraDB.
- [INSERTAR CAPTURA AQUI] Ejecucion de carga CSV (02_load_csv.cypher).
- [INSERTAR CAPTURA AQUI] Verificacion general (04_verificar.cypher).
- [INSERTAR CAPTURA AQUI] Armado BFS en consola o frontend.
- [INSERTAR CAPTURA AQUI] Reporte de piezas faltantes.
- [INSERTAR CAPTURA AQUI] Vista general del frontend.

## Como replicar la solucion

1. Crear un `.env` local desde `.env.example` en `backend/` y `database/`.
2. Ejecutar en Neo4j Browser o `cypher-shell`:
	 - `database/schema/00_schema.cypher`
	 - `database/seeds/01_reset.cypher` (opcional)
	 - `database/seeds/02_load_csv.cypher`
	 - `database/verify/04_verificar.cypher`
3. Verificar conteos finales (8 rompecabezas, 139 piezas, 9 figuras, 184 CONECTA_CON, 30 SIGUIENTE).
4. Levantar backend y frontend para visualizar resultados.
5. Capturar evidencias y documentar resultados.

## Conclusiones

El modelo en grafo representa de forma natural la estructura de un rompecabezas y permite validar consistencia sin consultas complejas de joins. La combinacion de relaciones fisicas y secuenciales facilita tanto el armado completo como el parcial. La carga desde CSV asegura reproducibilidad y el esquema con constraints garantiza unicidad.

El BFS se comporta de manera determinista y produce un registro de armado util para la UI y para auditoria. El manejo de piezas faltantes agrega valor al identificar regiones aisladas y estimar encajes, lo que seria costoso en un modelo relacional.

Como trabajo futuro se recomienda automatizar pruebas de consistencia, agregar validaciones de integridad adicionales (por ejemplo, lados compatibles en vertical y horizontal) y registrar historicos de cambios cuando se marcan piezas como faltantes.
