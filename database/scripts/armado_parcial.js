import neo4j from 'neo4j-driver';
import { invertLado, invertEncaje } from './util_lados.js';
import { getNeighborsQuery } from './queries.js';
import {
  getStartingPiecesPartialQuery,
  getInferenciaPiezasQuery,
  getComponenteQueryAPOC,
  getComponenteQueryPuro,
  getEstadoFigurasQuery,
  getEstadoPuzzleQuery,
  getSiguienteBridgeQuery,
} from './queries_parcial.js';

// ─── helpers de sesión ───────────────────────────────────────────────────────

function openDriver(auth) {
  return neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));
}

// ─── BFS parcial ─────────────────────────────────────────────────────────────

// La pieza inicial del usuario debe estar presente.
const USER_START_PIECE_PARTIAL_QUERY = `
  MATCH (p:Pieza {serial: $startSerial, presente: true})-[:PERTENECE_A]->(r:Rompecabezas {serial: $puzzleId})
  OPTIONAL MATCH (p)-[:PARTE_DE]->(f:Figura)
  RETURN
    p { .*, id: p.serial, etiqueta: labels(p)[0] } AS node,
    CASE WHEN f IS NOT NULL THEN f { .*, id: f.serial, etiqueta: labels(f)[0] } ELSE null END AS figura,
    r.tipo_estructura AS tipo_estructura
`;

const OTHER_FIGURAS_START_PARTIAL_QUERY = `
  MATCH (f:Figura)-[:EN]->(r:Rompecabezas {serial: $puzzleId})
  WHERE f.serial <> $userFigSerial
  OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(f)
  WHERE p.presente = true
  WITH f, p
  ORDER BY coalesce(f.orden_narrativo, 0) ASC, p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC
  WITH f, collect(p)[0] AS primeraPieza
  WHERE primeraPieza IS NOT NULL
  RETURN
    primeraPieza { .*, id: primeraPieza.serial, etiqueta: labels(primeraPieza)[0] } AS node,
    f { .*, id: f.serial, etiqueta: labels(f)[0] } AS figura
  ORDER BY coalesce(f.orden_narrativo, 0)
`;

async function fetchStartingPiecesPartial(session, puzzleId, startSerial) {
  if (!startSerial) {
    const result = await session.run(getStartingPiecesPartialQuery, { puzzleId });
    return result.records.map(rec => ({
      node: rec.get('node'),
      figura: rec.get('figura'),
      tipo_estructura: rec.get('tipo_estructura'),
    }));
  }

  const userResult = await session.run(USER_START_PIECE_PARTIAL_QUERY, { puzzleId, startSerial });
  if (userResult.records.length === 0) {
    throw new Error(
      `Pieza ${startSerial} no pertenece a ${puzzleId} o está marcada como faltante.`
    );
  }

  const userNode = userResult.records[0].get('node');
  const userFigura = userResult.records[0].get('figura');
  const tipo_estructura = userResult.records[0].get('tipo_estructura');

  const out = [{ node: userNode, figura: userFigura, tipo_estructura }];

  if (userFigura) {
    const otrasResult = await session.run(OTHER_FIGURAS_START_PARTIAL_QUERY, {
      puzzleId,
      userFigSerial: userFigura.serial,
    });
    for (const rec of otrasResult.records) {
      out.push({
        node: rec.get('node'),
        figura: rec.get('figura'),
        tipo_estructura,
      });
    }
  }

  return out;
}

async function bfsCONECTA_CON(session, startId, visited, outputs) {
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const neighborResult = await session.run(getNeighborsQuery, {
      pieceId: currentId,
      presentOnly: true,
    });

    for (const rec of neighborResult.records) {
      const neighbor = rec.get('node');
      if (visited.has(neighbor.id)) continue;
      visited.add(neighbor.id);
      queue.push(neighbor.id);

      const lado = rec.get('lado');
      const soyOrigen = rec.get('soy_origen');
      const ladoConexion = soyOrigen ? lado : invertLado(lado);
      const ladoText = ladoConexion ? `por el lado ${ladoConexion}` : 'por ensamblaje';
      outputs.push(`pieza ${currentId} se ensambla con ${neighbor.id} ${ladoText}`);
    }
  }
}

