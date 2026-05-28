export type TipoEstructura =
  | 'grid'
  | 'figura_libre'
  | 'secuencial_numerado'
  | 'mixto_numerado';

export type TipoPieza = 'esquina' | 'borde' | 'interior' | 'irregular';

export type Lado = 'saliente' | 'abertura' | 'plano' | null;

export interface Rompecabezas {
  serial: string;
  nombre: string;
  tematica: string;
  tipo_estructura: TipoEstructura;
  total_piezas: number;
  num_figuras: number;
  filas: number | null;
  columnas: number | null;
}

export interface Figura {
  serial: string;
  nombre: string;
  num_piezas: number;
  orden_narrativo: number | null;
}

export interface Pieza {
  serial: string;
  rompecabezas_serial: string;
  tipo: TipoPieza;
  forma?: string | null;
  presente: boolean;
  descripcion?: string | null;
  fila?: number | null;
  columna?: number | null;
  numero?: number | null;
  lado_arriba?: Lado;
  lado_abajo?: Lado;
  lado_izquierda?: Lado;
  lado_derecha?: Lado;
  figura_serial?: string | null;
}

export interface ConectaCon {
  from: string;
  to: string;
  lado: string | null;
}

export interface SiguienteRel {
  from: string;
  to: string;
}

export interface CypherLogEntry {
  label: string;
  query: string;
  note?: string;
}

export interface PuzzleListResponse {
  puzzles: Rompecabezas[];
  cypher_log: CypherLogEntry[];
}

export interface PuzzleDetailResponse {
  rompecabezas: Rompecabezas;
  figuras: Figura[];
  piezas: Pieza[];
  conecta_con: ConectaCon[];
  siguiente: SiguienteRel[];
  cypher_log: CypherLogEntry[];
}

export interface AssembleResponse {
  pasos: string[];
  cypher_log: CypherLogEntry[];
}

export interface FaltanteInferencia {
  id: string;
  descripcion: string | null;
  rompecabezas: string;
  fila: number | null;
  columna: number | null;
  numero: number | null;
  tipo_esperado: TipoPieza | null;
  vecinos_presentes: string[];
  inferencias_lado: {
    lado_arriba: string;
    lado_abajo: string;
    lado_izquierda: string;
    lado_derecha: string;
  };
}

export interface FiguraEstado {
  id: string;
  nombre: string;
  esperadas: number;
  presentes: number;
  faltantes: number;
  estado: 'completa' | 'incompleta' | 'completo' | 'incompleto';
}

export interface MissingReportResponse {
  faltantes: FaltanteInferencia[];
  estado_figuras: FiguraEstado[];
  regiones_aisladas: string[][];
  armado_parcial: string[];
  cypher_log: CypherLogEntry[];
}

export interface ToggleResponse {
  serial: string;
  presente: boolean;
  cypher_log: CypherLogEntry[];
}

export interface RestoreResponse {
  restauradas: number;
  cypher_log: CypherLogEntry[];
}
