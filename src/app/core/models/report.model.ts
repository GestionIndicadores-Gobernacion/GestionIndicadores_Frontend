import { ComponentModel } from "./component.model";
import { IndicatorModel } from "./indicator.model";
import { RecordModel } from "./record.model";

export interface ReportModel {
  id: number;
  component_id?: number;
  indicator_id?: number;
  record_id?: number;

  resumen: string;
  recomendaciones?: string;

  fecha: string;
  creado_por: string;

  component?: ComponentModel;
  indicator?: IndicatorModel;
  record?: RecordModel;
}

export interface ReportCreateRequest {
  component_id?: number;
  indicator_id?: number;
  record_id?: number;

  resumen: string;
  recomendaciones?: string;

  fecha?: string;        // backend puede asignarla
  creado_por: string;
}

export interface ReportUpdateRequest {
  id: number;

  component_id?: number;
  indicator_id?: number;
  record_id?: number;

  resumen?: string;
  recomendaciones?: string;
}

export interface ReportResponse extends ReportModel {}

