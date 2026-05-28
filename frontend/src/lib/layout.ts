import type { Figura, Pieza, Rompecabezas } from '../types';

export interface PieceBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
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
const GAP = 6;
const LANE_PAD = 12;
const LANE_LABEL = 22;

export function layoutPiezas(
  rompecabezas: Rompecabezas,
  piezas: Pieza[],
  figuras: Figura[]
): Layout {
  const boxes = new Map<string, PieceBox>();

  if (rompecabezas.tipo_estructura === 'grid') {
    let maxX = 0;
    let maxY = 0;
    for (const p of piezas) {
      const col = (p.columna ?? 1) - 1;
      const row = (p.fila ?? 1) - 1;
      const x = col * (CELL + GAP);
      const y = row * (CELL + GAP);
      boxes.set(p.serial, {
        x,
        y,
        w: CELL,
        h: CELL,
        label: `${p.fila},${p.columna}`,
        figuraSerial: null,
      });
      maxX = Math.max(maxX, x + CELL);
      maxY = Math.max(maxY, y + CELL);
    }
    return { boxes, width: maxX, height: maxY, lanes: [] };
  }

  if (rompecabezas.tipo_estructura === 'secuencial_numerado') {
    const sorted = [...piezas].sort(
      (a, b) => (a.numero ?? 0) - (b.numero ?? 0)
    );
    sorted.forEach((p, i) => {
      boxes.set(p.serial, {
        x: i * (CELL + GAP),
        y: 0,
        w: CELL,
        h: CELL,
        label: `#${p.numero}`,
        figuraSerial: null,
      });
    });
    return {
      boxes,
      width: Math.max(0, sorted.length * (CELL + GAP) - GAP),
      height: CELL,
      lanes: [],
    };
  }

  // figura_libre + mixto_numerado: una calle horizontal por figura.
  const figurasOrdered = [...figuras].sort(
    (a, b) => (a.orden_narrativo ?? 0) - (b.orden_narrativo ?? 0)
  );

  const lanes: FiguraLane[] = [];
  let yOffset = LANE_LABEL;
  let maxWidth = 0;

  for (const fig of figurasOrdered) {
    const piezasFig = piezas
      .filter(p => p.figura_serial === fig.serial)
      .sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));

    if (piezasFig.length === 0) continue;

    const laneWidth = piezasFig.length * (CELL + GAP) - GAP;
    maxWidth = Math.max(maxWidth, laneWidth);

    piezasFig.forEach((p, i) => {
      boxes.set(p.serial, {
        x: i * (CELL + GAP),
        y: yOffset,
        w: CELL,
        h: CELL,
        label: p.numero
          ? `#${p.numero}`
          : (p.descripcion?.split(' ').slice(0, 2).join(' ') ?? p.serial),
        figuraSerial: fig.serial,
      });
    });

    lanes.push({
      figura: fig,
      x: -LANE_PAD,
      y: yOffset - LANE_LABEL,
      w: laneWidth + LANE_PAD * 2,
      h: CELL + LANE_LABEL + LANE_PAD,
    });

    yOffset += CELL + LANE_LABEL + LANE_PAD * 2;
  }

  return {
    boxes,
    width: maxWidth,
    height: yOffset - LANE_PAD,
    lanes,
  };
}
