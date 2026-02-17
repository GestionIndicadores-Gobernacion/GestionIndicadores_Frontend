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