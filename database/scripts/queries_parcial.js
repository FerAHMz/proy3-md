/**
 * Queries Cypher para el modo de armado parcial (piezas faltantes).
 * Complementan queries.js sin modificarlo.
 */

// Variante de getStartingPiecesQuery que sólo considera piezas con presente=true como nodo inicial.
export const getStartingPiecesPartialQuery = `
  MATCH (r:Rompecabezas {serial: $puzzleId})
  OPTIONAL MATCH (f:Figura)-[:EN]->(r)
  WITH r, collect(f) as figuras

  CALL (r, figuras) {
      WITH r, figuras
      UNWIND (CASE WHEN size(figuras) > 0 THEN figuras ELSE [null] END) as fig
      OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(fig)
      WHERE p.presente = true
      WITH r, fig, p
      ORDER BY coalesce(fig.orden_narrativo, 0) ASC, p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC
      WITH fig, collect(p)[0] as primeraPiezaFigura
      WHERE primeraPiezaFigura IS NOT NULL
      RETURN primeraPiezaFigura as startNode, fig

      UNION

      WITH r, figuras
      MATCH (p:Pieza)-[:PERTENECE_A]->(r)
      WHERE p.presente = true
      WITH p
      ORDER BY p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC LIMIT 1
      RETURN p as startNode, null as fig
  }

  RETURN
    startNode { .*, id: startNode.serial, etiqueta: labels(startNode)[0] } as node,
    CASE WHEN fig IS NOT NULL THEN fig { .*, id: fig.serial, etiqueta: labels(fig)[0] } ELSE null END as figura,
    r.tipo_estructura as tipo_estructura
  ORDER BY coalesce(figura.orden_narrativo, 0) ASC
`;

// Para cada pieza faltante del puzzle, devuelve sus vecinos presentes con información
// suficiente para inferir los lados de la pieza faltante en el cliente JS.
// La función JS debe aplicar invertEncaje(encaje_vecino_hacia_falta) para obtener
// el lado inferido de la faltante en la dirección dir_desde_falta.
export const getInferenciaPiezasQuery = `
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
    falta.fila            AS fila,
    falta.columna         AS columna,
    falta.numero          AS numero,
    falta.tipo            AS tipo_esperado,
    [c IN conexiones_raw WHERE c IS NOT NULL] AS conexiones
`;

// Estado de completitud por figura. Para puzzles con figuras devuelve una fila por figura;
// para puzzles sin figuras (grids) no devuelve filas (usar getEstadoPuzzleQuery en ese caso).
export const getEstadoFigurasQuery = `
  MATCH (f:Figura)-[:EN]->(r:Rompecabezas {serial: $puzzleId})
  OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(f)
  WITH f,
       f.num_piezas AS esperadas,
       sum(CASE WHEN p.presente THEN 1 ELSE 0 END) AS presentes
  RETURN f.serial    AS id,
         f.nombre    AS nombre,
         esperadas,
         presentes,
         (esperadas - presentes) AS faltantes,
         CASE WHEN presentes < esperadas THEN 'incompleta' ELSE 'completa' END AS estado
  ORDER BY f.orden_narrativo
`;

// Estado de completitud a nivel de puzzle (fallback cuando no hay figuras, ej. grids).
export const getEstadoPuzzleQuery = `
  MATCH (r:Rompecabezas {serial: $puzzleId})
  OPTIONAL MATCH (p:Pieza)-[:PERTENECE_A]->(r)
  WITH r,
       r.total_piezas AS esperadas,
       sum(CASE WHEN p.presente THEN 1 ELSE 0 END) AS presentes
  RETURN r.serial AS id,
         r.nombre AS nombre,
         esperadas,
         presentes,
         (esperadas - presentes) AS faltantes,
         CASE WHEN presentes < r.total_piezas THEN 'incompleto' ELSE 'completo' END AS estado
`;

// Componente conexo que contiene la pieza $seedId (sólo piezas presentes).
// Intento principal: usa APOC para travesía eficiente.
export const getComponenteQueryAPOC = `
  MATCH (seed:Pieza {serial: $seedId, presente: true})
  CALL apoc.path.subgraphNodes(seed, {
    relationshipFilter: 'CONECTA_CON',
    labelFilter: '+Pieza'
  }) YIELD node
  WHERE node.presente = true
  RETURN collect(DISTINCT node.serial) AS componente
`;

// Componente conexo que contiene la pieza $seedId usando sólo Cypher puro (fallback).
export const getComponenteQueryPuro = `
  MATCH (seed:Pieza {serial: $seedId, presente: true})
  MATCH path = (seed)-[:CONECTA_CON*0..]-(p:Pieza)
  WHERE ALL(nodo IN nodes(path) WHERE nodo.presente = true)
  RETURN collect(DISTINCT p.serial) AS componente
`;

// Puente SIGUIENTE para rescatar piezas presentes aisladas cuando faltantes
// rompen la conectividad física. La cadena puede atravesar piezas faltantes
// como intermedias (ALL ... presente = false), efectivamente saltándolas.
// Devuelve el puente más corto disponible.
export const getSiguienteBridgeQuery = `
  MATCH (visitada:Pieza {presente: true})
  WHERE visitada.rompecabezas_serial = $puzzleId
    AND visitada.serial IN $visitedArr
  MATCH path = (visitada)-[:SIGUIENTE*1..15]-(pendiente:Pieza {presente: true})
  WHERE pendiente.rompecabezas_serial = $puzzleId
    AND NOT pendiente.serial IN $visitedArr
    AND ALL(n IN nodes(path)[1..-1] WHERE n.presente = false)
  RETURN visitada.serial AS desde,
         pendiente.serial AS hacia,
         length(path) AS hops,
         [n IN nodes(path)[1..-1] | n.serial] AS faltantesIntermedias
  ORDER BY hops
  LIMIT 1
`;
