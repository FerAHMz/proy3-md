import { useMemo } from 'react';
import { jigsawPath } from '../lib/jigsaw';
import { layoutPiezas } from '../lib/layout';
import type { ConectaCon, Figura, Pieza, Rompecabezas, SiguienteRel } from '../types';

export type PieceVisualState = 'idle' | 'missing' | 'placed' | 'active' | 'pending';

interface Props {
  rompecabezas: Rompecabezas;
  piezas: Pieza[];
  figuras: Figura[];
  conecta_con: ConectaCon[];
  siguiente: SiguienteRel[];
  stateOf?: (p: Pieza) => PieceVisualState;
  activeEdge?: { from: string; to: string } | null;
  startSerial?: string | null;
  onPieceClick?: (p: Pieza) => void;
  interactive?: boolean;
  clickableMissing?: boolean;
}

const TIPO_FILL: Record<string, string> = {
  esquina: '#f59e0b',
  borde: '#38bdf8',
  interior: '#10b981',
  irregular: '#a78bfa',
};

const FIGURA_PALETTE = [
  '#fb923c', // orange
  '#06b6d4', // cyan
  '#a78bfa', // violet
  '#f43f5e', // rose
  '#22c55e', // emerald
  '#eab308', // amber
];

const STATE_OPACITY: Record<PieceVisualState, number> = {
  idle: 1,
  missing: 0.3,
  placed: 1,
  active: 1,
  pending: 0.4,
};

