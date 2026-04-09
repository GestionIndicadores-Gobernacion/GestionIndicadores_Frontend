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
  generates_report?: boolean;
  linked_report_id?: number | null;
  linked_report_evidence?: string | null;
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
  responsible_user_id?: number | null;
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
  responsible_user_id?: number | null;
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
  generates_report?: boolean;
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

export interface ActivityReportPrefill {
  activity_id: number;
  activity_name: string;
  generates_report: boolean;
  prefill: {
    strategy_id: number;
    component_id: number;
    evidence_link: string | null;
  };
  linked_report: any | null;           // ReportModel si ya existe
  report_by_evidence_link: {
    id: number;
    created_at: string;
  } | null;
}