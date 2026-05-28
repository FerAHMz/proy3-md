import { useEffect, useMemo, useRef, useState } from 'react';
import { parseStep, placedAfter, type ParsedStep } from '../lib/parseSteps';

interface Props {
  pasos: string[];
  loading: boolean;
  onStateChange: (state: { placed: Set<string>; activeEdge: { from: string; to: string } | null }) => void;
  onReload: () => void;
}

const SPEEDS = [
  { label: '0.5×', ms: 1600 },
  { label: '1×',   ms: 800  },
  { label: '2×',   ms: 400  },
  { label: '4×',   ms: 200  },
];

export function AssemblyMode({ pasos, loading, onStateChange, onReload }: Props) {
  const [idx, setIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speedIdx, setSpeedIdx] = useState(1);
  const timer = useRef<number | null>(null);

  const parsed = useMemo<ParsedStep[]>(() => pasos.map(parseStep), [pasos]);
  const total = pasos.length;

  // Avanza al siguiente paso utilizable o se detiene al final.
  useEffect(() => {
    if (!playing) return;
    if (idx >= total - 1) {
      setPlaying(false);
      return;
    }
    timer.current = window.setTimeout(() => {
      setIdx(i => Math.min(i + 1, total - 1));
    }, SPEEDS[speedIdx].ms);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [playing, idx, total, speedIdx]);

  // Notifica al renderer cuáles piezas están colocadas y cuál arista es la "activa".
  useEffect(() => {
    if (idx < 0) {
      onStateChange({ placed: new Set(), activeEdge: null });
      return;
    }
    const placed = placedAfter(pasos, idx);
    const current = parsed[idx];
    const activeEdge =
      current?.kind === 'connect' ? { from: current.from, to: current.to } : null;
    onStateChange({ placed, activeEdge });
  }, [idx, pasos, parsed, onStateChange]);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <div className="h-4 w-32 animate-pulse rounded bg-slate-800" />
        <div className="mt-3 h-16 animate-pulse rounded bg-slate-800/50" />
      </div>
    );
  }

  const current = idx >= 0 ? parsed[idx] : null;
  const progress = total > 0 ? ((idx + 1) / total) * 100 : 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Armar paso a paso</h2>
          <p className="text-xs text-slate-500">
            BFS desde la primera pieza · {total} pasos
          </p>
        </div>
        <button
          onClick={onReload}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
        >
          Recargar
        </button>
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            setIdx(-1);
            setPlaying(false);
          }}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          disabled={idx < 0}
        >
          ⏮ Reset
        </button>
        <button
          onClick={() => setIdx(i => Math.max(-1, i - 1))}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          disabled={idx < 0}
        >
          ◀ Atrás
        </button>
        <button
          onClick={() => setPlaying(p => !p)}
          className="rounded-md bg-sky-500/20 px-3 py-1 text-xs font-medium text-sky-200 ring-1 ring-sky-500/40 transition hover:bg-sky-500/30 disabled:opacity-40"
          disabled={total === 0 || idx >= total - 1}
        >
          {playing ? '⏸ Pausar' : '▶ Reproducir'}
        </button>
        <button
          onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
          className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 transition hover:border-slate-500 disabled:opacity-40"
          disabled={idx >= total - 1}
        >
          Siguiente ▶
        </button>
        <div className="ml-auto flex items-center gap-1">
          <span className="text-[10px] uppercase text-slate-500">vel.</span>
          {SPEEDS.map((s, i) => (
            <button
              key={s.label}
              onClick={() => setSpeedIdx(i)}
              className={`rounded px-1.5 py-0.5 text-[10px] transition ${
                i === speedIdx
                  ? 'bg-sky-500/30 text-sky-100 ring-1 ring-sky-500/50'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Progreso */}
      <div className="h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full bg-sky-500 transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="text-[10px] text-slate-500">
        Paso {Math.max(0, idx + 1)} / {total}
      </div>

      {/* Paso actual */}
      <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
        {current ? (
          <StepLine step={current} />
        ) : (
          <div className="text-xs text-slate-500">
            Presiona ▶ para iniciar el armado.
          </div>
        )}
      </div>

      {/* Lista completa colapsada (últimos 8 pasos visibles) */}
      <details className="rounded-lg border border-slate-800 bg-slate-950/40">
        <summary className="cursor-pointer px-3 py-2 text-xs text-slate-400 hover:text-slate-200">
          Ver lista completa de pasos
        </summary>
        <div className="max-h-60 space-y-0.5 overflow-y-auto px-3 py-2 font-mono text-[10px]">
          {pasos.map((raw, i) => (
            <div
              key={i}
              className={`whitespace-pre-wrap rounded px-2 py-0.5 ${
                i === idx
                  ? 'bg-sky-500/15 text-sky-200'
                  : i < idx
                  ? 'text-slate-500'
                  : 'text-slate-400'
              }`}
            >
              {raw}
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function StepLine({ step }: { step: ParsedStep }) {
  if (step.kind === 'header')
    return <div className="text-xs font-semibold text-slate-300">{step.text}</div>;
  if (step.kind === 'figura')
    return (
      <div className="text-xs text-amber-300">
        ▸ Armando figura: <span className="font-semibold">{step.figura}</span>
      </div>
    );
  if (step.kind === 'start')
    return (
      <div className="text-xs text-emerald-300">
        ◆ Colocando primera pieza <code className="font-mono text-emerald-200">{step.piece}</code>
      </div>
    );
  if (step.kind === 'connect') {
    const detail =
      step.kindRel === 'SIGUIENTE'
        ? 'siguiente en la secuencia'
        : step.lado
        ? `por el lado ${step.lado}`
        : 'por ensamblaje';
    return (
      <div className="text-xs text-slate-200">
        <code className="font-mono text-sky-300">{step.from}</code>{' '}
        <span className="text-slate-500">↔</span>{' '}
        <code className="font-mono text-sky-300">{step.to}</code>{' '}
        <span className="text-slate-400">{detail}</span>
      </div>
    );
  }
  return <div className="text-xs text-slate-500">{step.text}</div>;
}
