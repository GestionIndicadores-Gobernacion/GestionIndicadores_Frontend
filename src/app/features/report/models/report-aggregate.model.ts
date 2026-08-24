// =======================================================
// AGGREGATE MODELS – aligned with ReportHandler responses
// =======================================================

export interface AggregateByMonth {
  month: string;   // "YYYY-MM"
  total: number;
  urbana: number;
  rural: number;
}

export interface AggregateByComponent {
  component_id: number;
  component_name: string;
  total: number;
}

export interface IndicatorSummary {
  indicator_id: number;
  indicator_name: string;
  field_type: string;
  total: number;
  average: number;
  report_count: number;
}

// /aggregate/strategy/:id
export interface StrategyAggregate {
  strategy_id: number;
  total_reports: number;
  by_zone: { Urbana: number; Rural: number };
  by_component: AggregateByComponent[];
  by_month: AggregateByMonth[];
}

// /aggregate/component/:id
export interface ComponentAggregate {
  component_id: number;
  total_reports: number;
  by_zone: { Urbana: number; Rural: number };
  by_month: AggregateByMonth[];
  indicator_summary: IndicatorSummary[];
}

// ── Nuevo endpoint: /aggregate/component/:id/indicators ──

export interface IndicatorByMonth {
  month: string;   // "YYYY-MM"
  total: number;
}

export interface IndicatorByCategory {
  category: string;
  total: number;
}

export interface IndicatorByNestedEntry {
  metric: string;
  total: number;
}

export interface IndicatorByLocation {
  location: string;
  total: number;
}

export interface IndicatorByLocationStackedSegment {
  metric: string;
  label: string;
  total: number;
  color?: string;
}

export interface IndicatorByLocationStacked {
  location: string;
  segments: IndicatorByLocationStackedSegment[];
}

export interface IndicatorDetail {
  indicator_id: number;
  indicator_name: string;
  field_type: string;
  by_month?: IndicatorByMonth[];
  by_category?: IndicatorByCategory[];
  by_nested?: Record<string, IndicatorByNestedEntry[]>;
  by_location?: IndicatorByLocation[];
  by_location_stacked?: IndicatorByLocationStacked[];
  indicator_name_short?: string;
  navigable?: boolean;  // ← si false o ausente, el click en el chart no navega
}


export interface LocationIndicatorEntry {
  location: string;
  indicators: { indicator_id: number; total: number }[];
}

export interface ComponentIndicatorsAggregate {
  component_id: number;
  indicators: IndicatorDetail[];
  by_location: IndicatorByLocation[];
  by_location_indicator: LocationIndicatorEntry[];
  by_location_nested?: LocationNested[];
}

export interface LocationNestedMetric {
  metric: string;
  total: number;
}

export interface LocationNestedIndicator {
  indicator_id: number;
  metrics: LocationNestedMetric[];
}

export interface LocationNested {
  location: string;
  indicators: LocationNestedIndicator[];
}

// ── Consolidado municipio × año ──────────────────────────────────────
// GET /reports/aggregate/component/:id/location-year
//
// Los años son dinámicos: `years` viene de las fechas de los reportes
// realmente registrados para el componente. Las claves de `by_year` son
// esos mismos años en string (claves JSON).

export interface LocationYearBreakdownKey {
  key: string;
  total: number;
}

export interface LocationYearRow {
  location: string;
  by_year: Record<string, number>;
  total: number;
  /** Desglose (métrica o categoría, según field_type) por año. */
  breakdown_by_year: Record<string, Record<string, number>>;
  breakdown_total: Record<string, number>;
}

export interface LocationYearReportRow {
  location: string;
  by_year: Record<string, number>;
  total: number;
}

export interface LocationYearIndicator {
  indicator_id: number;
  indicator_name: string;
  field_type: string;
  rows: LocationYearRow[];
  totals_by_year: Record<string, number>;
  grand_total: number;
  breakdown_keys: LocationYearBreakdownKey[];
}

export interface LocationYearConsolidated {
  component_id: number;
  component_name: string;
  strategy_id: number;
  strategy_name: string | null;
  years: number[];
  total_reports: number;
  reports_by_location: LocationYearReportRow[];
  reports_totals_by_year: Record<string, number>;
  indicators: LocationYearIndicator[];
}
