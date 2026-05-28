import { useMemo } from 'react';
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
  onPieceClick?: (p: Pieza) => void;
  interactive?: boolean;
}

const TIPO_FILL: Record<string, string> = {
  esquina: '#f59e0b',
  borde: '#38bdf8',
  interior: '#10b981',
  irregular: '#a78bfa',
};

const STATE_OPACITY: Record<PieceVisualState, number> = {
  idle: 1,
  missing: 0.25,
  placed: 1,
  active: 1,
  pending: 0.35,
};

export function PuzzleSVG({
  rompecabezas,
  piezas,
  figuras,
  conecta_con,
  siguiente,
  stateOf,
  activeEdge,
  onPieceClick,
  interactive = false,
}: Props) {
  const layout = useMemo(
    () => layoutPiezas(rompecabezas, piezas, figuras),
    [rompecabezas, piezas, figuras]
  );

  const PAD = 24;
  const vbW = layout.width + PAD * 2;
  const vbH = Math.max(layout.height, 100) + PAD * 2;

  const isGrid = rompecabezas.tipo_estructura === 'grid';

  // Para irregulares se dibujan las aristas para hacer visible la topología.
  const showEdges = !isGrid;

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

      {/* Calles de figuras (fondo) */}
      {layout.lanes.map(lane => (
        <g key={lane.figura.serial}>
          <rect
            x={lane.x}
            y={lane.y}
            width={lane.w}
            height={lane.h}
            rx={10}
            fill="rgba(15, 23, 42, 0.5)"
            stroke="#1e293b"
            strokeDasharray="4 4"
          />
          <text
            x={lane.x + 10}
            y={lane.y + 14}
            fontSize={11}
            fontWeight={600}
            fill="#94a3b8"
          >
            {lane.figura.nombre}
          </text>
          <text
            x={lane.x + lane.w - 10}
            y={lane.y + 14}
            fontSize={10}
            fill="#475569"
            textAnchor="end"
          >
            {lane.figura.num_piezas} piezas
          </text>
        </g>
      ))}

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
              opacity={isActive ? 1 : 0.7}
            />
          );
        })}

      {/* Aristas SIGUIENTE (líneas punteadas) */}
      {showEdges &&
        siguiente.map((s, i) => {
          const a = layout.boxes.get(s.from);
          const b = layout.boxes.get(s.to);
          if (!a || !b) return null;
          return (
            <line
              key={`sig-${i}`}
              x1={a.x + a.w / 2}
              y1={a.y + a.h / 2}
              x2={b.x + b.w / 2}
              y2={b.y + b.h / 2}
              stroke="#64748b"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
          );
        })}

      {/* Piezas */}
      {piezas.map(p => {
        const box = layout.boxes.get(p.serial);
        if (!box) return null;
        const state: PieceVisualState = stateOf ? stateOf(p) : (p.presente ? 'idle' : 'missing');
        const fill = TIPO_FILL[p.tipo] ?? '#94a3b8';
        const opacity = STATE_OPACITY[state];
        const isMissing = state === 'missing';
        const isActive = state === 'active';
        const isPlaced = state === 'placed';

        return (
          <g
            key={p.serial}
            transform={`translate(${box.x},${box.y})`}
            className={interactive ? 'cursor-pointer' : ''}
            onClick={interactive ? () => onPieceClick?.(p) : undefined}
          >
            <rect
              width={box.w}
              height={box.h}
              rx={8}
              fill={fill}
              fillOpacity={isMissing ? 0.08 : isPlaced ? 0.35 : 0.18}
              opacity={opacity}
              stroke={isActive ? '#fde047' : isMissing ? fill : isPlaced ? fill : '#475569'}
              strokeWidth={isActive ? 3 : 1.5}
              strokeDasharray={isMissing ? '4 3' : undefined}
              filter={isActive ? 'url(#glow)' : undefined}
            />
            {isMissing && (
              <rect
                width={box.w}
                height={box.h}
                rx={8}
                fill="url(#hatch)"
                opacity={0.5}
                pointerEvents="none"
              />
            )}
            <text
              x={box.w / 2}
              y={box.h / 2 - 2}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill={isMissing ? '#94a3b8' : '#f8fafc'}
              opacity={opacity}
              pointerEvents="none"
            >
              {box.label}
            </text>
            <text
              x={box.w / 2}
              y={box.h / 2 + 12}
              textAnchor="middle"
              fontSize={8}
              fill={isMissing ? '#64748b' : '#e2e8f0'}
              opacity={opacity * 0.8}
              pointerEvents="none"
            >
              {p.tipo}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