function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function PuzzleSVG({
  rompecabezas,
  piezas,
  figuras,
  conecta_con,
  siguiente,
  stateOf,
  activeEdge,
  startSerial = null,
  onPieceClick,
  interactive = false,
  clickableMissing = true,
}: Props) {
  const layout = useMemo(
    () => layoutPiezas(rompecabezas, piezas, figuras),
    [rompecabezas, piezas, figuras]
  );

  const figuraColor = useMemo(() => {
    const sorted = [...figuras].sort(
      (a, b) => (a.orden_narrativo ?? 0) - (b.orden_narrativo ?? 0)
    );
    const m = new Map<string, string>();
    sorted.forEach((f, i) => m.set(f.serial, FIGURA_PALETTE[i % FIGURA_PALETTE.length]));
    return m;
  }, [figuras]);

  const isGrid = rompecabezas.tipo_estructura === 'grid';
  // PAD mayor en grids da espacio a los tabs de las piezas de borde.
  const PAD = isGrid ? 32 : 24;
  const vbW = layout.width + PAD * 2;
  const vbH = Math.max(layout.height, 100) + PAD * 2;

  // En grids las piezas ya están adyacentes; dibujar las aristas sería ruido.
  const showEdges = !isGrid;

  const colorFor = (p: Pieza): string => {
    if (p.figura_serial && figuraColor.has(p.figura_serial)) {
      return figuraColor.get(p.figura_serial)!;
    }
    return TIPO_FILL[p.tipo] ?? '#94a3b8';
  };

  return (
    <svg
      viewBox={`${-PAD} ${-PAD} ${vbW} ${vbH}`}
      className="block h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="#475569" strokeWidth="1" />
        </pattern>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Bandas por figura */}
      {layout.lanes.map(lane => {
        const color = figuraColor.get(lane.figura.serial) ?? '#475569';
        return (
          <rect
            key={lane.figura.serial}
            x={lane.x}
            y={lane.y}
            width={lane.w}
            height={lane.h}
            rx={10}
            fill={hexAlpha(color, 0.08)}
            stroke={hexAlpha(color, 0.45)}
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        );
      })}

      {/* Aristas CONECTA_CON */}
      {showEdges &&
        conecta_con.map((c, i) => {
          const a = layout.boxes.get(c.from);
          const b = layout.boxes.get(c.to);
          if (!a || !b) return null;
          const isActive =
            activeEdge &&
            ((activeEdge.from === c.from && activeEdge.to === c.to) ||
              (activeEdge.from === c.to && activeEdge.to === c.from));
          return (
            <line
              key={`cc-${i}`}
              x1={a.x + a.w / 2}
              y1={a.y + a.h / 2}
              x2={b.x + b.w / 2}
              y2={b.y + b.h / 2}
              stroke={isActive ? '#38bdf8' : '#334155'}
              strokeWidth={isActive ? 2.5 : 1.25}
              strokeLinecap="round"
              opacity={isActive ? 1 : 0.65}
            />
          );
        })}

      {/* Aristas SIGUIENTE (punteadas) */}
      {showEdges &&
        siguiente.map((s, i) => {
          const a = layout.boxes.get(s.from);
          const b = layout.boxes.get(s.to);
          if (!a || !b) return null;
          const isActive =
            activeEdge &&
            ((activeEdge.from === s.from && activeEdge.to === s.to) ||
              (activeEdge.from === s.to && activeEdge.to === s.from));
          return (
            <line
              key={`sig-${i}`}
              x1={a.x + a.w / 2}
              y1={a.y + a.h / 2}
              x2={b.x + b.w / 2}
              y2={b.y + b.h / 2}
              stroke={isActive ? '#fbbf24' : '#64748b'}
              strokeWidth={isActive ? 2.5 : 1}
              strokeDasharray="3 3"
              opacity={isActive ? 1 : 0.5}
            />
          );
        })}

      {/* Piezas */}
      {piezas.map(p => {
        const box = layout.boxes.get(p.serial);
        if (!box) return null;
        const state: PieceVisualState = stateOf ? stateOf(p) : (p.presente ? 'idle' : 'missing');
        const fill = colorFor(p);
        const opacity = STATE_OPACITY[state];
        const isMissing = state === 'missing';
        const isActive = state === 'active';
        const isPlaced = state === 'placed';
        const isStart = p.serial === startSerial;
        const clickable =
          interactive && (clickableMissing || !isMissing) && onPieceClick != null;

        const shapeD = isGrid
          ? jigsawPath(box.w, box.h, {
              arriba: p.lado_arriba ?? null,
              derecha: p.lado_derecha ?? null,
              abajo: p.lado_abajo ?? null,
              izquierda: p.lado_izquierda ?? null,
            })
          : null;

        const shapeProps = {
          fill,
          fillOpacity: isMissing ? 0.1 : isPlaced ? 0.45 : 0.25,
          opacity,
          stroke: isActive
            ? '#fde047'
            : isStart
            ? '#fde047'
            : isMissing
            ? fill
            : isPlaced
            ? fill
            : hexAlpha(fill, 0.7),
          strokeWidth: isActive ? 3 : isStart ? 2.5 : 1.5,
          strokeDasharray: isMissing ? '4 3' : undefined,
          filter: isActive || isStart ? 'url(#glow)' : undefined,
        } as const;

        return (
          <g
            key={p.serial}
            transform={`translate(${box.x},${box.y})`}
            className={clickable ? 'cursor-pointer' : ''}
            style={interactive && isMissing && !clickableMissing ? { cursor: 'not-allowed' } : undefined}
            onClick={clickable ? () => onPieceClick?.(p) : undefined}
          >
            {shapeD ? (
              <path d={shapeD} {...shapeProps} />
            ) : (
              <rect width={box.w} height={box.h} rx={8} {...shapeProps} />
            )}
            {isMissing &&
              (shapeD ? (
                <path
                  d={shapeD}
                  fill="url(#hatch)"
                  opacity={0.5}
                  pointerEvents="none"
                />
              ) : (
                <rect
                  width={box.w}
                  height={box.h}
                  rx={8}
                  fill="url(#hatch)"
                  opacity={0.5}
                  pointerEvents="none"
                />
              ))}
            <text
              x={box.w / 2}
              y={box.sublabel ? box.h / 2 - 5 : box.h / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={10}
              fontWeight={600}
              fill={isMissing ? '#94a3b8' : '#f8fafc'}
              opacity={opacity}
              pointerEvents="none"
            >
              {box.label}
            </text>
            {box.sublabel && (
              <text
                x={box.w / 2}
                y={box.h / 2 + 8}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={8}
                fill={isMissing ? '#64748b' : '#cbd5e1'}
                opacity={opacity * 0.85}
                pointerEvents="none"
              >
                {box.sublabel}
              </text>
            )}
            {isStart && (
              <g pointerEvents="none">
                <circle cx={box.w / 2} cy={-10} r={7} fill="#fde047" />
                <text
                  x={box.w / 2}
                  y={-7}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="#0b1120"
                >
                  ▶
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export { FIGURA_PALETTE };
