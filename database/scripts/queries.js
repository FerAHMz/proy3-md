/**
 * Consultas Cypher para el armado de rompecabezas.
 */

// Query principal: obtiene el rompecabezas y las piezas iniciales
// Si tiene figuras (figura_libre, mixto), devuelve la primera pieza de cada figura.
// Si no tiene figuras (grid, secuencial), devuelve la primera pieza del rompecabezas.
export const getStartingPiecesQuery = `
  MATCH (r:Rompecabezas {id: $puzzleId})
  // Encontrar figuras si existen
  OPTIONAL MATCH (f:Figura)-[:EN]->(r)
  WITH r, collect(f) as figuras
  
  // Aislar el scope de la subconsulta
  CALL (r, figuras) {
      // 1. Caso: Rompecabezas con Figuras
      WITH r, figuras
      UNWIND (CASE WHEN size(figuras) > 0 THEN figuras ELSE [null] END) as fig
      OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(fig)
      // Ordenar para garantizar determinismo al iniciar
      WITH r, fig, p 
      ORDER BY coalesce(fig.orden_narrativo, 0) ASC, p.numero ASC, p.fila ASC, p.columna ASC, p.id ASC
      WITH fig, collect(p)[0] as primeraPiezaFigura
      WHERE primeraPiezaFigura IS NOT NULL
      RETURN primeraPiezaFigura as startNode, fig
      
      UNION
      
      // 2. Caso: Rompecabezas Sin Figuras (Grid o Secuencial simple)
      WITH r, figuras
      MATCH (p:Pieza)-[:PERTENECE_A]->(r)
      WITH p 
      ORDER BY p.numero ASC, p.fila ASC, p.columna ASC, p.id ASC LIMIT 1
      RETURN p as startNode, null as fig
  }
  
  // Retornar nodos listos para la UI con sus etiquetas reales
  RETURN 
    startNode { .*, id: startNode.id, etiqueta: labels(startNode)[0] } as node, 
    CASE WHEN fig IS NOT NULL THEN fig { .*, id: fig.id, etiqueta: labels(fig)[0] } ELSE null END as figura,
    r.tipo_estructura as tipo_estructura
  ORDER BY coalesce(figura.orden_narrativo, 0) ASC
`;

// Query de vecinos: obtiene las piezas conectadas físicamente (CONECTA_CON)
// o lógicamente (SIGUIENTE). Pasar $presentOnly = true para omitir piezas faltantes.
export const getNeighborsQuery = `
  MATCH (p:Pieza {id: $pieceId})-[rel:CONECTA_CON|SIGUIENTE]-(vecino:Pieza)
  WHERE ($presentOnly = false) OR (vecino.presente = true)
  RETURN
      vecino { .*, id: vecino.id, etiqueta: labels(vecino)[0] } as node,
      type(rel) as tipoRel,
      rel.lado as lado,
      startNode(rel) = p as soy_origen
`;
