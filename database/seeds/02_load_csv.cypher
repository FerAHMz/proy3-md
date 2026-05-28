// =====================================================================
// Script 02: Carga toda la data desde los CSVs publicados en GitHub raw.
// Reemplaza a los antiguos 02_seed_grids.cypher y 03_seed_irregulares.cypher.
//
// Fuente: https://github.com/FerAHMz/proy3-md (rama main, carpeta database/data).
// LOAD CSV requiere que el repo este publico y que los CSVs hayan sido
// pusheados antes de correr este script.
//
// Orden de carga:
//   1) Rompecabezas (nodos)
//   2) Figuras (nodos)
//   3) Piezas (nodos)
//   4) Relaciones: EN, PERTENECE_A, PARTE_DE, SIGUIENTE, CONECTA_CON
// =====================================================================


// ---------- 1) Nodos Rompecabezas ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/rompecabezas.csv' AS row
MERGE (r:Rompecabezas {id: row.id})
SET r.nombre = row.nombre,
    r.tematica = row.tematica,
    r.tipo_estructura = row.tipo_estructura,
    r.total_piezas = toInteger(row.total_piezas),
    r.num_figuras = toInteger(row.num_figuras),
    r.filas = CASE WHEN row.filas = '' THEN null ELSE toInteger(row.filas) END,
    r.columnas = CASE WHEN row.columnas = '' THEN null ELSE toInteger(row.columnas) END;


// ---------- 2) Nodos Figura ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/figuras.csv' AS row
MERGE (f:Figura {id: row.id})
SET f.nombre = row.nombre,
    f.num_piezas = toInteger(row.num_piezas),
    f.orden_narrativo = toInteger(row.orden_narrativo);


// ---------- 3) Nodos Pieza ----------
// Las columnas que no aplican al tipo de rompecabezas vienen vacias en el
// CSV y se mapean a null aqui.
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/piezas.csv' AS row
MERGE (p:Pieza {id: row.id})
SET p.rompecabezas_id = row.rompecabezas_id,
    p.tipo = row.tipo,
    p.forma = row.forma,
    p.presente = (row.presente = 'true'),
    p.descripcion = row.descripcion,
    p.fila    = CASE WHEN row.fila    = '' THEN null ELSE toInteger(row.fila)    END,
    p.columna = CASE WHEN row.columna = '' THEN null ELSE toInteger(row.columna) END,
    p.numero  = CASE WHEN row.numero  = '' THEN null ELSE toInteger(row.numero)  END,
    p.lado_arriba    = CASE WHEN row.lado_arriba    = '' THEN null ELSE row.lado_arriba    END,
    p.lado_abajo     = CASE WHEN row.lado_abajo     = '' THEN null ELSE row.lado_abajo     END,
    p.lado_izquierda = CASE WHEN row.lado_izquierda = '' THEN null ELSE row.lado_izquierda END,
    p.lado_derecha   = CASE WHEN row.lado_derecha   = '' THEN null ELSE row.lado_derecha   END;


// ---------- 4) Relacion EN (Figura -> Rompecabezas) ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/en.csv' AS row
MATCH (f:Figura {id: row.figura_id})
MATCH (r:Rompecabezas {id: row.rompecabezas_id})
MERGE (f)-[:EN]->(r);


// ---------- 5) Relacion PERTENECE_A (Pieza -> Rompecabezas) ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/pertenece_a.csv' AS row
MATCH (p:Pieza {id: row.pieza_id})
MATCH (r:Rompecabezas {id: row.rompecabezas_id})
MERGE (p)-[:PERTENECE_A]->(r);


// ---------- 6) Relacion PARTE_DE (Pieza -> Figura) ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/parte_de.csv' AS row
MATCH (p:Pieza {id: row.pieza_id})
MATCH (f:Figura {id: row.figura_id})
MERGE (p)-[:PARTE_DE]->(f);


// ---------- 7) Relacion SIGUIENTE (Pieza -> Pieza) ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/siguiente.csv' AS row
MATCH (a:Pieza {id: row.from_pieza_id})
MATCH (b:Pieza {id: row.to_pieza_id})
MERGE (a)-[:SIGUIENTE]->(b);


// ---------- 8) Relacion CONECTA_CON (Pieza -> Pieza con lado) ----------
LOAD CSV WITH HEADERS FROM
  'https://raw.githubusercontent.com/FerAHMz/proy3-md/main/database/data/conecta_con.csv' AS row
MATCH (a:Pieza {id: row.from_pieza_id})
MATCH (b:Pieza {id: row.to_pieza_id})
MERGE (a)-[:CONECTA_CON {lado: row.lado}]->(b);
