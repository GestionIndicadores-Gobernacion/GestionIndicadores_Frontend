// core/models/indicator.model.ts

export interface IndicatorModel {
  id: number;
  component_id: number;

  name: string;
  description?: string | null;

  // Tipos válidos según backend
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';

  active: boolean;

  created_at?: string;
  updated_at?: string;
}


// Para crear
export interface IndicatorCreateRequest {
  component_id: number;
  name: string;
  description?: string | null;
  data_type: 'string' | 'integer' | 'boolean' | 'date' | 'float';
  active?: boolean;
}


// Para actualizar (si lo usas)
export interface IndicatorUpdateRequest extends IndicatorCreateRequest {
  id: number;
}
