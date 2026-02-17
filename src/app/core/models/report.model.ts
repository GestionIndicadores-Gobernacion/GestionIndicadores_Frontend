// =======================================================
// 📌 REPORT MODEL – ALIGNED WITH BACKEND (UPDATED)
// =======================================================

export type ZoneType = 'Urbana' | 'Rural';

// =======================================================
// 📊 INDICATOR METADATA (viene del backend en modo lectura)
// =======================================================

export interface IndicatorMeta {
  id: number;
  name: string;
  field_type: string;
  is_required: boolean;
  config?: Record<string, any> | null;
  targets?: { year: number; target_value: number }[];
}

// =======================================================
// 📊 INDICATOR VALUE
// =======================================================

export interface ReportIndicatorValue {
  indicator_id: number;
  value: number | string | Record<string, any> | null;
  // Solo presente en respuestas del backend (GET), no en requests (POST/PUT)
  indicator?: IndicatorMeta;
}

// =======================================================
// 📌 MODELO PRINCIPAL
// =======================================================

export interface ReportModel {
  id: number;

  strategy_id: number;
  component_id: number;

  report_date: string; // ISO date (YYYY-MM-DD)

  executive_summary: string;
  activities_performed: string;

  intervention_location: string;
  zone_type: ZoneType;

  evidence_link?: string | null;

  indicator_values: ReportIndicatorValue[];

  created_at: string;
}

// =======================================================
// ✏ CREATE
// =======================================================

export interface ReportCreateRequest {
  strategy_id: number;
  component_id: number;

  report_date: string;

  executive_summary: string;
  activities_performed: string;

  intervention_location: string;
  zone_type: ZoneType;

  evidence_link?: string | null;

  indicator_values: ReportIndicatorValue[];
}

// =======================================================
// ✏ UPDATE
// =======================================================

export interface ReportUpdateRequest extends ReportCreateRequest {}