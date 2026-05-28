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
} from './queries_parcial.js';

// ─── helpers de sesión ───────────────────────────────────────────────────────

function openDriver(auth) {
  return neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));
}

// ─── BFS parcial ─────────────────────────────────────────────────────────────

/**
 * Arma el rompecabezas omitiendo las piezas con presente=false.
 * Devuelve un array de strings con los pasos de armado (compatible con assemblePuzzle).
 *
 * @param {string} puzzleId  - Ej: 'RC001'
 * @param {object} auth      - { uri, user, password }
 */
export async function assemblePuzzlePartial(puzzleId, auth) {
  const driver = openDriver(auth);
  const session = driver.session();
  const outputs = [];

  try {
    const resultStart = await session.run(getStartingPiecesPartialQuery, { puzzleId });

    if (resultStart.records.length === 0) {
      return [`Rompecabezas ${puzzleId}: sin piezas presentes para armar.`];
    }

    const structureType = resultStart.records[0].get('tipo_estructura');
    outputs.push(`--- Armado parcial de ${puzzleId} (${structureType}) ---`);

    const visited = new Set();

    for (const record of resultStart.records) {
      const startNode = record.get('node');
      const fig = record.get('figura');

      if (fig) {
        outputs.push(`\nArmando figura: ${fig.nombre}`);
      }

      const queue = [startNode.id];
      visited.add(startNode.id);
      outputs.push(`Colocando primera pieza: ${startNode.id}`);

      while (queue.length > 0) {
        const currentId = queue.shift();

        const neighborResult = await session.run(getNeighborsQuery, {
          pieceId: currentId,
          presentOnly: true,
        });

        for (const neighborRecord of neighborResult.records) {
          const neighbor = neighborRecord.get('node');
          const tipoRel = neighborRecord.get('tipoRel');
          const lado = neighborRecord.get('lado');
          const soyOrigen = neighborRecord.get('soy_origen');

          if (!visited.has(neighbor.id)) {
            visited.add(neighbor.id);
            queue.push(neighbor.id);

            if (tipoRel === 'CONECTA_CON') {
              const ladoConexion = soyOrigen ? lado : invertLado(lado);
              const ladoText = ladoConexion ? `por el lado ${ladoConexion}` : `por ensamblaje`;
              outputs.push(`pieza ${currentId} se ensambla con ${neighbor.id} ${ladoText}`);
            } else if (tipoRel === 'SIGUIENTE') {
              outputs.push(`pieza ${currentId} se ensambla con la siguiente pieza de la secuencia: ${neighbor.id}`);
            }
          }
        }
      }
    }

    outputs.push(`\n--- Armado parcial de ${puzzleId} finalizado (${visited.size} piezas) ---`);
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
export async function getMissingReport(puzzleId, auth) {
  const [faltantes, regiones_aisladas, armado_parcial, estado_figuras] = await Promise.all([
    inferMissingPieces(puzzleId, auth),
    detectIsolatedRegions(puzzleId, auth),
    assemblePuzzlePartial(puzzleId, auth),
    getFigurasStatus(puzzleId, auth),
  ]);

  return { faltantes, regiones_aisladas, armado_parcial, estado_figuras };
}
