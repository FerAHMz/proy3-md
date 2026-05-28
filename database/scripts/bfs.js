import neo4j from 'neo4j-driver';
import { getStartingPiecesQuery, getNeighborsQuery } from './queries.js';

/**
 * Invierte la dirección de un lado de la cuadrícula si la pieza conectada es el origen.
 */
function invertLado(lado) {
  if (!lado) return "un lado";
  const inversos = {
    'arriba': 'abajo',
    'abajo': 'arriba',
    'izquierda': 'derecha',
    'derecha': 'izquierda'
  };
  return inversos[lado] || lado;
}

/**
 * Configura la sesión de base de datos e inicializa el armado.
 * @param {string} puzzleId - Ej: RC001
 * @param {object} auth - { uri, user, password }
 */
export async function assemblePuzzle(puzzleId, auth) {
  const driver = neo4j.driver(auth.uri, neo4j.auth.basic(auth.user, auth.password));
  const session = driver.session();
  const outputs = [];
  
  try {
    // 1. Obtener la(s) pieza(s) inicial(es) (Query Principal)
    const resultStart = await session.run(getStartingPiecesQuery, { puzzleId });
    
    if (resultStart.records.length === 0) {
      return [`Rompecabezas ${puzzleId} no encontrado o sin piezas.`];
    }

    const structureType = resultStart.records[0].get('tipo_estructura');
    outputs.push(`--- Iniciando armado de rompecabezas ${puzzleId} (${structureType}) ---`);

    const visited = new Set();
    
    // Si hay varias figuras, se arman secuencialmente.
    for (const record of resultStart.records) {
      const startNode = record.get('node');
      const fig = record.get('figura');
      
      if (fig) {
        outputs.push(`\nArmando figura: ${fig.nombre}`);
      }
      
      const queue = [startNode.id];
      visited.add(startNode.id);
      outputs.push(`Colocando primera pieza: ${startNode.id}`);
      
      // 2. Ciclo BFS principal
      while (queue.length > 0) {
        const currentId = queue.shift();
        
        // Query de vecinos
        const neighborResult = await session.run(getNeighborsQuery, { pieceId: currentId });
        
        for (const neighborRecord of neighborResult.records) {
          const neighbor = neighborRecord.get('node');
          const tipoRel = neighborRecord.get('tipoRel');
          const lado = neighborRecord.get('lado');
          const soyOrigen = neighborRecord.get('soy_origen');
          
          if (!visited.has(neighbor.id)) {
            // Es un vecino nuevo
            visited.add(neighbor.id);
            queue.push(neighbor.id);
            
            // Construir el output paso a paso
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
