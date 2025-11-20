export interface IndicatorModel {
  id: number;
  nombre: string;
  descripcion: string;
  data_type: string;     // "integer", "string", "array", etc.
  categoria?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IndicatorCreateRequest {
  nombre: string;
  descripcion: string;
  data_type: string;
  categoria?: string;
}

export interface IndicatorUpdateRequest {
  id: number;
  nombre?: string;
  descripcion?: string;
  data_type?: string;
  categoria?: string;
}

export interface IndicatorResponse extends IndicatorModel {}
