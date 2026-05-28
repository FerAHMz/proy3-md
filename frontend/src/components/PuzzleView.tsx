import type { Rompecabezas } from '../types';

interface PuzzleViewProps {
  puzzle: Rompecabezas;
  onBack: () => void;
}

export function PuzzleView({ puzzle, onBack }: PuzzleViewProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition hover:border-sky-500/60 hover:text-sky-300"
        >
          ← Volver
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{puzzle.serial}</span>
            <h1 className="text-xl font-semibold text-slate-100">{puzzle.nombre}</h1>
          </div>
          <p className="text-xs text-slate-500">{puzzle.tematica}</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-8">
          <div className="flex h-96 items-center justify-center rounded-lg border border-dashed border-slate-700 text-sm text-slate-500">
            Renderer SVG · próximo commit
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <h2 className="text-sm font-semibold text-slate-200">Log de Cypher</h2>
          <p className="mt-1 text-xs text-slate-500">
            Las queries ejecutadas aparecerán aquí — próximo commit.
          </p>
        </div>
      </div>
    </div>
  );
}
