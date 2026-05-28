import type { MissingReportResponse } from '../types';

interface Props {
  report: MissingReportResponse | null;
  loading: boolean;
  onRestoreAll: () => void;
}

const LADO_ICON: Record<string, string> = {
  arriba: '↑',
  abajo: '↓',
  izquierda: '←',
  derecha: '→',
};

export function MissingMode({ report, loading, onRestoreAll }: Props) {
  if (loading || !report) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
        <div className="mt-3 h-16 animate-pulse rounded bg-slate-800/50" />
      </div>
    );
  }

  const hayFaltantes = report.faltantes.length > 0;
  const islas = report.regiones_aisladas.length > 1
    ? report.regiones_aisladas.slice(1)
    : [];

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Marcar piezas faltantes</h2>
          <p className="text-xs text-slate-500">
            Click sobre una pieza para alternar <code className="text-slate-400">presente</code>
          </p>
        </div>
        {hayFaltantes && (
          <button
            onClick={onRestoreAll}
            className="rounded-md border border-emerald-700/60 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/20"
          >
            Restaurar todas
          </button>
        )}
      </div>

      {/* Estado por figura/puzzle */}
      <div className="grid gap-2">
        {report.estado_figuras.map(fig => {
          const completa = fig.estado === 'completa' || fig.estado === 'completo';
          return (
            <div
              key={fig.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span className={completa ? 'text-emerald-400' : 'text-amber-400'}>
                  {completa ? '✓' : '✗'}
                </span>
                <span className="text-xs text-slate-200">{fig.nombre}</span>
              </div>
              <span className="text-[10px] text-slate-500">
                {fig.presentes}/{fig.esperadas}
              </span>
            </div>
          );
        })}
      </div>

      {/* Faltantes */}
      {hayFaltantes ? (
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-slate-500">
            Faltantes ({report.faltantes.length})
          </div>
          {report.faltantes.map(f => {
            const label =
              f.descripcion ??
              (f.fila != null && f.columna != null
                ? `Pieza (${f.fila},${f.columna})`
                : f.numero != null
                ? `Pieza #${f.numero}`
                : f.id);
            return (
              <div
                key={f.id}
                className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-medium text-amber-200">{label}</div>
                    <div className="font-mono text-[10px] text-amber-400/70">{f.id}</div>
                  </div>
                  {f.tipo_esperado && (
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-300 ring-1 ring-amber-500/30">
                      {f.tipo_esperado}
                    </span>
                  )}
                </div>
                {f.vecinos_presentes.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-400">
                    Vecinos:{' '}
                    {f.vecinos_presentes.map(v => (
                      <code key={v} className="ml-1 rounded bg-slate-900 px-1 text-slate-300">
                        {v}
                      </code>
                    ))}
                  </div>
                )}
                <InferenciasGrid inferencias={f.inferencias_lado} />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-emerald-300">
          Rompecabezas completo · no hay piezas marcadas como faltantes.
        </div>
      )}

      {/* Islas */}
      {islas.length > 0 && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 p-3">
          <div className="mb-1 text-xs font-semibold text-rose-300">
            ⚠ {islas.length} {islas.length === 1 ? 'región aislada' : 'regiones aisladas'}
          </div>
          <div className="text-[10px] text-rose-400/80">
            Una o más piezas faltantes están cortando el rompecabezas en componentes desconectados.
          </div>
          {islas.map((isla, i) => (
            <div key={i} className="mt-2 text-[10px] text-rose-200">
              Isla {i + 1}: {isla.slice(0, 4).join(', ')}
              {isla.length > 4 && ` +${isla.length - 4}`}
            </div>
          ))}
        </div>
      )}

      {/* Pasos del armado parcial */}
      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
          Pasos del armado parcial ({report.armado_parcial.filter(l => l.startsWith('pieza')).length} conexiones)
        </summary>
        <div className="max-h-60 space-y-0.5 overflow-y-auto px-3 py-2 font-mono text-[10px] text-slate-400">
          {report.armado_parcial.map((paso, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {paso}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function InferenciasGrid({
  inferencias,
}: {
  inferencias: { lado_arriba: string; lado_abajo: string; lado_izquierda: string; lado_derecha: string };
}) {
  const map: Array<[keyof typeof inferencias, string]> = [
    ['lado_arriba', 'arriba'],
    ['lado_abajo', 'abajo'],
    ['lado_izquierda', 'izquierda'],
    ['lado_derecha', 'derecha'],
  ];
  return (
    <div className="mt-2 grid grid-cols-4 gap-1 text-[10px]">
      {map.map(([key, dir]) => {
        const v = inferencias[key];
        const color =
          v === 'saliente'
            ? 'text-sky-300'
            : v === 'abertura'
            ? 'text-violet-300'
            : v === 'plano'
            ? 'text-slate-300'
            : 'text-slate-600';
        return (
          <div
            key={key}
            className="flex flex-col items-center rounded bg-slate-950/60 px-1 py-1"
          >
            <span className="text-slate-500">{LADO_ICON[dir]}</span>
            <span className={color}>{v}</span>
          </div>
        );
      })}
    </div>
  );
}
