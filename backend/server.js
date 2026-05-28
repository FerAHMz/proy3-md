import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import neo4j from 'neo4j-driver';
import path from 'path';
import { fileURLToPath } from 'url';

import { assemblePuzzle } from '../database/scripts/bfs.js';
import { getMissingReport } from '../database/scripts/armado_parcial.js';
import {
  getStartingPiecesQuery,
  getNeighborsQuery,
} from '../database/scripts/queries.js';
import {
  getStartingPiecesPartialQuery,
  getInferenciaPiezasQuery,
  getEstadoFigurasQuery,
  getEstadoPuzzleQuery,
  getComponenteQueryPuro,
} from '../database/scripts/queries_parcial.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const auth = {
  uri:      process.env.NEO4J_URI,
  user:     process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD,
};

if (!auth.uri || !auth.user || !auth.password) {
  console.error('Faltan credenciales en backend/.env (NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD)');
  process.exit(1);
}

const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password), {
  disableLosslessIntegers: true,
});

// ─── helpers ──────────────────────────────────────────────────────────────────

async function runQuery(query, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(query, params);
    return result.records;
  } finally {
    await session.close();
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// Convierte recursivamente Neo4j Integer -> Number para los scripts que abren
// sus propios drivers sin disableLosslessIntegers.
function serialize(value) {
  if (value === null || value === undefined) return value;
  if (neo4j.isInt(value)) return value.toNumber();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === 'object') {
    const out = {};
    for (const k of Object.keys(value)) out[k] = serialize(value[k]);
    return out;
  }
  return value;
}

// ─── endpoints ────────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Listado de rompecabezas.
app.get('/api/puzzles', asyncHandler(async (req, res) => {
  const records = await runQuery(`
    MATCH (r:Rompecabezas)
    RETURN r {.*} AS r
    ORDER BY r.serial
  `);
  res.json({
    puzzles: records.map(rec => rec.get('r')),
    cypher_log: [
      { label: 'Listar rompecabezas',
        query: 'MATCH (r:Rompecabezas) RETURN r ORDER BY r.serial' },
    ],
  });
}));

// Detalle completo de un rompecabezas.
app.get('/api/puzzles/:id', asyncHandler(async (req, res) => {
  const puzzleId = req.params.id.toUpperCase();

  const rompecabezasRecs = await runQuery(
    'MATCH (r:Rompecabezas {serial: $puzzleId}) RETURN r {.*} AS r',
    { puzzleId }
  );

  if (rompecabezasRecs.length === 0) {
    return res.status(404).json({ error: `Rompecabezas ${puzzleId} no encontrado` });
  }

  const figuras = (await runQuery(`
    MATCH (f:Figura)-[:EN]->(r:Rompecabezas {serial: $puzzleId})
    RETURN f {.*} AS f
    ORDER BY f.orden_narrativo, f.serial
  `, { puzzleId })).map(rec => rec.get('f'));

  const piezas = (await runQuery(`
    MATCH (p:Pieza)-[:PERTENECE_A]->(r:Rompecabezas {serial: $puzzleId})
    OPTIONAL MATCH (p)-[:PARTE_DE]->(f:Figura)
    RETURN p {.*} AS p, f.serial AS figura_serial
    ORDER BY p.serial
  `, { puzzleId })).map(rec => ({
    ...rec.get('p'),
    figura_serial: rec.get('figura_serial') ?? null,
  }));

  const conecta_con = (await runQuery(`
    MATCH (a:Pieza {rompecabezas_serial: $puzzleId})-[c:CONECTA_CON]->(b:Pieza)
    RETURN a.serial AS from, b.serial AS to, c.lado AS lado
  `, { puzzleId })).map(rec => ({
    from: rec.get('from'),
    to: rec.get('to'),
    lado: rec.get('lado'),
  }));

  const siguiente = (await runQuery(`
    MATCH (a:Pieza {rompecabezas_serial: $puzzleId})-[:SIGUIENTE]->(b:Pieza)
    RETURN a.serial AS from, b.serial AS to
  `, { puzzleId })).map(rec => ({
    from: rec.get('from'),
    to: rec.get('to'),
  }));

  res.json({
    rompecabezas: rompecabezasRecs[0].get('r'),
    figuras,
    piezas,
    conecta_con,
    siguiente,
    cypher_log: [
      { label: 'Rompecabezas',
        query: 'MATCH (r:Rompecabezas {serial: $puzzleId}) RETURN r' },
      { label: 'Figuras',
        query: 'MATCH (f:Figura)-[:EN]->(r:Rompecabezas {serial: $puzzleId}) RETURN f' },
      { label: 'Piezas',
        query: 'MATCH (p:Pieza)-[:PERTENECE_A]->(r:Rompecabezas {serial: $puzzleId}) RETURN p' },
      { label: 'CONECTA_CON',
        query: 'MATCH (a:Pieza)-[c:CONECTA_CON]->(b:Pieza) WHERE a.rompecabezas_serial = $puzzleId RETURN a, c.lado, b' },
      { label: 'SIGUIENTE',
        query: 'MATCH (a:Pieza)-[:SIGUIENTE]->(b:Pieza) WHERE a.rompecabezas_serial = $puzzleId RETURN a, b' },
    ],
  });
}));

