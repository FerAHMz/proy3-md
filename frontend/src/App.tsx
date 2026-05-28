import { useState } from 'react';
import { Header } from './components/Header';
import { PuzzleSelector } from './components/PuzzleSelector';
import { PuzzleView } from './components/PuzzleView';
import type { Rompecabezas } from './types';

export default function App() {
  const [selected, setSelected] = useState<Rompecabezas | null>(null);

  return (
    <div className="flex min-h-screen flex-col">
      <Header onHome={() => setSelected(null)} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {selected === null ? (
          <PuzzleSelector onSelect={setSelected} />
        ) : (
          <PuzzleView puzzle={selected} onBack={() => setSelected(null)} />
        )}
      </main>
    </div>
  );
}
