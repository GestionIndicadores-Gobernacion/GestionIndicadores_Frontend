/* ===== Submodelos ===== */

export interface StrategyAnnualGoal {
  year_number: number;
  value: number;
}

export interface StrategyMetric {
  id?: number;
  description: string;
  metric_type: 'report_count' | 'report_sum' | 'report_sum_nested' | 'dataset_sum' | 'dataset_count' | 'manual';
  component_id?: number | null;
  field_name?: string | null;
  dataset_id?: number | null;
  manual_value?: number | null;
}

/* ===== Progreso ===== */

export interface StrategyProgress {
  current_year: number;
  current_year_number: number | null;
  current_year_goal: number;
  current_year_actual: number;
  percent: number;
}

/* ===== Modelo principal ===== */

export interface StrategyModel {
  id: number;

  name: string;
  objective: string;
  product_goal_description: string;

  start_year?: number;

  annual_goals: StrategyAnnualGoal[];
  metrics: StrategyMetric[];

  total_goal: number;

  progress?: StrategyProgress;      // ← presente solo en /dashboard y /<id>/progress

  created_at: string;
  updated_at: string;
}

/* ===== Requests ===== */

export interface StrategyCreateRequest {
  name: string;
  objective: string;
  product_goal_description: string;
  annual_goals: StrategyAnnualGoal[];
  metrics: StrategyMetric[];
}

export interface StrategyUpdateRequest {
  name?: string;
  objective?: string;
  product_goal_description?: string;
  annual_goals?: StrategyAnnualGoal[];
  metrics?: StrategyMetric[];
}

/* ===== Response ===== */

export interface StrategyResponse extends StrategyModel { }