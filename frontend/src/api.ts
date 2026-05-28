import type {
  AssembleResponse,
  MissingReportResponse,
  PuzzleDetailResponse,
  PuzzleListResponse,
  RestoreResponse,
  ToggleResponse,
} from './types';

const BASE = '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${res.status} en ${path}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  listPuzzles: () => request<PuzzleListResponse>('/puzzles'),
  getPuzzle: (id: string) => request<PuzzleDetailResponse>(`/puzzles/${id}`),
  assemble: (id: string) => request<AssembleResponse>(`/puzzles/${id}/assemble`),
  report: (id: string) => request<MissingReportResponse>(`/puzzles/${id}/report`),
  togglePiece: (serial: string) =>
    request<ToggleResponse>(`/pieces/${serial}/toggle`, { method: 'POST' }),
  restoreAll: (id: string) =>
    request<RestoreResponse>(`/puzzles/${id}/restore`, { method: 'POST' }),
};
