export interface ComponentModel {
  id: number;
  name: string;
  description?: string | null;
  data_type: string;
  active: boolean;
  activity_id: number;
}

export interface ComponentCreateRequest {
  name: string;
  description?: string | null;
  data_type: string;
  active?: boolean;
  activity_id: number;
}

export interface ComponentUpdateRequest {
  id: number;
  name?: string;
  description?: string | null;
  data_type?: string;
  active?: boolean;
  activity_id?: number;
}

export interface ComponentResponse extends ComponentModel {}