// BFS que omite piezas con presente=false. Devuelve los pasos como strings.
export async function assemblePuzzlePartial(puzzleId, auth, options = {}) {
  const { startSerial = null } = options;
  const driver = openDriver(auth);
  const session = driver.session();
  const outputs = [];

  try {
    const startingPieces = await fetchStartingPiecesPartial(session, puzzleId, startSerial);

    if (startingPieces.length === 0) {
      return [`Rompecabezas ${puzzleId}: sin piezas presentes para armar.`];
    }

    const structureType = startingPieces[0].tipo_estructura;

    const faltantesResult = await session.run(
      'MATCH (p:Pieza {rompecabezas_serial: $puzzleId, presente: false}) RETURN count(p) AS n',
      { puzzleId }
    );
    const nRaw = faltantesResult.records[0].get('n');
    const numFaltantes = typeof nRaw === 'object' && nRaw.toNumber ? nRaw.toNumber() : nRaw;
    const label = numFaltantes > 0 ? 'Armado parcial' : 'Armado';

    outputs.push(`--- ${label} de ${puzzleId} (${structureType}) ---`);

    const visited = new Set();

    for (const { node: startNode, figura: fig } of startingPieces) {
      // Salta figuras alcanzadas vía CONECTA_CON desde una figura anterior.
      if (visited.has(startNode.id)) continue;

      if (fig) {
        outputs.push(`\nArmando figura: ${fig.nombre}`);
      }

      outputs.push(`Colocando primera pieza: ${startNode.id}`);
      await bfsCONECTA_CON(session, startNode.id, visited, outputs);
    }

    // Fallback SIGUIENTE: si faltantes dejaron piezas presentes inalcanzables,
    // puentea por orden numérico y reanuda BFS por CONECTA_CON.
    while (true) {
      const bridgeResult = await session.run(getSiguienteBridgeQuery, {
        puzzleId,
        visitedArr: [...visited],
      });
      if (bridgeResult.records.length === 0) break;

      const rec = bridgeResult.records[0];
      const desde = rec.get('desde');
      const hacia = rec.get('hacia');
      const intermedias = rec.get('faltantesIntermedias') ?? [];
      const salto = intermedias.length > 0
        ? `, saltando faltantes ${intermedias.join(', ')}`
        : '';
      outputs.push(`pieza ${desde} → ${hacia} por orden numérico (sin contacto físico${salto})`);
      await bfsCONECTA_CON(session, hacia, visited, outputs);
    }

    outputs.push(`\n--- ${label} de ${puzzleId} finalizado (${visited.size} piezas) ---`);
    return outputs;

  } finally {
    await session.close();
    await driver.close();
  }
}

// ─── Inferencia de lados ──────────────────────────────────────────────────────

/**
 * Devuelve la lista de piezas faltantes del puzzle junto con sus lados inferidos
 * a partir de los vecinos presentes.
 *
 * @returns {Array<{
 *   id: string, rompecabezas: string, fila: number|null, columna: number|null,
 *   tipo_esperado: string|null,
 *   vecinos_presentes: string[],
 *   inferencias_lado: {lado_arriba, lado_abajo, lado_izquierda, lado_derecha}
 * }>}
 */
export async function inferMissingPieces(puzzleId, auth) {
  const driver = openDriver(auth);
  const session = driver.session();

  try {
    const result = await session.run(getInferenciaPiezasQuery, { puzzleId });

    return result.records.map(record => {
      const conexiones = record.get('conexiones') ?? [];
      const inferencias = {
        lado_arriba:    'desconocido',
        lado_abajo:     'desconocido',
        lado_izquierda: 'desconocido',
        lado_derecha:   'desconocido',
      };
      const vecinosPresentes = [];

      for (const con of conexiones) {
        const dir = con.dir_desde_falta;
        const encaje = con.encaje_vecino_hacia_falta;
        if (dir) inferencias[`lado_${dir}`] = invertEncaje(encaje);
        if (con.vecino_id) vecinosPresentes.push(con.vecino_id);
      }

      return {
        id:               record.get('faltante_id'),
        descripcion:      record.get('descripcion') ?? null,
        rompecabezas:     record.get('rompecabezas'),
        fila:             record.get('fila')    ?? null,
        columna:          record.get('columna') ?? null,
        numero:           record.get('numero')  ?? null,
        tipo_esperado:    record.get('tipo_esperado') ?? null,
        vecinos_presentes: vecinosPresentes,
        inferencias_lado: inferencias,
      };
    });

  } finally {
    await session.close();
    await driver.close();
  }
}

