export type ParsedStep =
  | { kind: 'header'; text: string }
  | { kind: 'figura'; figura: string }
  | { kind: 'start'; piece: string }
  | { kind: 'connect'; from: string; to: string; lado?: string; kindRel: 'CONECTA_CON' | 'SIGUIENTE' | 'ENSAMBLE' }
  | { kind: 'text'; text: string };

const RE_START   = /^Colocando primera pieza: (\S+)$/;
const RE_CONN    = /^pieza (\S+) se ensambla con (\S+) por el lado (\S+)$/;
const RE_ENSAM   = /^pieza (\S+) se ensambla con (\S+) por ensamblaje$/;
const RE_SIG     = /^pieza (\S+) se ensambla con la siguiente pieza de la secuencia: (\S+)$/;
const RE_FIG     = /^Armando figura: (.+)$/;

export function parseStep(raw: string): ParsedStep {
  const line = raw.trim();
  if (line === '') return { kind: 'text', text: raw };
  if (line.startsWith('---')) return { kind: 'header', text: line };

  let m = RE_FIG.exec(line);
  if (m) return { kind: 'figura', figura: m[1] };

  m = RE_START.exec(line);
  if (m) return { kind: 'start', piece: m[1] };

  m = RE_CONN.exec(line);
  if (m) return { kind: 'connect', from: m[1], to: m[2], lado: m[3], kindRel: 'CONECTA_CON' };

  m = RE_ENSAM.exec(line);
  if (m) return { kind: 'connect', from: m[1], to: m[2], kindRel: 'ENSAMBLE' };

  m = RE_SIG.exec(line);
  if (m) return { kind: 'connect', from: m[1], to: m[2], kindRel: 'SIGUIENTE' };

  return { kind: 'text', text: line };
}

// Devuelve el conjunto de piezas colocadas tras ejecutar los pasos [0..upTo].
export function placedAfter(steps: string[], upTo: number): Set<string> {
  const placed = new Set<string>();
  for (let i = 0; i <= upTo && i < steps.length; i++) {
    const s = parseStep(steps[i]);
    if (s.kind === 'start') placed.add(s.piece);
    if (s.kind === 'connect') {
      placed.add(s.from);
      placed.add(s.to);
    }
  }
  return placed;
}
