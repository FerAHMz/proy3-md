// =====================================================================
// Script 06: Reset de piezas faltantes
// Restaura presente=true en todas las piezas.
// Ejecutar después de cada escenario de demo.
// =====================================================================

MATCH (p:Pieza {presente: false}) SET p.presente = true;
