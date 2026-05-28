import type { Figura, Pieza, Rompecabezas } from '../types';

export interface PieceBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  sublabel: string;
  figuraSerial: string | null;
}

export interface FiguraLane {
  figura: Figura;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  boxes: Map<string, PieceBox>;
  width: number;
  height: number;
  lanes: FiguraLane[];
}

const CELL = 64;
// En grids GAP=0 para que los tabs/slots de piezas vecinas se solapen visualmente.
const GAP_GRID = 0;
const GAP_IRREG = 6;
const LANE_PAD = 8;

export function layoutPiezas(
  rompecabezas: Rompecabezas,
  piezas: Pieza[],
  figuras: Figura[]
): Layout {
  const boxes = new Map<string, PieceBox>();
  const isGrid = rompecabezas.tipo_estructura === 'grid';
  const gap = isGrid ? GAP_GRID : GAP_IRREG;
  const labels = (p: Pieza) => ({ label: pieceLabel(p, isGrid), sublabel: pieceSublabel(p, isGrid) });

  if (piezas.length === 0) {
    return { boxes, width: 0, height: 0, lanes: [] };
  }

  const filas = piezas
    .map(p => p.fila)
    .filter((v): v is number => typeof v === 'number');
  const cols = piezas
    .map(p => p.columna)
    .filter((v): v is number => typeof v === 'number');

  const fallback = filas.length === 0 || cols.length === 0;
  const minFila = fallback ? 0 : Math.min(...filas);
  const minCol = fallback ? 0 : Math.min(...cols);

  let maxX = 0;
  let maxY = 0;

  piezas.forEach((p, i) => {
    const fila = fallback ? 0 : (p.fila ?? minFila) - minFila;
    const col = fallback ? i : (p.columna ?? minCol) - minCol;
    const x = col * (CELL + gap);
    const y = fila * (CELL + gap);
    boxes.set(p.serial, {
      x,
      y,
      w: CELL,
      h: CELL,
      ...labels(p),
      figuraSerial: p.figura_serial ?? null,
    });
    maxX = Math.max(maxX, x + CELL);
    maxY = Math.max(maxY, y + CELL);
  });

  const lanes: FiguraLane[] = [];
  const figurasOrdered = [...figuras].sort(
    (a, b) => (a.orden_narrativo ?? 0) - (b.orden_narrativo ?? 0)
  );

  for (const f of figurasOrdered) {
    const piezasFig = piezas.filter(p => p.figura_serial === f.serial);
    if (piezasFig.length === 0) continue;

    let bx0 = Infinity;
    let by0 = Infinity;
    let bx1 = -Infinity;
    let by1 = -Infinity;
    for (const p of piezasFig) {
      const box = boxes.get(p.serial);
      if (!box) continue;
      bx0 = Math.min(bx0, box.x);
      by0 = Math.min(by0, box.y);
      bx1 = Math.max(bx1, box.x + box.w);
      by1 = Math.max(by1, box.y + box.h);
    }
    if (!Number.isFinite(bx0)) continue;

    lanes.push({
      figura: f,
      x: bx0 - LANE_PAD,
      y: by0 - LANE_PAD,
      w: bx1 - bx0 + LANE_PAD * 2,
      h: by1 - by0 + LANE_PAD * 2,
    });
  }

  const extraBottom = lanes.length > 0 ? LANE_PAD : 0;

  return {
    boxes,
    width: maxX,
    height: maxY + extraBottom,
    lanes,
  };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

function pieceLabel(p: Pieza, isGrid: boolean): string {
  if (isGrid && p.fila != null && p.columna != null) return `${p.fila},${p.columna}`;
  if (p.numero != null) return `#${p.numero}`;
  if (p.descripcion) return truncate(p.descripcion, 10);
  if (p.fila != null && p.columna != null) return `${p.fila},${p.columna}`;
  return p.serial;
}

function pieceSublabel(p: Pieza, isGrid: boolean): string {
  if (isGrid) return p.tipo;
  if (p.numero != null && p.descripcion) return truncate(p.descripcion, 13);
  return '';
}
