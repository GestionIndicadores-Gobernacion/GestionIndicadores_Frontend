/* =========================
   Base
========================= */

export interface ComponentModel {
  id: number;
  strategy_id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

/* =========================
   Política Pública
========================= */

export interface PublicPolicyModel {
  id: number;
  code: string;
  description: string;
}

/* =========================
   Relaciones
========================= */

export interface ComponentObjectiveModel {
  id?: number;
  component_id?: number;
  description: string;
}

export interface ComponentMGAActivityModel {
  id?: number;
  component_id?: number;
  name: string;
}

export interface ComponentIndicatorTargetModel {
  id?: number;
  year: number;
  target_value: number;
  created_at?: string;
}

export interface ComponentIndicatorModel {
  id?: number;
  component_id?: number;
  name: string;
  field_type: string;
  config?: any;
  is_required: boolean;
  group_name?: string | null;
  group_required?: boolean;
  targets?: ComponentIndicatorTargetModel[];
  created_at?: string;
}

/* =========================
   Response Expandida
========================= */

export interface ComponentDetailResponse extends ComponentModel {
  objectives?: ComponentObjectiveModel[];
  mga_activities?: ComponentMGAActivityModel[];
  indicators?: ComponentIndicatorModel[];
  public_policies?: PublicPolicyModel[];   // ← NUEVO
}

/* =========================
   Requests
========================= */

export interface ComponentCreateRequest {
  strategy_id: number;
  name: string;
  objectives: ComponentObjectiveModel[];
  mga_activities: ComponentMGAActivityModel[];
  indicators: ComponentIndicatorModel[];
  public_policy_ids?: number[];            // ← NUEVO
}

export interface ComponentUpdateRequest {
  strategy_id: number;
  name: string;
  objectives: ComponentObjectiveModel[];
  mga_activities: ComponentMGAActivityModel[];
  indicators: ComponentIndicatorModel[];
  public_policy_ids?: number[];            // ← NUEVO
}