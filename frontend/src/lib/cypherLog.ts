import { useCallback, useState } from 'react';
import type { CypherLogEntry } from '../types';

export interface CypherLogPage {
  id: number;
  source: string;
  time: number;
  entries: CypherLogEntry[];
}

let pageCounter = 0;

export function useCypherLog() {
  const [pages, setPages] = useState<CypherLogPage[]>([]);

  const track = useCallback(
    async <T extends { cypher_log: CypherLogEntry[] }>(
      source: string,
      fn: () => Promise<T>
    ): Promise<T> => {
      const result = await fn();
      setPages(prev => [
        ...prev,
        { id: ++pageCounter, source, time: Date.now(), entries: result.cypher_log },
      ]);
      return result;
    },
    []
  );

  const clear = useCallback(() => setPages([]), []);

  return { pages, track, clear };
}
