import dotenv from 'dotenv';
import { assemblePuzzle } from '../scripts/bfs.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const auth = {
  uri: process.env.NEO4J_URI,
  user: process.env.NEO4J_USERNAME,
  password: process.env.NEO4J_PASSWORD
};

async function testPuzzles() {
  const ids = ['RC001', 'RC005', 'RC006', 'RC007', 'RC008']; // Uno de cada tipología principal + mixto adicional
  
  for (const pid of ids) {
    console.log(`\n=================================================`);
    console.log(`Ejecutando Test para: ${pid}`);
    console.log(`=================================================`);
    const logs = await assemblePuzzle(pid, auth);
    console.log(logs.join('\n'));
  }
}

testPuzzles().catch(err => {
  console.error("Error validando el armado BFS:", err);
});
