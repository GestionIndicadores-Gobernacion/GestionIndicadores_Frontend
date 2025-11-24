// src/app/app/core/models/indicator.model.ts
export type IndicatorDataType =
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'text'
  | 'date'
  | 'category';

export interface IndicatorModel {
  id: number;
  component_id: number;
  name: string;
  description?: string | null;
  data_type: IndicatorDataType;
  required: boolean;
  use_list: boolean;
  allowed_values?: string[] | null;
  active: boolean;
}

export interface IndicatorCreateRequest {
  component_id: number;
  name: string;
  description?: string | null;
  data_type: IndicatorDataType;
  required: boolean;
  use_list: boolean;
  allowed_values?: string[];  // lista de strings
  active: boolean;
}

export interface IndicatorUpdateRequest extends Partial<IndicatorCreateRequest> {
  id: number;
}
