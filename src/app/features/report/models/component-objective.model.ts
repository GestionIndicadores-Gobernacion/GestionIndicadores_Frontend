export interface ComponentObjectiveModel {
  id: number;

  component_id: number;
  objective_name: string;

  created_at: string;
  updated_at: string;
}

/* ===== Requests ===== */

export interface ComponentObjectiveCreateRequest {
  component_id: number;
  objective_name: string;
}

export interface ComponentObjectiveUpdateRequest {
  objective_name?: string;
}

/* ===== Response ===== */

export interface ComponentObjectiveResponse extends ComponentObjectiveModel {}
