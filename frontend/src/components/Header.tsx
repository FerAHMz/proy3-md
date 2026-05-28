interface HeaderProps {
  onHome: () => void;
}

export function Header({ onHome }: HeaderProps) {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <button
          onClick={onHome}
          className="group flex items-center gap-3 text-left"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/30">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="6" cy="6" r="2.5" />
              <circle cx="18" cy="6" r="2.5" />
              <circle cx="12" cy="18" r="2.5" />
              <line x1="6" y1="6" x2="12" y2="18" />
              <line x1="18" y1="6" x2="12" y2="18" />
              <line x1="6" y1="6" x2="18" y2="6" />
            </svg>
          </span>
          <div>
            <div className="text-sm font-semibold text-slate-100 group-hover:text-sky-300">
              Proyecto 03 — Rompecabezas en Neo4j
            </div>
            <div className="text-xs text-slate-500">
              CC3089 · Bases de Datos 2 · UVG
            </div>
          </div>
        </button>
        <div className="hidden items-center gap-2 text-xs text-slate-500 sm:flex">
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-400 ring-1 ring-emerald-500/30">
            ● AuraDB
          </span>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400 ring-1 ring-slate-700">
            BFS sobre grafo
          </span>
        </div>
      </div>
    </header>
  );
}
