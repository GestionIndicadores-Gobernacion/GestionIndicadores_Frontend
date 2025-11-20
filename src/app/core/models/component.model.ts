import { IndicatorModel } from "./indicator.model";

export interface ComponentModel {
  id: number;
  nombre: string;
  descripcion: string;
  indicadores?: IndicatorModel[]; // opcional porque puede venir o no
}

export interface ComponentCreateRequest {
  nombre: string;
  descripcion: string;
  indicadores_ids?: number[];
}

export interface ComponentUpdateRequest {
  id: number;
  nombre?: string;
  descripcion?: string;
  indicadores_ids?: number[];
}

export interface ComponentResponse extends ComponentModel {}
