import { useEffect, useState } from 'react';
import { api } from '../api';
import type { Rompecabezas, TipoEstructura } from '../types';

interface PuzzleSelectorProps {
  onSelect: (puzzle: Rompecabezas) => void;
}

const TIPO_LABEL: Record<TipoEstructura, string> = {
  grid: 'Grid',
  figura_libre: 'Figura libre',
  secuencial_numerado: 'Secuencial numerado',
  mixto_numerado: 'Mixto numerado',
};

const TIPO_COLOR: Record<TipoEstructura, string> = {
  grid: 'bg-sky-500/10 text-sky-300 ring-sky-500/30',
  figura_libre: 'bg-amber-500/10 text-amber-300 ring-amber-500/30',
  secuencial_numerado: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  mixto_numerado: 'bg-fuchsia-500/10 text-fuchsia-300 ring-fuchsia-500/30',
};

export function PuzzleSelector({ onSelect }: PuzzleSelectorProps) {
  const [puzzles, setPuzzles] = useState<Rompecabezas[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .listPuzzles()
      .then(res => setPuzzles(res.puzzles))
      .catch(err => setError(err.message));
  }, []);

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
        <div className="font-semibold">No pude cargar la lista de rompecabezas.</div>
        <div className="mt-1 text-red-400/80">{error}</div>
        <div className="mt-3 text-xs text-red-400/60">
          Verifica que el backend esté corriendo en <code className="rounded bg-slate-900 px-1.5 py-0.5">http://localhost:4000</code>.
        </div>
      </div>
    );
  }

  if (puzzles === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl border border-slate-800 bg-slate-900/50" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">Rompecabezas</h1>
          <p className="mt-1 text-sm text-slate-400">
            {puzzles.length} cargados en la BD · selecciona uno para ver el armado.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {puzzles.map(p => (
          <button
            key={p.serial}
            onClick={() => onSelect(p)}
            className="group flex flex-col items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left transition hover:border-sky-500/60 hover:bg-slate-900"
          >
            <div className="flex w-full items-center justify-between">
              <span className="font-mono text-xs text-slate-500 group-hover:text-slate-400">
                {p.serial}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ${TIPO_COLOR[p.tipo_estructura]}`}
              >
                {TIPO_LABEL[p.tipo_estructura]}
              </span>
            </div>
            <div className="text-base font-semibold text-slate-100 group-hover:text-sky-300">
              {p.nombre}
            </div>
            <div className="text-xs text-slate-400">{p.tematica}</div>
            <div className="mt-auto flex w-full items-center gap-3 text-xs text-slate-500">
              <span>{p.total_piezas} piezas</span>
              {p.num_figuras > 1 && <span>· {p.num_figuras} figuras</span>}
              {p.filas && p.columnas && (
                <span>· {p.filas}×{p.columnas}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
