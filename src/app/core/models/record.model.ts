import { ComponentModel } from "./component.model";
import { IndicatorModel } from "./indicator.model";

export interface RecordModel {
  id: number;
  component_id: number | null;
  indicator_id: number | null;
  municipio: string;
  fecha: string;                    // Date como ISO string
  tipo_poblacion: string;
  detalle_poblacion?: any;          // JSON dinámico (ej: {"perros": 8})
  valor?: string;                    // puede ser string o número
  evidencia_url?: string;
  creado_por?: string;
  fecha_registro?: string;

  // Relaciones
  component?: ComponentModel;
  indicator?: IndicatorModel;
}

export interface RecordCreateRequest {
  component_id: number | null;
  indicator_id: number | null;
  municipio: string;
  fecha: string;                 // ISO string
  tipo_poblacion: string;
  detalle_poblacion?: any;
  valor?: string;
  evidencia_url?: string;
  creado_por?: string;
}

export interface RecordUpdateRequest {
  id: number;
  component_id?: number | null;
  indicator_id?: number | null;
  municipio?: string;
  fecha?: string;
  tipo_poblacion?: string;
  detalle_poblacion?: any;
  valor?: string;
  evidencia_url?: string;
}

export interface RecordResponse extends RecordModel {}
