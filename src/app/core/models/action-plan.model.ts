/* =========================
   Personal de Apoyo
========================= */
export interface ActionPlanSupportStaffModel {
  id?: number;
  name: string;
}

/* =========================
   Recurrencia
========================= */
export type RecurrenceFrequency = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly' | 'custom';

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  until: string;           // YYYY-MM-DD
  day_of_month?: number | null;    // para monthly
  day_of_week?: number | null;    // 0=lun..6=dom
  interval?: number | null;    // para custom (cada N días)
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
  delivery_date: string;
  lugar?: string | null;
  requires_boss_assistance?: boolean;
  evidence_url?: string | null;
  description?: string | null;
  reported_at?: string | null;
  score?: number | null;
  status?: ActionPlanStatus;
  support_staff?: ActionPlanSupportStaffModel[];
  recurrence_group_id?: string | null;
  recurrence_rule?: RecurrenceRule | null;
  recurrence?: RecurrenceRule | null;  // solo al crear/editar
}

/* =========================
   Objetivo del plan
========================= */
export interface ActionPlanObjectiveModel {
  id?: number;
  action_plan_id?: number;
  objective_id?: number | null;
  objective_text?: string | null;
  activities: ActionPlanActivityModel[];
}

/* =========================
   Plan de Acción
========================= */
export interface ActionPlanModel {
  id: number;
  user_id?: number | null;
  strategy_id: number;
  component_id: number;
  responsible?: string | null;
  total_score: number;
  plan_objectives: ActionPlanObjectiveModel[];
  created_at: string;
  updated_at: string;
}

/* =========================
   Requests
========================= */
export interface ActionPlanCreateRequest {
  strategy_id: number;
  component_id: number;
  responsible?: string | null;
  plan_objectives: ActionPlanObjectiveModel[];
}

export interface ActionPlanReportRequest {
  evidence_url: string;
  description?: string | null;
}

export interface ActionPlanActivityEditRequest {
  name: string;
  deliverable: string;
  delivery_date?: string | null;
  lugar?: string | null;  
  requires_boss_assistance?: boolean;
  support_staff?: ActionPlanSupportStaffModel[];
  edit_all?: boolean;
}

/* =========================
   Filtros
========================= */
export interface ActionPlanFilters {
  strategy_id?: number;
  component_id?: number;
  month?: number;
  year?: number;
}