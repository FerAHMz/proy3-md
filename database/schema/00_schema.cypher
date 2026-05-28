// =====================================================================
// PROYECTO 03 - BD2 - UVG
// Script 00: Schema (constraints e índices)
// Persona 2 - Implementador de BD
// =====================================================================
// Ejecutar primero. Idempotente: se puede correr varias veces sin error.
// =====================================================================

CREATE CONSTRAINT rompecabezas_id IF NOT EXISTS
FOR (r:Rompecabezas) REQUIRE r.id IS UNIQUE;

CREATE CONSTRAINT figura_id IF NOT EXISTS
FOR (f:Figura) REQUIRE f.id IS UNIQUE;

CREATE CONSTRAINT pieza_id IF NOT EXISTS
FOR (p:Pieza) REQUIRE p.id IS UNIQUE;

CREATE INDEX pieza_presente IF NOT EXISTS
FOR (p:Pieza) ON (p.presente);

CREATE INDEX pieza_numero IF NOT EXISTS
FOR (p:Pieza) ON (p.numero);

CREATE INDEX pieza_rc IF NOT EXISTS
FOR (p:Pieza) ON (p.rompecabezas_id);
