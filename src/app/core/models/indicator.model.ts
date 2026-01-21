export interface IndicatorModel {
  id: number;
  component_id: number;
  name: string;
  description?: string | null;
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';
  meta: number;        // ⬅️ NUEVO
  active: boolean;
  created_at?: string;
  updated_at?: string;

    // NUEVO (solo frontend)
  acumulado?: number;
}

export interface IndicatorCreateRequest {
  component_id: number;
  name: string;
  description?: string | null;
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';
  meta: number;        // ⬅️ NUEVO
  active?: boolean;
}

export interface IndicatorUpdateRequest extends IndicatorCreateRequest {
  id?: number;
}
