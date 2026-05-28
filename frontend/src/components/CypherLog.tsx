import { useState } from 'react';
import type { CypherLogPage } from '../lib/cypherLog';

interface Props {
  pages: CypherLogPage[];
  onClear: () => void;
}

export function CypherLog({ pages, onClear }: Props) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-200">Log de Cypher</h2>
          <p className="text-xs text-slate-500">
            {pages.length} {pages.length === 1 ? 'operación' : 'operaciones'} ejecutadas
          </p>
        </div>
        {pages.length > 0 && (
          <button
            onClick={onClear}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-slate-500 hover:text-slate-200"
          >
            Limpiar
          </button>
        )}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-xs">
        {pages.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-800 p-6 text-center text-slate-500">
            Las queries Cypher ejecutadas por el backend aparecerán aquí.
          </div>
        )}
        {[...pages].reverse().map(page => (
          <PageRow key={page.id} page={page} />
        ))}
      </div>
    </div>
  );
}

function PageRow({ page }: { page: CypherLogPage }) {
  const [open, setOpen] = useState(false);
  const time = new Date(page.time).toLocaleTimeString();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/40">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition hover:bg-slate-900"
      >
        <div className="flex items-center gap-2">
          <span
            className={`grid h-4 w-4 place-items-center rounded text-[10px] transition ${open ? 'rotate-90 text-sky-400' : 'text-slate-500'}`}
          >
            ▶
          </span>
          <span className="text-[11px] font-medium text-slate-300">{page.source}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className="rounded-full bg-slate-800 px-1.5 py-0.5">
            {page.entries.length} {page.entries.length === 1 ? 'query' : 'queries'}
          </span>
          <span>{time}</span>
        </div>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-800 px-3 py-2">
          {page.entries.map((entry, idx) => (
            <div key={idx}>
              <div className="mb-1 flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wide text-slate-500">
                  {entry.label}
                </span>
                {entry.note && (
                  <span className="text-[10px] italic text-slate-600">{entry.note}</span>
                )}
              </div>
              <pre className="overflow-x-auto whitespace-pre rounded-md bg-slate-950 p-2 font-mono text-[10px] leading-relaxed text-slate-300">
                {entry.query.trim()}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
