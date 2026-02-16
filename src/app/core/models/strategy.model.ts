/* ===== Submodelo ===== */

export interface StrategyAnnualGoal {
  year_number: number;
  value: number;
}

/* ===== Modelo principal ===== */

export interface StrategyModel {
  id: number;

  name: string;
  objective: string;
  product_goal_description: string;

  annual_goals: StrategyAnnualGoal[];

  total_goal: number; // viene calculado del backend

  created_at: string;
  updated_at: string;
}

/* ===== Requests ===== */

export interface StrategyCreateRequest {
  name: string;
  objective: string;
  product_goal_description: string;

  annual_goals: StrategyAnnualGoal[];
}

export interface StrategyUpdateRequest {
  name?: string;
  objective?: string;
  product_goal_description?: string;

  annual_goals?: StrategyAnnualGoal[];
}

/* ===== Response ===== */

export interface StrategyResponse extends StrategyModel {}
