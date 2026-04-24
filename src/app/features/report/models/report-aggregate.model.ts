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
