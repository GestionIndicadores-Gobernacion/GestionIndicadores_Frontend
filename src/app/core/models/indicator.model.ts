export interface IndicatorModel {
  id: number;
  component_id: number;
  name: string;
  description?: string | null;
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';
  meta: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
  es_poblacional: boolean;

  // solo frontend
  acumulado?: number;
}

export interface IndicatorCreateRequest {
  component_id: number;
  name: string;
  description?: string | null;
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';
  meta: number;
  active?: boolean;

  es_poblacional?: boolean; // 🔥 NUEVO
}

export interface IndicatorUpdateRequest extends IndicatorCreateRequest {
  id?: number;
}
