// =====================================================================
// PROYECTO 03 - BD2 - UVG
// Script 00: Schema (constraints e indices)
// Persona 2 - Implementador de BD
// =====================================================================
// Ejecutar primero. Idempotente: se puede correr varias veces sin error.
// La clave de negocio de cada nodo es 'serial' (no 'id', para no confundir
// con el element id interno de Neo4j).
// =====================================================================

// Limpia constraints/indices de la version anterior basada en 'id'
DROP CONSTRAINT rompecabezas_id IF EXISTS;
DROP CONSTRAINT figura_id IF EXISTS;
DROP CONSTRAINT pieza_id IF EXISTS;
DROP INDEX pieza_rc IF EXISTS;

CREATE CONSTRAINT rompecabezas_serial IF NOT EXISTS
FOR (r:Rompecabezas) REQUIRE r.serial IS UNIQUE;

CREATE CONSTRAINT figura_serial IF NOT EXISTS
FOR (f:Figura) REQUIRE f.serial IS UNIQUE;

CREATE CONSTRAINT pieza_serial IF NOT EXISTS
FOR (p:Pieza) REQUIRE p.serial IS UNIQUE;

CREATE INDEX pieza_presente IF NOT EXISTS
FOR (p:Pieza) ON (p.presente);

CREATE INDEX pieza_numero IF NOT EXISTS
FOR (p:Pieza) ON (p.numero);

CREATE INDEX pieza_rc IF NOT EXISTS
FOR (p:Pieza) ON (p.rompecabezas_serial);
