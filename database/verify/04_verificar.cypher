// =====================================================================
// Script 04: Verificacion post-seed
// Corre varias queries para confirmar que el grafo quedo consistente:
//   1) Resumen general por rompecabezas (esperadas vs reales).
//   2) Conexiones CONECTA_CON por rompecabezas.
//   3) Consistencia de lados en grids (debe retornar 0 filas).
//   4) Distribucion de tipos de pieza.
//   5) Piezas marcadas como faltantes (debe retornar 0 filas).
//   6) Test BFS desde una pieza del grid principal.
// =====================================================================

// 1) Resumen general por rompecabezas
MATCH (r:Rompecabezas)
OPTIONAL MATCH (p:Pieza)-[:PERTENECE_A]->(r)
OPTIONAL MATCH (f:Figura)-[:EN]->(r)
WITH r, count(DISTINCT p) AS piezas, count(DISTINCT f) AS figuras
RETURN r.id AS id,
       r.nombre AS nombre,
       r.tipo_estructura AS tipo,
       r.total_piezas AS esperadas,
       piezas AS reales,
       figuras AS num_figuras,
       CASE WHEN r.total_piezas = piezas THEN 'OK' ELSE 'MISMATCH' END AS estado
ORDER BY r.id;


// 2) Total de relaciones CONECTA_CON por rompecabezas
MATCH (a:Pieza)-[:CONECTA_CON]-(b:Pieza)
WHERE a.rompecabezas_id = b.rompecabezas_id
RETURN a.rompecabezas_id AS rompecabezas, count(*) / 2 AS conexiones
ORDER BY rompecabezas;


// 3) Verificar consistencia de lados en GRIDS
// Si A.lado_derecha=saliente entonces vecino.lado_izquierda debe ser abertura.
// (Debe retornar 0 filas si todo esta bien.)
MATCH (a:Pieza)-[c:CONECTA_CON {lado: 'derecha'}]->(b:Pieza)
WHERE a.lado_derecha IS NOT NULL
WITH a, b, c,
     CASE
       WHEN a.lado_derecha = 'saliente' AND b.lado_izquierda = 'abertura' THEN 'OK'
       WHEN a.lado_derecha = 'abertura' AND b.lado_izquierda = 'saliente' THEN 'OK'
       ELSE 'INCONSISTENTE'
     END AS check_h
WHERE check_h = 'INCONSISTENTE'
RETURN a.id, a.lado_derecha, b.id, b.lado_izquierda;


// 4) Distribucion de tipos de pieza
MATCH (p:Pieza)
RETURN p.rompecabezas_id AS rompecabezas, p.tipo AS tipo, count(*) AS cantidad
ORDER BY rompecabezas, tipo;


// 5) Listar piezas marcadas como faltantes (presente=false).
// (Debe retornar 0 filas inicialmente.)
MATCH (p:Pieza)
WHERE p.presente = false
RETURN p.id, p.rompecabezas_id, p.descripcion;


// 6) Test BFS desde una pieza del grid principal
MATCH (inicio:Pieza {id: 'RC001-P02-03'})
MATCH path = (inicio)-[:CONECTA_CON*0..]-(siguiente:Pieza)
WHERE ALL(p IN nodes(path) WHERE p.presente = true)
WITH siguiente, min(length(path)) AS paso
RETURN paso, siguiente.id AS pieza
ORDER BY paso, siguiente.id
LIMIT 24;
