import neo4j from 'neo4j-driver';
import { getStartingPiecesQuery, getNeighborsQuery } from './queries.js';
import { invertLado } from './util_lados.js';

const USER_START_PIECE_QUERY = `
  MATCH (p:Pieza {serial: $startSerial})-[:PERTENECE_A]->(r:Rompecabezas {serial: $puzzleId})
  OPTIONAL MATCH (p)-[:PARTE_DE]->(f:Figura)
  RETURN
    p { .*, id: p.serial, etiqueta: labels(p)[0] } AS node,
    CASE WHEN f IS NOT NULL THEN f { .*, id: f.serial, etiqueta: labels(f)[0] } ELSE null END AS figura,
    r.tipo_estructura AS tipo_estructura
`;

const OTHER_FIGURAS_START_QUERY = `
  MATCH (f:Figura)-[:EN]->(r:Rompecabezas {serial: $puzzleId})
  WHERE f.serial <> $userFigSerial
  OPTIONAL MATCH (p:Pieza)-[:PARTE_DE]->(f)
  WITH f, p
  ORDER BY coalesce(f.orden_narrativo, 0) ASC, p.numero ASC, p.fila ASC, p.columna ASC, p.serial ASC
  WITH f, collect(p)[0] AS primeraPieza
  WHERE primeraPieza IS NOT NULL
  RETURN
    primeraPieza { .*, id: primeraPieza.serial, etiqueta: labels(primeraPieza)[0] } AS node,
    f { .*, id: f.serial, etiqueta: labels(f)[0] } AS figura
  ORDER BY coalesce(f.orden_narrativo, 0)
`;

async function fetchStartingPieces(session, puzzleId, startSerial) {
  if (!startSerial) {
    const result = await session.run(getStartingPiecesQuery, { puzzleId });
    return result.records.map(rec => ({
      node: rec.get('node'),
      figura: rec.get('figura'),
      tipo_estructura: rec.get('tipo_estructura'),
    }));
  }

  const userResult = await session.run(USER_START_PIECE_QUERY, { puzzleId, startSerial });
  if (userResult.records.length === 0) {
    throw new Error(`Pieza ${startSerial} no pertenece al rompecabezas ${puzzleId}.`);
  }

  const userNode = userResult.records[0].get('node');
  const userFigura = userResult.records[0].get('figura');
  const tipo_estructura = userResult.records[0].get('tipo_estructura');

  const out = [{ node: userNode, figura: userFigura, tipo_estructura }];

  if (userFigura) {
    const otrasResult = await session.run(OTHER_FIGURAS_START_QUERY, {
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

export async function assemblePuzzle(puzzleId, auth, options = {}) {
  const { startSerial = null } = options;
  const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));
  const session = driver.session();
  const outputs = [];

  try {
    const startingPieces = await fetchStartingPieces(session, puzzleId, startSerial);

    if (startingPieces.length === 0) {
      return [`Rompecabezas ${puzzleId} no encontrado o sin piezas.`];
    }

    const structureType = startingPieces[0].tipo_estructura;
    outputs.push(`--- Iniciando armado de rompecabezas ${puzzleId} (${structureType}) ---`);

    const visited = new Set();

    for (const { node: startNode, figura: fig } of startingPieces) {
      // Salta figuras alcanzadas vía CONECTA_CON desde una figura anterior.
      if (visited.has(startNode.id)) continue;

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
          presentOnly: false,
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

    outputs.push(`\n--- Armado de ${puzzleId} finalizado ---`);
    return outputs;

  } finally {
    await session.close();
    await driver.close();
  }
}
