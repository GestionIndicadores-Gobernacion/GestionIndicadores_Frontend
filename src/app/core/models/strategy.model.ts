/* ===== Submodelos ===== */

export interface StrategyAnnualGoal {
  year_number: number;
  value: number;
  calendar_year?: number; // ← nuevo: viene del backend (ej: 2024, 2025...)
}

export interface StrategyMetric {
  id?: number;
  description: string;
  metric_type: 'report_count' | 'report_sum' | 'report_sum_nested' | 'dataset_sum' | 'dataset_count' | 'manual';
  component_id?: number | null;
  field_name?: string | null;
  dataset_id?: number | null;
  manual_value?: number | null;
  year?: number | null;   // ← nuevo
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

  progress?: StrategyProgress;

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

export interface StrategyResponse extends StrategyModel { }