import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useCypherLog } from '../lib/cypherLog';
import type {
  AssembleResponse,
  MissingReportResponse,
  Pieza,
  PuzzleDetailResponse,
  Rompecabezas,
} from '../types';
import { AssemblyMode } from './AssemblyMode';
import { CypherLog } from './CypherLog';
import { MissingMode } from './MissingMode';
import { PuzzleSVG, type PieceVisualState } from './PuzzleSVG';

type Mode = 'view' | 'assemble' | 'missing';

interface Props {
  puzzle: Rompecabezas;
  onBack: () => void;
}

export function PuzzleView({ puzzle, onBack }: Props) {
  const [mode, setMode] = useState<Mode>('view');
  const [detail, setDetail] = useState<PuzzleDetailResponse | null>(null);
  const [assembly, setAssembly] = useState<AssembleResponse | null>(null);
  const [report, setReport] = useState<MissingReportResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingAssembly, setLoadingAssembly] = useState(false);
  const [loadingReport, setLoadingReport] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [activeEdge, setActiveEdge] = useState<{ from: string; to: string } | null>(null);

  const { pages, track, clear: clearLog } = useCypherLog();

  const loadDetail = useCallback(async () => {
    setLoadingDetail(true);
    setError(null);
    try {
      const r = await track(`Cargar ${puzzle.serial}`, () => api.getPuzzle(puzzle.serial));
      setDetail(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingDetail(false);
    }
  }, [puzzle.serial, track]);

  const loadAssembly = useCallback(async () => {
    setLoadingAssembly(true);
    try {
      const r = await track(`Armado completo ${puzzle.serial}`, () =>
        api.assemble(puzzle.serial)
      );
      setAssembly(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingAssembly(false);
    }
  }, [puzzle.serial, track]);

  const loadReport = useCallback(async () => {
    setLoadingReport(true);
    try {
      const r = await track(`Reporte de faltantes ${puzzle.serial}`, () =>
        api.report(puzzle.serial)
      );
      setReport(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingReport(false);
    }
  }, [puzzle.serial, track]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  useEffect(() => {
    if (mode === 'assemble' && !assembly) loadAssembly();
    if (mode === 'missing' && !report) loadReport();
    if (mode !== 'assemble') {
      setPlaced(new Set());
      setActiveEdge(null);
    }
  }, [mode, assembly, report, loadAssembly, loadReport]);

  const onPieceClick = useCallback(
    async (p: Pieza) => {
      if (mode !== 'missing') return;
      try {
        await track(`Toggle ${p.serial}`, () => api.togglePiece(p.serial));
        // Actualizar localmente el flag presente para feedback inmediato.
        setDetail(prev =>
          prev
            ? {
                ...prev,
                piezas: prev.piezas.map(pz =>
                  pz.serial === p.serial ? { ...pz, presente: !pz.presente } : pz
                ),
              }
            : prev
        );
        loadReport();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [mode, track, loadReport]
  );

  const onRestoreAll = useCallback(async () => {
    try {
      await track(`Restaurar ${puzzle.serial}`, () => api.restoreAll(puzzle.serial));
      // Marcar todas como presentes localmente.
      setDetail(prev =>
        prev
          ? { ...prev, piezas: prev.piezas.map(pz => ({ ...pz, presente: true })) }
          : prev
      );
      loadReport();
    } catch (e) {
      setError((e as Error).message);
    }
  }, [puzzle.serial, track, loadReport]);

  const stateOf = useCallback(
    (p: Pieza): PieceVisualState => {
      if (mode === 'assemble') {
        if (placed.size === 0) return 'pending';
        if (placed.has(p.serial)) {
          if (activeEdge && (activeEdge.from === p.serial || activeEdge.to === p.serial)) {
            return 'active';
          }
          return 'placed';
        }
        return 'pending';
      }
      if (!p.presente) return 'missing';
      return 'idle';
    },
    [mode, placed, activeEdge]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onBack}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-sm text-slate-300 transition hover:border-sky-500/60 hover:text-sky-300"
        >
          ← Volver
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-slate-500">{puzzle.serial}</span>
            <h1 className="text-xl font-semibold text-slate-100">{puzzle.nombre}</h1>
          </div>
          <p className="text-xs text-slate-500">
            {puzzle.tematica} · {puzzle.tipo_estructura}
          </p>
        </div>
        <ModeTabs current={mode} onChange={setMode} />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="h-[60vh] min-h-[420px] overflow-auto rounded-lg bg-slate-950/40 p-4">
              {detail && (
                <PuzzleSVG
                  rompecabezas={detail.rompecabezas}
                  piezas={detail.piezas}
                  figuras={detail.figuras}
                  conecta_con={detail.conecta_con}
                  siguiente={detail.siguiente}
                  stateOf={stateOf}
                  activeEdge={mode === 'assemble' ? activeEdge : null}
                  onPieceClick={onPieceClick}
                  interactive={mode === 'missing'}
                />
              )}
              {!detail && loadingDetail && (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  Cargando rompecabezas…
                </div>
              )}
            </div>
            <Legend />
          </div>

          {mode === 'assemble' && (
            <AssemblyMode
              pasos={assembly?.pasos ?? []}
              loading={loadingAssembly}
              onStateChange={({ placed, activeEdge }) => {
                setPlaced(placed);
                setActiveEdge(activeEdge);
              }}
              onReload={loadAssembly}
            />
          )}

          {mode === 'missing' && (
            <MissingMode
              report={report}
              loading={loadingReport}
              onRestoreAll={onRestoreAll}
            />
          )}

          {mode === 'view' && detail && <PuzzleSummary detail={detail} />}
        </div>

        <CypherLog pages={pages} onClear={clearLog} />
      </div>
    </div>
  );
}

function ModeTabs({ current, onChange }: { current: Mode; onChange: (m: Mode) => void }) {
  const tabs: Array<{ id: Mode; label: string }> = [
    { id: 'view', label: 'Vista' },
    { id: 'assemble', label: 'Armar paso a paso' },
    { id: 'missing', label: 'Marcar faltantes' },
  ];
  return (
    <div className="flex gap-1 rounded-lg border border-slate-800 bg-slate-900/60 p-1">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`rounded-md px-3 py-1 text-xs transition ${
            t.id === current
              ? 'bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Legend() {
  const items = [
    { color: '#f59e0b', label: 'esquina' },
    { color: '#38bdf8', label: 'borde' },
    { color: '#10b981', label: 'interior' },
    { color: '#a78bfa', label: 'irregular' },
  ];
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-400">
      {items.map(i => (
        <div key={i.label} className="flex items-center gap-1">
          <span
            className="inline-block h-2.5 w-2.5 rounded"
            style={{ backgroundColor: i.color, opacity: 0.5 }}
          />
          {i.label}
        </div>
      ))}
      <span className="text-slate-600">·</span>
      <span className="text-slate-500">borde punteado = pieza faltante</span>
    </div>
  );
}

function PuzzleSummary({ detail }: { detail: PuzzleDetailResponse }) {
  const piezas = detail.piezas;
  const porTipo = piezas.reduce<Record<string, number>>((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] ?? 0) + 1;
    return acc;
  }, {});
  const faltantes = piezas.filter(p => !p.presente).length;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <h2 className="text-sm font-semibold text-slate-200">Resumen</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <Stat label="Piezas" value={piezas.length} />
        <Stat label="Faltantes" value={faltantes} accent={faltantes > 0 ? 'amber' : undefined} />
        <Stat label="Conexiones" value={detail.conecta_con.length} />
        <Stat label="Figuras" value={detail.figuras.length} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
        {Object.entries(porTipo).map(([tipo, n]) => (
          <span
            key={tipo}
            className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300"
          >
            {tipo}: {n}
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: 'amber';
}) {
  const color =
    accent === 'amber' ? 'text-amber-300' : 'text-slate-100';
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${color}`}>{value}</div>
    </div>
  );
}
