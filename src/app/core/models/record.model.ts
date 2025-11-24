// core/models/record.model.ts

export interface RecordDetallePoblacion {
  [tipo: string]: number;
}

export interface RecordModel {
  id: number;
  component_id: number | null;
  indicator_id: number | null;
  municipio: string;
  fecha: string;                     // ISO YYYY-MM-DD
  tipo_poblacion: string[];          // Siempre lista en el frontend
  detalle_poblacion?: RecordDetallePoblacion | null;
  valor?: string | null;
  evidencia_url?: string | null;
  creado_por?: string | null;
  fecha_registro?: string;           // datetime ISO
}

// Para crear
export interface RecordCreateRequest {
  component_id: number;
  indicator_id: number;
  municipio: string;
  fecha: string;
  tipo_poblacion: string[] | string;
  detalle_poblacion?: RecordDetallePoblacion | null;
  valor?: string | null;
  evidencia_url?: string | null;
}

// Para actualizar
export interface RecordUpdateRequest extends RecordCreateRequest {
  id: number;
}

// Filtros GET /records
export interface RecordFilterParams {
  municipio?: string;
  component_id?: number;
  indicator_id?: number;
  tipo_poblacion?: string;
  fecha_from?: string;
  fecha_to?: string;
}

// DTOs stats
export interface RecordStatsMunicipio {
  municipio: string;
  total: number;
}

export interface RecordStatsMes {
  mes: string;
  total: number;
}

export interface RecordStatsTipoPoblacion {
  tipo: string;
  total: number;
}
