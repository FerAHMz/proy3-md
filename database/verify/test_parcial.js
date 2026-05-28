import dotenv from 'dotenv';
import { getMissingReport } from '../scripts/armado_parcial.js';
import neo4j from 'neo4j-driver';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const auth = {
  uri:      process.env.NEO4J_URI,
  user:     process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD,
};

// ─── Escenarios de demo ───────────────────────────────────────────────────────

const ESCENARIOS = [
  {
    nombre: 'Caso 1 — RC001: 1 pieza interior faltante, sin regiones aisladas',
    puzzleId: 'RC001',
    faltantes: ['RC001-P02-03'],
    esperado: { numFaltantes: 1, tieneIslas: false },
  },
  {
    nombre: 'Caso 2 — RC001: 2 esquinas faltantes, sin regiones aisladas',
    puzzleId: 'RC001',
    faltantes: ['RC001-P01-01', 'RC001-P04-06'],
    esperado: { numFaltantes: 2, tieneIslas: false },
  },
  {
    nombre: 'Caso 3 — RC004: fila 2 completa faltante (6 piezas), 2 regiones aisladas',
    puzzleId: 'RC004',
    faltantes: ['RC004-P02-01', 'RC004-P02-02', 'RC004-P02-03', 'RC004-P02-04', 'RC004-P02-05', 'RC004-P02-06'],
    esperado: { numFaltantes: 6, tieneIslas: true },
  },
  {
    // figura_libre: siempre 3 componentes (una por figura). Quitar extremo P01 no añade islas.
    nombre: 'Caso 4 — RC005: pieza extremo faltante (P01), Zorro grande incompleta (2/3)',
    puzzleId: 'RC005',
    faltantes: ['RC005-P01'],
    esperado: { numFaltantes: 1, tieneIslas: true },
  },
  {
    // P02 es el único conector entre P01 y P03 → quitarlo fragmenta Zorro grande en 2 islas
    nombre: 'Caso 5 — RC005: pieza bridge faltante (P02), Zorro grande se parte en 2',
    puzzleId: 'RC005',
    faltantes: ['RC005-P02'],
    esperado: { numFaltantes: 1, tieneIslas: true },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function setFaltantes(driver, ids) {
  const session = driver.session();
  try {
    await session.run(
      'MATCH (p:Pieza) WHERE p.serial IN $ids SET p.presente = false',
      { ids }
    );
  } finally {
    await session.close();
  }
}

async function resetFaltantes(driver) {
  const session = driver.session();
  try {
    await session.run('MATCH (p:Pieza {presente: false}) SET p.presente = true');
  } finally {
    await session.close();
  }
}

function imprimir(reporte, esperado) {
  const { faltantes, regiones_aisladas, armado_parcial, estado_figuras } = reporte;

  console.log(`\n  Estado de figuras/puzzle:`);
  for (const f of estado_figuras) {
    const icono = f.estado === 'completa' || f.estado === 'completo' ? '✓' : '✗';
    console.log(`    ${icono} ${f.nombre}: ${f.presentes}/${f.esperadas} piezas${f.faltantes > 0 ? ` — ${f.faltantes} faltante(s)` : ''}`);
  }

  console.log(`\n  Piezas faltantes encontradas: ${faltantes.length}`);
  for (const f of faltantes) {
    console.log(`    • ${f.id} | tipo_esperado: ${f.tipo_esperado ?? 'n/a'}`);
    console.log(`      vecinos presentes: [${f.vecinos_presentes.join(', ')}]`);
    const inf = f.inferencias_lado;
    console.log(`      inferencias: arriba=${inf.lado_arriba}  abajo=${inf.lado_abajo}  izq=${inf.lado_izquierda}  der=${inf.lado_derecha}`);
  }

  console.log(`\n  Regiones conexas (${regiones_aisladas.length}):`);
  for (let i = 0; i < regiones_aisladas.length; i++) {
    const etiqueta = i === 0 ? 'principal' : `isla ${i}`;
    console.log(`    [${etiqueta}] ${regiones_aisladas[i].length} piezas: ${regiones_aisladas[i].slice(0, 4).join(', ')}${regiones_aisladas[i].length > 4 ? '...' : ''}`);
  }

  console.log(`\n  Pasos de armado parcial (${armado_parcial.filter(l => l.startsWith('pieza')).length} conexiones):`);
  for (const linea of armado_parcial) console.log(`    ${linea}`);

  // Validación básica
  const ok = faltantes.length === esperado.numFaltantes &&
             (esperado.tieneIslas ? regiones_aisladas.length > 1 : regiones_aisladas.length <= 1);
  console.log(`\n  ${ok ? '✓ OK' : '✗ FALLO'} — esperado: ${esperado.numFaltantes} faltante(s), islas=${esperado.tieneIslas}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function runTests() {
  const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));

  for (const escenario of ESCENARIOS) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${escenario.nombre}`);
    console.log('='.repeat(60));

    await resetFaltantes(driver);
    await setFaltantes(driver, escenario.faltantes);

    try {
      const reporte = await getMissingReport(escenario.puzzleId, auth);
      imprimir(reporte, escenario.esperado);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }

    await resetFaltantes(driver);
  }

  await driver.close();
  console.log('\nTodos los escenarios completados.');
}

runTests().catch(err => {
  console.error('Error en test_parcial.js:', err);
  process.exit(1);
});