// Armado completo.
app.get('/api/puzzles/:id/assemble', asyncHandler(async (req, res) => {
  const puzzleId = req.params.id.toUpperCase();
  const pasos = await assemblePuzzle(puzzleId, auth);
  res.json({
    pasos,
    cypher_log: [
      { label: 'Pieza inicial', query: getStartingPiecesQuery },
      { label: 'Vecinos (BFS)', query: getNeighborsQuery,
        note: 'Se ejecuta una vez por pieza visitada' },
    ],
  });
}));

// Reporte de piezas faltantes + armado parcial.
app.get('/api/puzzles/:id/report', asyncHandler(async (req, res) => {
  const puzzleId = req.params.id.toUpperCase();
  const report = await getMissingReport(puzzleId, auth);
  res.json({
    ...serialize(report),
    cypher_log: [
      { label: 'Pieza inicial (parcial)', query: getStartingPiecesPartialQuery },
      { label: 'Vecinos presentes',       query: getNeighborsQuery,
        note: 'Una vez por pieza visitada, con presentOnly=true' },
      { label: 'Inferencia de lados',     query: getInferenciaPiezasQuery },
      { label: 'Estado de figuras',       query: getEstadoFigurasQuery },
      { label: 'Estado del puzzle',       query: getEstadoPuzzleQuery },
      { label: 'Componente conexo',       query: getComponenteQueryPuro,
        note: 'Una vez por isla detectada' },
    ],
  });
}));

// Toggle presente de una pieza (rúbrica 6).
app.post('/api/pieces/:serial/toggle', asyncHandler(async (req, res) => {
  const serial = req.params.serial.toUpperCase();
  const records = await runQuery(`
    MATCH (p:Pieza {serial: $serial})
    SET p.presente = NOT coalesce(p.presente, true)
    RETURN p.serial AS serial, p.presente AS presente
  `, { serial });

  if (records.length === 0) {
    return res.status(404).json({ error: `Pieza ${serial} no encontrada` });
  }

  res.json({
    serial: records[0].get('serial'),
    presente: records[0].get('presente'),
    cypher_log: [
      { label: 'Toggle presente',
        query: 'MATCH (p:Pieza {serial: $serial}) SET p.presente = NOT p.presente RETURN p' },
    ],
  });
}));

// Restaurar todas las piezas faltantes de un rompecabezas.
app.post('/api/puzzles/:id/restore', asyncHandler(async (req, res) => {
  const puzzleId = req.params.id.toUpperCase();
  const records = await runQuery(`
    MATCH (p:Pieza {rompecabezas_serial: $puzzleId, presente: false})
    SET p.presente = true
    RETURN count(p) AS n
  `, { puzzleId });

  res.json({
    restauradas: records[0].get('n'),
    cypher_log: [
      { label: 'Restaurar piezas',
        query: 'MATCH (p:Pieza {rompecabezas_serial: $puzzleId, presente: false}) SET p.presente = true' },
    ],
  });
}));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: err.message ?? 'error interno' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend escuchando en http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});