// ─── Regiones aisladas ────────────────────────────────────────────────────────

/**
 * Devuelve los componentes conexos de piezas presentes.
 * El primero es el componente principal (el más grande).
 * Los demás son islas causadas por piezas faltantes.
 *
 * @returns {string[][]}  Array de arrays de IDs.
 */
export async function detectIsolatedRegions(puzzleId, auth) {
  const driver = openDriver(auth);
  const session = driver.session();

  try {
    // Obtener todos los IDs de piezas presentes
    const allResult = await session.run(
      'MATCH (p:Pieza {rompecabezas_serial: $puzzleId, presente: true}) RETURN collect(p.serial) AS todos',
      { puzzleId }
    );

    const todos = allResult.records[0]?.get('todos') ?? [];
    if (todos.length === 0) return [];

    const remaining = new Set(todos);
    const components = [];

    while (remaining.size > 0) {
      const seedId = [...remaining][0];

      // Usamos sólo Cypher puro: APOC traversa por nodos faltantes y daría falsos positivos.
      const r = await session.run(getComponenteQueryPuro, { seedId });
      const componentIds = r.records[0]?.get('componente') ?? [seedId];

      components.push(componentIds);
      for (const id of componentIds) remaining.delete(id);
    }

    // Poner el componente más grande primero (el "principal")
    components.sort((a, b) => b.length - a.length);
    return components;

  } finally {
    await session.close();
    await driver.close();
  }
}

// ─── Estado de figuras ────────────────────────────────────────────────────────

/**
 * Devuelve el conteo de piezas presentes vs esperadas por figura.
 * Para puzzles sin figuras (grids) devuelve el conteo total del puzzle.
 *
 * @returns {Array<{id, nombre, esperadas, presentes, faltantes, estado}>}
 */
export async function getFigurasStatus(puzzleId, auth) {
  const driver = openDriver(auth);
  const session = driver.session();

  try {
    const r = await session.run(getEstadoFigurasQuery, { puzzleId });

    if (r.records.length > 0) {
      return r.records.map(rec => ({
        id:        rec.get('id'),
        nombre:    rec.get('nombre'),
        esperadas: rec.get('esperadas'),
        presentes: rec.get('presentes'),
        faltantes: rec.get('faltantes'),
        estado:    rec.get('estado'),
      }));
    }

    // Sin figuras: devolver estado global del puzzle
    const rp = await session.run(getEstadoPuzzleQuery, { puzzleId });
    return rp.records.map(rec => ({
      id:        rec.get('id'),
      nombre:    rec.get('nombre'),
      esperadas: rec.get('esperadas'),
      presentes: rec.get('presentes'),
      faltantes: rec.get('faltantes'),
      estado:    rec.get('estado'),
    }));

  } finally {
    await session.close();
    await driver.close();
  }
}

// ─── Reporte consolidado ──────────────────────────────────────────────────────

/**
 * Genera el reporte completo de piezas faltantes.
 * La UI (P6) llama esta función una sola vez al activar el modo "marcar faltantes".
 *
 * @returns {{
 *   faltantes: ReturnType<inferMissingPieces>,
 *   regiones_aisladas: string[][],
 *   armado_parcial: string[]
 * }}
 */
export async function getMissingReport(puzzleId, auth, options = {}) {
  const { startSerial = null } = options;
  const [faltantes, regiones_aisladas, armado_parcial, estado_figuras] = await Promise.all([
    inferMissingPieces(puzzleId, auth),
    detectIsolatedRegions(puzzleId, auth),
    assemblePuzzlePartial(puzzleId, auth, { startSerial }),
    getFigurasStatus(puzzleId, auth),
  ]);

  return { faltantes, regiones_aisladas, armado_parcial, estado_figuras };
}
