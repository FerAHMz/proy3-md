#!/usr/bin/env node
/**
 * CLI para marcar piezas como faltantes y obtener el reporte de P4.
 *
 * Uso:
 *   node scripts/marcar_faltantes.js <puzzleId> <pieza1,pieza2,...> [--mantener]
 *   node scripts/marcar_faltantes.js --reset
 *
 * Ejemplos:
 *   node scripts/marcar_faltantes.js RC001 P02-03
 *   node scripts/marcar_faltantes.js RC001 P02-03,P01-01,P04-06
 *   node scripts/marcar_faltantes.js RC005 P02          ← bridge de Zorro grande
 *   node scripts/marcar_faltantes.js RC001 P02-03 --mantener
 *   node scripts/marcar_faltantes.js --reset
 *
 * Las piezas pueden ser IDs cortos (P02-03) o completos (RC001-P02-03).
 */

import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMissingReport } from './armado_parcial.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const auth = {
  uri:      process.env.NEO4J_URI,
  user:     process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD,
};

// ─── Parsear argumentos ───────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length === 0 || (args.length === 1 && args[0] !== '--reset')) {
  console.log(`
Uso:
  node scripts/marcar_faltantes.js <puzzleId> <pieza1,pieza2,...> [--mantener]
  node scripts/marcar_faltantes.js --reset

Ejemplos:
  node scripts/marcar_faltantes.js RC001 P02-03
  node scripts/marcar_faltantes.js RC001 P02-03,P01-01
  node scripts/marcar_faltantes.js RC005 P02 --mantener
  node scripts/marcar_faltantes.js --reset
`);
  process.exit(0);
}

const soloReset  = args[0] === '--reset';
const mantener   = args.includes('--mantener');
const puzzleId   = soloReset ? null : args[0].toUpperCase();
const piezasRaw  = soloReset ? [] : (args[1] ?? '').split(',').filter(Boolean);

// Normalizar IDs: si no tienen el prefijo del puzzle, se lo ponemos
const piezaIds = piezasRaw.map(p =>
  p.toUpperCase().startsWith(puzzleId + '-') ? p.toUpperCase() : `${puzzleId}-${p.toUpperCase()}`
);

// ─── Helpers de driver ────────────────────────────────────────────────────────

async function runQuery(driver, query, params = {}) {
  const session = driver.session();
  try {
    return await session.run(query, params);
  } finally {
    await session.close();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));

  try {
    // ── Solo reset ────────────────────────────────────────────────────────────
    if (soloReset) {
      const r = await runQuery(driver, 'MATCH (p:Pieza {presente: false}) SET p.presente = true RETURN count(p) AS n');
      const n = r.records[0]?.get('n') ?? 0;
      console.log(`Reset completado: ${n} pieza(s) restauradas.`);
      return;
    }

    // ── Validar que el puzzle existe ──────────────────────────────────────────
    const checkR = await runQuery(driver,
      'MATCH (r:Rompecabezas {serial: $puzzleId}) RETURN r.nombre AS nombre',
      { puzzleId }
    );
    if (checkR.records.length === 0) {
      console.error(`Error: rompecabezas "${puzzleId}" no encontrado.`);
      process.exit(1);
    }
    console.log(`\nRompecabezas: ${checkR.records[0].get('nombre')} (${puzzleId})`);

    // ── Marcar piezas como faltantes ─────────────────────────────────────────
    const setR = await runQuery(driver,
      'MATCH (p:Pieza) WHERE p.serial IN $ids SET p.presente = false RETURN collect(p.serial) AS marcadas',
      { ids: piezaIds }
    );
    const marcadas = setR.records[0]?.get('marcadas') ?? [];
    const noEncontradas = piezaIds.filter(id => !marcadas.includes(id));

    if (noEncontradas.length > 0) {
      console.warn(`  Advertencia: no se encontraron ${noEncontradas.join(', ')}`);
    }
    console.log(`  Piezas marcadas como faltantes: ${marcadas.join(', ')}\n`);

    // ── Generar reporte ───────────────────────────────────────────────────────
    const reporte = await getMissingReport(puzzleId, auth);
    imprimirReporte(reporte);

    // ── Reset opcional ────────────────────────────────────────────────────────
    if (!mantener) {
      await runQuery(driver, 'MATCH (p:Pieza {presente: false}) SET p.presente = true');
      console.log('\n  (Piezas restauradas. Usa --mantener para conservarlas en la BD.)');
    } else {
      console.log('\n  (Piezas siguen marcadas como faltantes en la BD. Corre --reset para restaurar.)');
    }

  } finally {
    await driver.close();
  }
}

// ─── Imprimir reporte ─────────────────────────────────────────────────────────

function imprimirReporte({ faltantes, regiones_aisladas, armado_parcial, estado_figuras }) {
  // Estado de figuras
  console.log('Estado de figuras/puzzle:');
  for (const f of estado_figuras) {
    const icono = (f.estado === 'completa' || f.estado === 'completo') ? '✓' : '✗';
    const extra = f.faltantes > 0 ? ` — ${f.faltantes} faltante(s)` : '';
    console.log(`  ${icono} ${f.nombre}: ${f.presentes}/${f.esperadas} piezas${extra}`);
  }

  // Piezas faltantes con inferencias
  console.log(`\nPiezas faltantes (${faltantes.length}):`);
  for (const f of faltantes) {
    const label = f.descripcion ?? (f.fila ? `Pieza (${f.fila},${f.columna})` : f.numero ? `#${f.numero}` : f.id);
    console.log(`  • ${f.id} — "${label}" | tipo: ${f.tipo_esperado ?? 'n/a'}`);
    console.log(`    vecinos presentes: [${f.vecinos_presentes.join(', ')}]`);
    const i = f.inferencias_lado;
    console.log(`    lados inferidos:   ↑${i.lado_arriba}  ↓${i.lado_abajo}  ←${i.lado_izquierda}  →${i.lado_derecha}`);
  }

  // Regiones aisladas
  if (regiones_aisladas.length > 1) {
    console.log(`\nRegiones aisladas detectadas (${regiones_aisladas.length}):`);
    for (let i = 0; i < regiones_aisladas.length; i++) {
      const label = i === 0 ? 'principal' : `isla ${i}`;
      const ids = regiones_aisladas[i];
      const preview = ids.slice(0, 4).join(', ') + (ids.length > 4 ? `... (+${ids.length - 4})` : '');
      console.log(`  [${label}] ${ids.length} piezas: ${preview}`);
    }
  } else {
    console.log('\n  Sin regiones aisladas.');
  }

  // Pasos de armado
  const conexiones = armado_parcial.filter(l => l.startsWith('pieza'));
  console.log(`\nArmado parcial: ${conexiones.length} conexiones`);
  for (const linea of armado_parcial) console.log(`  ${linea}`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
