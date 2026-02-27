/* =========================
   Personal de Apoyo
========================= */
export interface ActionPlanSupportStaffModel {
  id?: number;
  name: string;
}

/* =========================
   Actividad
========================= */
export type ActionPlanStatus = 'Pendiente' | 'En Ejecución' | 'Realizado';

export interface ActionPlanActivityModel {
  id?: number;
  plan_objective_id?: number;
  name: string;
  deliverable: string;
  delivery_date: string;           // YYYY-MM-DD
  requires_boss_assistance?: boolean;
  evidence_url?: string | null;
  description?: string | null;
  reported_at?: string | null;
  score?: number | null;
  status?: ActionPlanStatus;
  support_staff?: ActionPlanSupportStaffModel[];
}

/* =========================
   Objetivo del plan
========================= */
export interface ActionPlanObjectiveModel {
  id?: number;
  action_plan_id?: number;
  objective_id?: number | null;     // null = objetivo nuevo (solo del plan)
  objective_text?: string | null;   // texto libre si es objetivo nuevo
  activities: ActionPlanActivityModel[];
}

/* =========================
   Plan de Acción
========================= */
export interface ActionPlanModel {
  id: number;
  user_id?: number | null;        // ← NUEVO
  strategy_id: number;
  component_id: number;
  responsible?: string | null;
  total_score: number;            // ← NUEVO
  plan_objectives: ActionPlanObjectiveModel[];
  created_at: string;
  updated_at: string;
}
/* =========================
   Requests
========================= */
export interface ActionPlanCreateRequest {
  strategy_id:     number;
  component_id:    number;
  responsible?:    string | null;
  plan_objectives: ActionPlanObjectiveModel[];
}

export interface ActionPlanReportRequest {
  evidence_url: string;
  description?: string | null;
}

/* =========================
   Filtros
========================= */
export interface ActionPlanFilters {
  strategy_id?:  number;
  component_id?: number;
  month?:        number;
  year?:         number;
}