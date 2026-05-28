// =====================================================================
// Script 05: Escenarios de demo para el modo "marcar faltantes"
//
// Descomenta UNO de los tres bloques antes de ejecutar manualmente.
// test_parcial.js aplica y resetea cada caso automáticamente.
//
// Caso 1 – RC001 | 1 pieza interior faltante | sin regiones aisladas
// Caso 2 – RC001 | 2 esquinas faltantes (no conectores) | sin aislar
// Caso 3 – RC004 | fila 2 completa (6 piezas) | crea 2 regiones aisladas
// =====================================================================


// ─── Caso 1 ───────────────────────────────────────────────────────────────────
// Rompecabezas: RC001 (grid 4×6, Animales del Bosque)
// Pieza:  RC001-P02-03  →  tipo=interior, fila=2, col=3
// Esperado: 4 vecinos presentes, 4 lados completamente inferidos, 0 regiones aisladas.

MATCH (p:Pieza {serial: 'RC001-P02-03'}) SET p.presente = false;


// ─── Caso 2 ───────────────────────────────────────────────────────────────────
// Rompecabezas: RC001 (grid 4×6)
// Piezas: P01-01 (esquina top-left) y P04-06 (esquina bottom-right)
// Esperado: 2 faltantes, cada una con 2 vecinos presentes (sus lados internos),
//           0 regiones aisladas (el grid sigue siendo conexo sin las esquinas).

// MATCH (p:Pieza) WHERE p.serial IN ['RC001-P01-01', 'RC001-P04-06'] SET p.presente = false;


// ─── Caso 3 ───────────────────────────────────────────────────────────────────
// Rompecabezas: RC004 (grid 4×6, Vehículos Divertidos)
// Piezas: fila 2 completa (6 piezas) — parte el grid en fila 1 vs filas 3-4.
// Esperado: 6 faltantes, 2 regiones aisladas:
//   - componente A: fila 1  [RC004-P01-01..RC004-P01-06]  (6 piezas)
//   - componente B: filas 3-4 [RC004-P03-01..RC004-P04-06] (12 piezas)

// MATCH (p:Pieza) WHERE p.serial IN ['RC004-P02-01','RC004-P02-02','RC004-P02-03','RC004-P02-04','RC004-P02-05','RC004-P02-06'] SET p.presente = false;
